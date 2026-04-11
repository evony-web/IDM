import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '@/lib/admin-guard';
import pusher, { globalChannel, divisionChannel } from '@/lib/pusher';

// ═══ TIER WEIGHT MAP ═══
const TIER_WEIGHT: Record<string, number> = { S: 1000, A: 500, B: 200, C: 50, D: 0 };
const TIER_ORDER: string[] = ['S', 'A', 'B', 'C', 'D'];

type TeamWithMembers = {
  id: string;
  name: string;
  seed: number;
  tournamentId: string;
  TeamMember: Array<{ userId: string; role: string; user: { id: string; name: string; points: number; tier: string } }>;
};

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

/**
 * Calculate a team's combined strength score from all members.
 * Uses tier weight + points to rank teams for seeding.
 */
function calculateTeamStrength(team: TeamWithMembers): number {
  if (!team.TeamMember || team.TeamMember.length === 0) return 0;
  return team.TeamMember.reduce((sum, member) => {
    return sum + (member.user?.points || 0) + (TIER_WEIGHT[member.user?.tier] || 0);
  }, 0);
}

/**
 * Get the primary tier of a team (highest tier among members).
 */
function getTeamTier(team: TeamWithMembers): string {
  if (!team.TeamMember || team.TeamMember.length === 0) return 'D';
  let best = 'D';
  for (const member of team.TeamMember) {
    const tier = member.user?.tier || 'D';
    if (TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(best)) {
      best = tier;
    }
  }
  return best;
}

/**
 * Fisher-Yates shuffle.
 */
function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ═══ STRATEGY: SEEDED ═══
/**
 * Standard bracket seeding: Sort by tier then points descending,
 * assign seed numbers, pair using 1vN, 2v(N-1), etc.
 *
 * Example for 8 teams:
 *   Seed 1 vs Seed 8
 *   Seed 2 vs Seed 7
 *   Seed 3 vs Seed 6
 *   Seed 4 vs Seed 5
 */
function generateSeededPairings(teams: TeamWithMembers[]): TeamWithMembers[] {
  // Sort by tier (S > A > B > C > D), then by combined strength (desc)
  const sorted = [...teams].sort((a, b) => {
    const tierA = getTeamTier(a);
    const tierB = getTeamTier(b);
    const tierDiff = TIER_ORDER.indexOf(tierA) - TIER_ORDER.indexOf(tierB);
    if (tierDiff !== 0) return tierDiff;
    return calculateTeamStrength(b) - calculateTeamStrength(a);
  });

  // Build ordered array: seed 1, seed N, seed 2, seed N-1, seed 3, seed N-2, ...
  // This creates pairings: [1,N], [2,N-1], [3,N-2], etc.
  const ordered: TeamWithMembers[] = [];
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    ordered.push(sorted[low]);
    if (low !== high) {
      ordered.push(sorted[high]);
    }
    low++;
    high--;
  }

  console.log('[AutoMatch] Seeded pairings - Top seeds:',
    sorted.slice(0, 3).map((t, i) => `Seed ${i + 1}: ${t.name} (${getTeamTier(t)}, str: ${calculateTeamStrength(t)})`).join(', ')
  );

  return ordered;
}

// ═══ STRATEGY: BALANCED ═══
/**
 * Tier-balanced matchmaking: S vs S, A vs A, B vs B.
 * If odd number in a tier, the "extra" player plays the closest higher tier.
 * Shuffles within each tier before pairing.
 */
function generateBalancedPairings(teams: TeamWithMembers[]): TeamWithMembers[] {
  // Group teams by tier
  const tierGroups: Record<string, TeamWithMembers[]> = {};
  for (const tier of TIER_ORDER) {
    tierGroups[tier] = [];
  }

  for (const team of teams) {
    const tier = getTeamTier(team);
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(team);
  }

  // Shuffle within each tier group
  for (const tier of TIER_ORDER) {
    tierGroups[tier] = shuffle(tierGroups[tier]);
  }

  const ordered: TeamWithMembers[] = [];

  // Process tiers from highest to lowest
  for (let i = 0; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    const group = tierGroups[tier];

    // If odd number, the last one will be promoted to the next higher tier
    // (but since we go top-down, the extra from a lower tier goes up)
    // Actually, since we process S first, extras go DOWN from S to A etc.
    if (group.length % 2 !== 0) {
      // Take the last one out and give to next tier down
      const extra = group.pop()!;
      if (i + 1 < TIER_ORDER.length) {
        tierGroups[TIER_ORDER[i + 1]].unshift(extra);
      } else {
        // Lowest tier with odd number, just keep it
        group.push(extra);
      }
    }

    // Pair up the remaining (even count)
    ordered.push(...group);
  }

  // The ordered array now has teams arranged so adjacent pairs are same-tier matchups
  console.log('[AutoMatch] Balanced pairings - tier distribution:',
    Object.entries(tierGroups)
      .filter(([, g]) => g.length > 0)
      .map(([tier, g]) => `${tier}: ${g.length} teams`)
      .join(', ')
  );

  return ordered;
}

// ═══ STRATEGY: RANDOM ═══
/**
 * Simple Fisher-Yates random shuffle.
 */
function generateRandomPairings(teams: TeamWithMembers[]): TeamWithMembers[] {
  console.log('[AutoMatch] Random pairings -', teams.length, 'teams shuffled');
  return shuffle(teams);
}

// ═══ ASSIGN SEEDS TO TEAMS ═══
async function assignTeamSeeds(
  tournamentId: string,
  teams: TeamWithMembers[],
  orderedTeams: TeamWithMembers[],
): Promise<void> {
  // Create a map of teamId -> seed number based on ordered position
  const seedMap = new Map<string, number>();
  for (let i = 0; i < orderedTeams.length; i++) {
    seedMap.set(orderedTeams[i].id, i + 1);
  }

  // Update all team seeds in a transaction
  const seedUpdates = teams.map(team => {
    const newSeed = seedMap.get(team.id) || 0;
    return db.team.update({
      where: { id: team.id },
      data: { seed: newSeed },
    });
  });

  await db.$transaction(seedUpdates);
  console.log('[AutoMatch] Assigned seeds to', teams.length, 'teams');
}

// ═══ GENERATE MATCHES FROM ORDERED PAIRS ═══
function generateMatchesFromPairs(
  orderedTeams: TeamWithMembers[],
  tournamentId: string,
  bracketType: string,
): MatchData[] {
  const allMatchData: MatchData[] = [];
  const numTeams = orderedTeams.length;
  const rounds = Math.ceil(Math.log2(numTeams));
  const bracketSize = Math.pow(2, rounds);

  // Pad with nulls to fill bracket
  const paddedTeams: (TeamWithMembers | null)[] = [...orderedTeams];
  while (paddedTeams.length < bracketSize) {
    paddedTeams.push(null);
  }

  if (bracketType === 'single' || bracketType === 'double') {
    // Build first round from adjacent pairs in the ordered array
    // Round 1: pair 0-1, pair 2-3, pair 4-5, etc.
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

    if (bracketType === 'double') {
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
    }
  } else if (bracketType === 'group') {
    // Group stage: use the ordered pairs for round-robin within groups
    // Simple 2-group split
    const numGroups = Math.min(4, Math.max(2, Math.floor(numTeams / 3)));
    const groupSize = Math.ceil(numTeams / numGroups);
    let matchNumber = 1;

    const groups: TeamWithMembers[][] = Array.from({ length: numGroups }, () => []);
    for (let i = 0; i < orderedTeams.length; i++) {
      groups[i % numGroups].push(orderedTeams[i]);
    }

    // Round-robin within each group
    for (let g = 0; g < numGroups; g++) {
      const groupTeams = groups[g];
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          allMatchData.push({
            id: uuidv4(),
            tournamentId,
            round: g + 1,
            matchNumber: matchNumber++,
            teamAId: groupTeams[i].id,
            teamBId: groupTeams[j].id,
            status: 'pending',
            bracket: 'group',
          });
        }
      }
    }

    // Playoff bracket
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
  } else if (bracketType === 'round_robin') {
    // Full round-robin: everyone plays everyone
    let matchNumber = 1;
    for (let i = 0; i < orderedTeams.length; i++) {
      for (let j = i + 1; j < orderedTeams.length; j++) {
        allMatchData.push({
          id: uuidv4(),
          tournamentId,
          round: 1,
          matchNumber: matchNumber++,
          teamAId: orderedTeams[i].id,
          teamBId: orderedTeams[j].id,
          status: 'pending',
          bracket: 'round_robin',
        });
      }
    }
  }

  return allMatchData;
}

// ═══ POST HANDLER ═══
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tournamentId, strategy = 'random', bracketType = 'single' } = body;

    console.log('[AutoMatch] Generating pairings for tournament:', tournamentId,
      'strategy:', strategy, 'bracketType:', bracketType);

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'Tournament ID is required' },
        { status: 400 }
      );
    }

    if (!['seeded', 'balanced', 'random'].includes(strategy)) {
      return NextResponse.json(
        { success: false, error: 'Invalid strategy. Use: seeded, balanced, or random' },
        { status: 400 }
      );
    }

    if (!['single', 'double', 'group', 'round_robin'].includes(bracketType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bracketType. Use: single, double, group, or round_robin' },
        { status: 400 }
      );
    }

    // Get tournament
    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true, status: true, bracketType: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get teams with members
    const teams = await db.team.findMany({
      where: { tournamentId },
      include: {
        TeamMember: {
          include: { user: { select: { id: true, name: true, points: true, tier: true } } },
        },
      },
    }) as TeamWithMembers[];

    console.log('[AutoMatch] Found', teams.length, 'teams');

    if (teams.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Need at least 2 teams to generate pairings' },
        { status: 400 }
      );
    }

    // Generate pairings based on strategy
    let orderedTeams: TeamWithMembers[];

    switch (strategy) {
      case 'seeded':
        orderedTeams = generateSeededPairings(teams);
        break;
      case 'balanced':
        orderedTeams = generateBalancedPairings(teams);
        break;
      case 'random':
      default:
        orderedTeams = generateRandomPairings(teams);
        break;
    }

    // Assign seeds to teams
    await assignTeamSeeds(tournamentId, teams, orderedTeams);

    // Generate matches from the ordered pairs
    const allMatchData = generateMatchesFromPairs(orderedTeams, tournamentId, bracketType);

    console.log('[AutoMatch] Creating', allMatchData.length, 'matches with strategy:', strategy);

    // Execute: delete old matches, create all new matches, update tournament status
    await db.$transaction([
      db.match.deleteMany({ where: { tournamentId } }),
      db.match.createMany({ data: allMatchData }),
      db.tournament.update({
        where: { id: tournamentId },
        data: { status: 'bracket_ready', bracketType },
      }),
    ]);

    console.log('[AutoMatch] Pairings generated successfully');

    // Trigger Pusher notification for real-time bracket update
    if (pusher && tournament) {
      try {
        const divisionName = tournament.division || 'male';
        await pusher.trigger(divisionChannel(divisionName), 'tournament-update', {
          action: 'auto-match-generated',
          tournamentId,
          division: divisionName,
          strategy,
          bracketType,
          totalMatches: allMatchData.length,
          teamsSeeded: orderedTeams.length,
        });
        console.log('[AutoMatch] Pusher notification sent');
      } catch (pusherErr) {
        console.error('[AutoMatch] Pusher error:', pusherErr);
      }
    }

    return NextResponse.json({
      success: true,
      strategy,
      bracketType,
      totalMatches: allMatchData.length,
      teamsSeeded: orderedTeams.length,
      seedingPreview: orderedTeams.slice(0, 8).map((t, i) => ({
        seed: i + 1,
        name: t.name,
        tier: getTeamTier(t),
        strength: calculateTeamStrength(t),
      })),
    });
  } catch (error) {
    console.error('[AutoMatch] Error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to generate pairings';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
