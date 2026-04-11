import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import pusher, { globalChannel, tournamentChannel } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

type MatchData = {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  status: string;
  bracket: string;
};

// ═══ SMART SEEDING ═══
// Tier weight map for seeding: S > A > B > C > D
const TIER_WEIGHT: Record<string, number> = { S: 1000, A: 500, B: 200, C: 50, D: 0 };

/**
 * Calculate a team's combined strength score from all members.
 * Uses tier weight + points to rank teams for seeding.
 */
function calculateTeamStrength(team: typeof import('@prisma/client').Team & { TeamMember: Array<{ user: { points: number; tier: string } }> }): number {
  if (!team.TeamMember || team.TeamMember.length === 0) return 0;
  return team.TeamMember.reduce((sum, member) => {
    return sum + (member.user?.points || 0) + (TIER_WEIGHT[member.user?.tier] || 0);
  }, 0);
}

/**
 * Snake-draft seeding pattern for single/double elimination brackets.
 * Ensures top seeds are spread across different halves/quarters of the bracket.
 *
 * Example for 8 teams:  [0, 7, 3, 4, 1, 6, 2, 5]
 *   - Seed 1 (idx 0) vs Seed 8 (idx 7) in top half
 *   - Seed 4 (idx 3) vs Seed 5 (idx 4) in top half
 *   - Seed 3 (idx 2) vs Seed 6 (idx 5) in bottom half
 *   - Seed 2 (idx 1) vs Seed 7 (idx 6) in bottom half
 *
 * This means the #1 and #2 seeds can only meet in the final.
 */
function generateSnakeDraftOrder(size: number): number[] {
  if (size <= 1) return [0];

  // Standard tournament seeding: pairs from outside in
  // [1,16], [8,9], [5,12], [4,13], [6,11], [3,14], [7,10], [2,15]
  // This ensures #1 seed can only meet #2 in the final
  const order: number[] = [];
  let low = 0;
  let high = size - 1;
  let flip = false;

  while (low <= high) {
    if (low === high) {
      order.push(low);
    } else if (flip) {
      order.push(high);
      order.push(low);
    } else {
      order.push(low);
      order.push(high);
    }
    low++;
    high--;
    flip = !flip;
  }

  return order;
}

/**
 * Generate smart seedings: sort teams by strength, then use snake-draft
 * to place them in bracket positions so top teams are spread evenly.
 *
 * @param teams - All teams with member data
 * @param bracketSize - Power of 2 bracket size (e.g., 8, 16)
 * @returns Array of teams (with nulls for byes) in bracket order
 */
function generateSmartSeedings(
  teams: Array<typeof import('@prisma/client').Team & { TeamMember: Array<{ user: { points: number; tier: string } }> }>,
  bracketSize: number,
): (typeof teams[number] | null)[] {
  // Sort by combined strength descending
  const sorted = [...teams].sort((a, b) => calculateTeamStrength(b) - calculateTeamStrength(a));

  // Assign seed ranks for logging
  const seedInfo = sorted.slice(0, Math.min(5, sorted.length)).map((t, i) => ({
    seed: i + 1,
    name: t.name,
    strength: calculateTeamStrength(t),
  }));
  console.log('[Bracket] Top seeds:', seedInfo);

  // Generate snake-draft order for bracket positions
  const order = generateSnakeDraftOrder(bracketSize);

  // Place teams in bracket positions
  const bracket: (typeof sorted[number] | null)[] = new Array(bracketSize).fill(null);
  for (let i = 0; i < sorted.length && i < bracketSize; i++) {
    const bracketPosition = order[i];
    bracket[bracketPosition] = sorted[i];
  }

  return bracket;
}

/**
 * Distribute teams across groups using snake-draft to balance strength.
 * Ensures S-tier players are spread across different groups.
 */
function distributeTeamsToGroups(
  teams: Array<typeof import('@prisma/client').Team & { TeamMember: Array<{ user: { points: number; tier: string } }> }>,
  numGroups: number,
): typeof teams[][] {
  // Sort by strength descending
  const sorted = [...teams].sort((a, b) => calculateTeamStrength(b) - calculateTeamStrength(a));

  // Snake-draft into groups: 1st to grp1, 2nd to grp2, 3rd to grp3, 4th to grp4, 5th to grp4, 6th to grp3, ...
  const groups: typeof teams[][] = Array.from({ length: numGroups }, () => []);

  for (let i = 0; i < sorted.length; i++) {
    let groupIndex: number;
    if (Math.floor(i / numGroups) % 2 === 0) {
      // Forward pass
      groupIndex = i % numGroups;
    } else {
      // Reverse pass (snake)
      groupIndex = numGroups - 1 - (i % numGroups);
    }
    groups[groupIndex].push(sorted[i]);
  }

  return groups;
}

// ═══ TIER ORDER for seeding ═══
const TIER_ORDER_BRACKET: string[] = ['S', 'A', 'B', 'C', 'D'];

/**
 * Get the primary tier of a team (highest tier among members).
 */
function getTeamTierBracket(team: typeof import('@prisma/client').Team & { TeamMember: Array<{ user: { points: number; tier: string } }> }): string {
  if (!team.TeamMember || team.TeamMember.length === 0) return 'D';
  let best = 'D';
  for (const member of team.TeamMember) {
    const tier = member.user?.tier || 'D';
    if (TIER_ORDER_BRACKET.indexOf(tier) < TIER_ORDER_BRACKET.indexOf(best)) {
      best = tier;
    }
  }
  return best;
}

/**
 * Balanced pairing: group teams by tier, pair same-tier against each other.
 * If odd in a tier, the extra goes to the next lower tier.
 */
function generateBalancedOrder(
  teams: Array<typeof import('@prisma/client').Team & { TeamMember: Array<{ user: { points: number; tier: string } }> }>,
): typeof teams {
  const tierGroups: Record<string, typeof teams> = {};
  for (const tier of TIER_ORDER_BRACKET) {
    tierGroups[tier] = [];
  }

  for (const team of teams) {
    const tier = getTeamTierBracket(team);
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(team);
  }

  // Shuffle within each tier
  for (const tier of TIER_ORDER_BRACKET) {
    const arr = tierGroups[tier];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  const ordered: typeof teams = [];

  // Process tiers from highest to lowest
  for (let i = 0; i < TIER_ORDER_BRACKET.length; i++) {
    const tier = TIER_ORDER_BRACKET[i];
    const group = tierGroups[tier];

    if (group.length % 2 !== 0) {
      const extra = group.pop()!;
      if (i + 1 < TIER_ORDER_BRACKET.length) {
        tierGroups[TIER_ORDER_BRACKET[i + 1]].unshift(extra);
      } else {
        group.push(extra);
      }
    }
    ordered.push(...group);
  }

  return ordered;
}

// POST - Generate tournament bracket (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tournamentId, bracketType, strategy } = body;

    console.log('[Bracket] Generating bracket for tournament:', tournamentId, 'type:', bracketType, 'strategy:', strategy || 'default');

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'Tournament ID is required' },
        { status: 400 }
      );
    }

    if (!bracketType) {
      return NextResponse.json(
        { success: false, error: 'Bracket type is required' },
        { status: 400 }
      );
    }

    // Get teams
    const teams = await db.team.findMany({
      where: { tournamentId },
      include: {
        TeamMember: {
          include: { user: true },
        },
      },
      orderBy: { seed: 'asc' },
    });

    console.log('[Bracket] Found teams:', teams.length);

    if (teams.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Need at least 2 teams to generate bracket' },
        { status: 400 }
      );
    }

    const numTeams = teams.length;
    const rounds = Math.ceil(Math.log2(numTeams));
    const bracketSize = Math.pow(2, rounds);

    // ═══ SMART SEEDING ═══
    // Use snake-draft seeding for single/double elimination to spread top teams.
    // Group stage uses a separate distribution function.
    const useSmartSeeding = (bracketType === 'single' || bracketType === 'double');

    // Determine strategy behavior
    // - No strategy or undefined → existing behavior (smart seeding for elim, random for group/rr)
    // - 'random' → force Fisher-Yates for all types
    // - 'seeded' → force smart seeding (snake-draft) for all types
    // - 'balanced' → force tier-balanced pairing for all types
    const activeStrategy = strategy || (useSmartSeeding ? 'seeded' : 'random');

    let paddedTeams: (typeof teams[number] | null)[];
    let shuffledTeams: typeof teams;

    const shuffleTeams = <T>(arr: T[]): T[] => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    if (activeStrategy === 'seeded' || (activeStrategy === undefined && useSmartSeeding)) {
      // Smart seeding: sort by strength, snake-draft into bracket positions
      console.log('[Bracket] Using seeded strategy for', bracketType, 'bracket');
      paddedTeams = generateSmartSeedings(teams, bracketSize);
      shuffledTeams = teams;
    } else if (activeStrategy === 'balanced') {
      // Balanced: pair same-tier teams against each other
      console.log('[Bracket] Using balanced strategy for', bracketType, 'bracket');
      const balancedOrder = generateBalancedOrder(teams);
      if (useSmartSeeding) {
        // For elimination brackets, use balanced order but pad for bracket
        paddedTeams = [...balancedOrder];
        while (paddedTeams.length < bracketSize) {
          paddedTeams.push(null);
        }
        shuffledTeams = balancedOrder;
      } else {
        shuffledTeams = balancedOrder;
        paddedTeams = [...balancedOrder];
        while (paddedTeams.length < bracketSize) {
          paddedTeams.push(null);
        }
      }
    } else {
      // Random shuffle
      console.log('[Bracket] Using random strategy for', bracketType, 'bracket');
      shuffledTeams = shuffleTeams(teams);
      paddedTeams = [...shuffledTeams];
      while (paddedTeams.length < bracketSize) {
        paddedTeams.push(null);
      }
    }

    // Build all match data upfront (no DB calls yet)
    const allMatchData: MatchData[] = [];

    if (bracketType === 'single') {
      for (let round = 1; round <= rounds; round++) {
        const matchesInRound = bracketSize / Math.pow(2, round);
        for (let i = 0; i < matchesInRound; i++) {
          const teamA = round === 1 ? paddedTeams[i * 2] : null;
          const teamB = round === 1 ? paddedTeams[i * 2 + 1] : null;
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round,
            matchNumber: i + 1,
            teamAId: teamA?.id || null,
            teamBId: teamB?.id || null,
            status: 'pending',
            bracket: 'winners',
          });
        }
      }

    } else if (bracketType === 'double') {
      // Winners Bracket
      for (let r = 1; r <= rounds; r++) {
        const matchesInRound = bracketSize / Math.pow(2, r);
        for (let i = 0; i < matchesInRound; i++) {
          const teamA = r === 1 ? paddedTeams[i * 2] : null;
          const teamB = r === 1 ? paddedTeams[i * 2 + 1] : null;
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round: r,
            matchNumber: i + 1,
            teamAId: teamA?.id || null,
            teamBId: teamB?.id || null,
            status: 'pending',
            bracket: 'winners',
          });
        }
      }

      // Losers Bracket
      const lbRounds = 2 * rounds - 2;
      for (let l = 1; l <= lbRounds; l++) {
        const k = Math.floor((l + 1) / 2);
        const matchesInRound = bracketSize / Math.pow(2, k + 1);
        for (let i = 0; i < matchesInRound; i++) {
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round: l,
            matchNumber: i + 1,
            teamAId: null,
            teamBId: null,
            status: 'pending',
            bracket: 'losers',
          });
        }
      }

      // Grand Final
      allMatchData.push({
        id: uuidv4(),
        tournamentId,
        round: 1,
        matchNumber: 1,
        teamAId: null,
        teamBId: null,
        status: 'pending',
        bracket: 'grand_final',
      });

    } else if (bracketType === 'group') {
      // Group Stage + Playoff dengan Wildcard Play-in untuk jumlah tim ganjil
      
      let matchNumber = 1;
      let hasWildcard = false;
      let wildcardMatchId: string | null = null;
      
      // Untuk group stage, acak tim TAPI pertahankan bottom 2 untuk wildcard berdasarkan seed
      // Jadi kita ambil bottom 2 dari teams asli (ordered by seed), sisanya dari shuffledTeams
      
      // Jika jumlah tim ganjil, buat wildcard play-in
      if (numTeams % 2 !== 0) {
        hasWildcard = true;
        
        // Wildcard match: 2 tim terlemah (seed terakhir dari teams ordered by seed)
        const wildcardTeamA = teams[teams.length - 2]; // Seed kedua terakhir
        const wildcardTeamB = teams[teams.length - 1]; // Seed terakhir
        
        // Buat wildcard match
        wildcardMatchId = uuidv4();
        allMatchData.push({
          id: wildcardMatchId,
          tournamentId,
          round: 0, // Round 0 = Wildcard
          matchNumber: 0,
          teamAId: wildcardTeamA.id,
          teamBId: wildcardTeamB.id,
          status: 'pending',
          bracket: 'wildcard',
        });
        
        // Setelah wildcard, jumlah tim efektif untuk group = genap
        // Kita akan assign winner wildcard ke grup terakhir
      }
      
      // Hitung jumlah tim untuk group stage
      const effectiveTeams = hasWildcard ? numTeams - 1 : numTeams;
      
      // Fungsi untuk menemukan pembagian grup yang seimbang
      const findBestGroupDistribution = (numTeams: number): { numGroups: number; groupSize: number; isValid: boolean } => {
        const idealGroupSizes = [3, 4, 2, 5];
        
        for (const size of idealGroupSizes) {
          const numGroups = Math.floor(numTeams / size);
          const remainder = numTeams % size;
          
          if (remainder === 0 && numGroups >= 2) {
            return { numGroups, groupSize: size, isValid: true };
          }
        }
        
        return { numGroups: 0, groupSize: 0, isValid: false };
      };

      const distribution = findBestGroupDistribution(effectiveTeams);
      
      if (!distribution.isValid) {
        // Fallback: Single group round-robin
        // Untuk group stage, acak tim (exclude wildcard teams jika ada)
        let teamsForGroup: typeof shuffledTeams;
        if (hasWildcard) {
          // Ambil tim dari shuffledTeams, exclude 2 tim wildcard
          const wildcardIds = new Set([teams[teams.length - 2].id, teams[teams.length - 1].id]);
          teamsForGroup = shuffledTeams.filter(t => !wildcardIds.has(t.id));
        } else {
          teamsForGroup = shuffledTeams;
        }
        
        for (let i = 0; i < teamsForGroup.length; i++) {
          for (let j = i + 1; j < teamsForGroup.length; j++) {
            allMatchData.push({
              id: uuidv4(),
              tournamentId,
              round: 1,
              matchNumber: matchNumber++,
              teamAId: teamsForGroup[i].id,
              teamBId: teamsForGroup[j].id,
              status: 'pending',
              bracket: 'group',
            });
          }
        }
        
        // Playoff: Top 4
        const playoffRounds = 2; // Semifinal + Final
        for (let round = 1; round <= playoffRounds; round++) {
          const matchesInRound = 4 / Math.pow(2, round);
          for (let i = 0; i < matchesInRound; i++) {
            allMatchData.push({
              id: uuidv4(),
              tournamentId,
              round: round + 1,
              matchNumber: i + 1,
              teamAId: null,
              teamBId: null,
              status: 'pending',
              bracket: 'playoff',
            });
          }
        }
      } else {
        const { numGroups, groupSize } = distribution;
        
        // Tim untuk group stage - use smart distribution to balance groups
        let teamsForGroup: typeof teams;
        if (hasWildcard) {
          // Exclude 2 weakest teams (by seed) for wildcard
          const wildcardIds = new Set([teams[teams.length - 2].id, teams[teams.length - 1].id]);
          teamsForGroup = teams.filter(t => !wildcardIds.has(t.id));
        } else {
          teamsForGroup = teams;
        }

        // Use smart snake-draft group distribution to balance S-tier players
        console.log('[Bracket] Using smart group distribution for', numGroups, 'groups');
        const groupDistributions = distributeTeamsToGroups(teamsForGroup, numGroups);

        // Bagi tim ke grup using smart distribution
        for (let group = 0; group < numGroups; group++) {
          const groupTeams = groupDistributions[group] || [];
          
          // Round-robin dalam grup
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              allMatchData.push({
                id: uuidv4(),
                tournamentId,
                round: group + 1,
                matchNumber: matchNumber++,
                teamAId: groupTeams[i].id,
                teamBId: groupTeams[j].id,
                status: 'pending',
                bracket: 'group',
              });
            }
          }
        }
        
        // Jika ada wildcard, tambahkan match untuk winner wildcard vs grup terakhir
        // Winner wildcard akan bertanding melawan salah satu tim di grup terakhir
        if (hasWildcard) {
          // Tambah match: Winner Wildcard akan masuk ke salah satu grup
          // Match ini akan diisi manual setelah wildcard selesai
          const lastGroupTeams = groupDistributions[numGroups - 1] || [];
          
          // Wildcard winner akan mengisi slot kosong di grup terakhir
          // Match melawan setiap tim di grup tersebut (akan di-link setelah wildcard selesai)
          for (let i = 0; i < lastGroupTeams.length; i++) {
            allMatchData.push({
              id: uuidv4(),
              tournamentId,
              round: numGroups,
              matchNumber: matchNumber++,
              teamAId: null, // Akan diisi winner wildcard
              teamBId: lastGroupTeams[i].id,
              status: 'pending',
              bracket: 'wildcard_group',
              // Note: teamAId perlu di-update setelah wildcard match selesai
            });
          }
        }

        // Playoff bracket (top 2 dari setiap grup)
        const playoffTeams = numGroups * 2;
        const playoffRounds = Math.ceil(Math.log2(Math.max(playoffTeams, 2)));
        const playoffSize = Math.pow(2, playoffRounds);
        
        for (let round = 1; round <= playoffRounds; round++) {
          const matchesInRound = playoffSize / Math.pow(2, round);
          for (let i = 0; i < matchesInRound; i++) {
            allMatchData.push({
              id: uuidv4(),
              tournamentId,
              round: round + numGroups,
              matchNumber: i + 1,
              teamAId: null,
              teamBId: null,
              status: 'pending',
              bracket: 'playoff',
            });
          }
        }
      }

    } else if (bracketType === 'round_robin') {
      // Round Robin - semua tim bertanding melawan semua tim (dengan urutan acak)
      let matchNumber = 1;
      for (let i = 0; i < shuffledTeams.length; i++) {
        for (let j = i + 1; j < shuffledTeams.length; j++) {
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round: 1,
            matchNumber: matchNumber++,
            teamAId: shuffledTeams[i].id,
            teamBId: shuffledTeams[j].id,
            status: 'pending',
            bracket: 'round_robin',
          });
        }
      }
    }

    // Execute: delete old matches, create all new matches, update tournament — all in one transaction
    console.log('[Bracket] Creating', allMatchData.length, 'matches...');
    
    await db.$transaction([
      db.match.deleteMany({ where: { tournamentId } }),
      db.match.createMany({ data: allMatchData }),
      db.tournament.update({
        where: { id: tournamentId },
        data: { status: 'bracket_ready', bracketType },
      }),
    ]);

    console.log('[Bracket] Bracket created successfully');

    // Fire Pusher event (if configured)
    if (pusher) {
      pusher.trigger(
        [globalChannel, tournamentChannel(tournamentId)],
        'tournament-update',
        { action: 'bracket-generated', tournamentId }
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      bracketType,
      totalMatches: allMatchData.length,
      matches: allMatchData,
    });
  } catch (error) {
    console.error('[Bracket] Error generating bracket:', error);
    
    // Provide more detailed error info
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to generate bracket';
    
    const errorStack = error instanceof Error 
      ? error.stack 
      : undefined;

    console.error('[Bracket] Error details:', {
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
