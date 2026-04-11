import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import pusher, { tournamentChannel, globalChannel } from '@/lib/pusher';
import { checkAndAwardAchievements } from '@/lib/achievement-checker';

// Point Configuration
// Participation (approved by admin): +1 point
// Winning: +2 points
// MVP: no match bonus — MVP points only from tournament finalization
const POINTS_CONFIG = {
  participation: 1,
  win: 2,
  mvpBonus: 0,
};

// GET - Get matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');
    const matchId = searchParams.get('matchId');
    const status = searchParams.get('status');

    if (matchId) {
      const match = await db.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: {
            include: { TeamMember: { include: { user: true } } },
          },
          teamB: {
            include: { TeamMember: { include: { user: true } } },
          },
          winner: true,
          mvp: true,
        },
      });
      return NextResponse.json({ success: true, match });
    }

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'Tournament ID required' },
        { status: 400 }
      );
    }

    const where: Record<string, string | Record<string, string>> = { tournamentId };
    if (status) where.status = status;

    const matches = await db.match.findMany({
      where,
      include: {
        teamA: {
          include: { TeamMember: { include: { user: true } } },
        },
        teamB: {
          include: { TeamMember: { include: { user: true } } },
        },
        winner: true,
        mvp: true,
      },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    });

    return NextResponse.json({ success: true, matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

// PUT - Update match score & handle advancement (admin only)
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { matchId, scoreA, scoreB, mvpId, status } = body;

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    let winnerId: string | null = null;
    let autoComplete = false;
    if (scoreA !== undefined && scoreB !== undefined) {
      if (scoreA > scoreB) winnerId = match.teamAId;
      else if (scoreB > scoreA) winnerId = match.teamBId;
      if (winnerId && match.status !== 'completed') {
        autoComplete = true;
      }
    }

    const updateData: Record<string, string | number | null | Date> = {};
    if (scoreA !== undefined) updateData.scoreA = scoreA;
    if (scoreB !== undefined) updateData.scoreB = scoreB;
    if (winnerId) updateData.winnerId = winnerId;
    if (mvpId) updateData.mvpId = mvpId;
    if (status) {
      updateData.status = status;
      if (status === 'completed') updateData.completedAt = new Date();
    } else if (autoComplete) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }

    const updatedMatch = await db.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        teamA: { include: { TeamMember: { include: { user: true } } } },
        teamB: { include: { TeamMember: { include: { user: true } } } },
        winner: true,
        mvp: true,
      },
    });

    // ═══ REAL-TIME PUSHER EVENTS ═══
    const channelName = tournamentChannel(match.tournamentId);
    try {
      // Always trigger match-score on any update
      await pusher?.trigger(channelName, 'match-score', {
        matchId: updatedMatch.id,
        scoreA: updatedMatch.scoreA,
        scoreB: updatedMatch.scoreB,
        tournamentId: match.tournamentId,
        teamAName: updatedMatch.teamA?.name,
        teamBName: updatedMatch.teamB?.name,
        round: updatedMatch.round,
        matchNumber: updatedMatch.matchNumber,
        status: updatedMatch.status,
        mvpId: updatedMatch.mvpId,
      });

      // If match completed, also trigger match-result
      if (updatedMatch.status === 'completed' && updatedMatch.winnerId) {
        const winnerName = updatedMatch.winnerId === updatedMatch.teamA?.id
          ? updatedMatch.teamA?.name
          : updatedMatch.teamB?.name;
        await pusher?.trigger(channelName, 'match-result', {
          matchId: updatedMatch.id,
          winnerId: updatedMatch.winnerId,
          winnerName,
          tournamentId: match.tournamentId,
          round: updatedMatch.round,
          matchNumber: updatedMatch.matchNumber,
          scoreA: updatedMatch.scoreA,
          scoreB: updatedMatch.scoreB,
          teamAName: updatedMatch.teamA?.name,
          teamBName: updatedMatch.teamB?.name,
          mvpId: updatedMatch.mvpId,
        });

        // Also broadcast to global channel
        await pusher?.trigger(globalChannel, 'match-result', {
          matchId: updatedMatch.id,
          winnerId: updatedMatch.winnerId,
          winnerName,
          tournamentId: match.tournamentId,
          round: updatedMatch.round,
          matchNumber: updatedMatch.matchNumber,
        });
      }
    } catch (pusherErr) {
      console.error('[Pusher] Failed to trigger event:', pusherErr);
    }

    // Handle MVP update for completed matches
    if (match.status === 'completed' && mvpId && !autoComplete) {
      await awardMVPOnly(mvpId, match.mvpId);
    }

    // Handle match completion: award points + advancement
    if ((status === 'completed' || autoComplete) && winnerId) {
      await awardMatchPoints(match, winnerId, mvpId || null);
      
      // Simple winner advance for single elimination
      if (match.bracket === 'winners' || match.bracket === 'playoff') {
        await advanceWinnerInBracket(
          match.tournamentId,
          match.bracket as string,
          match.round,
          match.matchNumber,
          winnerId
        );
      }

      // Swiss advancement: when a Swiss round completes, auto-generate next round pairings
      if (match.bracket === 'swiss') {
        await handleSwissAdvancement(match.tournamentId, match.round);
      }

      // Auto-check achievements for all players (fire-and-forget)
      const winnerMembers = updatedMatch.teamA?.TeamMember ?? [];
      const loserMembers = updatedMatch.teamB?.TeamMember ?? [];
      const allMemberIds = [
        ...winnerMembers.map(m => m.userId),
        ...loserMembers.map(m => m.userId),
      ];
      // Deduplicate in case a user is somehow on both teams
      const uniqueMemberIds = [...new Set(allMemberIds)];

      if (uniqueMemberIds.length > 0) {
        console.log(
          `[Auto-Achievement] Checking achievements for ${uniqueMemberIds.length} player(s) after match ${matchId}`,
        );
        // Fire and forget — don't block the match update response
        Promise.all(
          uniqueMemberIds.map(id =>
            checkAndAwardAchievements(id).then(result => {
              if (result && result.newAchievements.length > 0) {
                console.log(
                  `[Auto-Achievement] User ${id} earned ${result.newAchievements.length} achievement(s)`,
                );
              }
            }),
          ),
        ).catch(err => {
          console.error('[Auto-Achievement] Error checking achievements:', err);
        });
      }
    }

    // ═══ NOTIFICATION: Fire-and-forget ═══
    try {
      if (updatedMatch.status === 'completed' && updatedMatch.winnerId) {
        const winnerName = updatedMatch.winnerId === updatedMatch.teamA?.id
          ? updatedMatch.teamA?.name
          : updatedMatch.teamB?.name;
        const { triggerNotification } = await import('@/lib/pusher');
        triggerNotification({
          type: 'match_result',
          title: 'Hasil Pertandingan',
          message: `${updatedMatch.teamA?.name || '?'} vs ${updatedMatch.teamB?.name || '?'}: ${updatedMatch.scoreA}-${updatedMatch.scoreB} — Winner: ${winnerName || '?'}`,
          icon: '🏆',
          data: { matchId: updatedMatch.id, tournamentId: match.tournamentId },
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.error('[Notification] Failed to create match notification:', notifErr);
    }

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update match' },
      { status: 500 }
    );
  }
}

// Simple winner advancement (single elimination / playoff)
async function advanceWinnerInBracket(
  tournamentId: string,
  bracket: string,
  currentRound: number,
  matchNumber: number,
  winnerId: string,
) {
  const matches = await db.match.findMany({
    where: { tournamentId, bracket },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const nextRound = currentRound + 1;
  const nextMatchNumber = Math.ceil(matchNumber / 2);
  const isFirstTeam = matchNumber % 2 === 1;

  const nextMatch = matches.find(
    (m) => m.round === nextRound && m.matchNumber === nextMatchNumber
  );

  if (nextMatch) {
    if (isFirstTeam && !nextMatch.teamAId) {
      await db.match.update({ where: { id: nextMatch.id }, data: { teamAId: winnerId } });
    } else if (!isFirstTeam && !nextMatch.teamBId) {
      await db.match.update({ where: { id: nextMatch.id }, data: { teamBId: winnerId } });
    }
  }
}

// Award Points on Match Completion
interface MatchWithTeams {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  tournamentId: string;
  status: string;
}

async function awardMatchPoints(
  match: MatchWithTeams,
  winnerTeamId: string,
  mvpUserId: string | null,
) {
  if (match.status === 'completed') return;

  const loserTeamId = match.teamAId === winnerTeamId ? match.teamBId : match.teamAId;

  const winnerMembers = await db.teamMember.findMany({
    where: { teamId: winnerTeamId },
    select: { userId: true },
  });

  const loserMembers = loserTeamId
    ? await db.teamMember.findMany({
        where: { teamId: loserTeamId },
        select: { userId: true },
      })
    : [];

  // Collect all participant user IDs for participation points
  // MVP is EXCLUDED from match points (participation & win) — MVP points only from tournament finalization
  const allParticipantIds = [
    ...winnerMembers.map(m => m.userId),
    ...loserMembers.map(m => m.userId),
  ].filter(id => id !== mvpUserId);

  // Win member IDs (excluding MVP)
  const winnerMemberIdsNoMvp = winnerMembers
    .map(m => m.userId)
    .filter(id => id !== mvpUserId);

  await db.$transaction(async (tx) => {
    // Award PARTICIPATION points to ALL match participants (+1) EXCEPT MVP
    for (const userId of allParticipantIds) {
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: POINTS_CONFIG.participation } },
      });
      await tx.ranking.upsert({
        where: { userId },
        create: { userId, points: POINTS_CONFIG.participation },
        update: { points: { increment: POINTS_CONFIG.participation } },
      });
    }

    // Award WIN points to winning team members (additional +2) EXCEPT MVP
    for (const userId of winnerMemberIdsNoMvp) {
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: POINTS_CONFIG.win } },
      });
      await tx.ranking.upsert({
        where: { userId },
        create: { userId, points: POINTS_CONFIG.win, wins: 1 },
        update: { points: { increment: POINTS_CONFIG.win }, wins: { increment: 1 } },
      });
    }

    // Award LOSS count to losing team members (no points, just tracking) EXCEPT MVP
    for (const member of loserMembers) {
      if (member.userId === mvpUserId) continue; // Skip MVP
      await tx.ranking.upsert({
        where: { userId: member.userId },
        create: { userId: member.userId, points: 0, losses: 1 },
        update: { losses: { increment: 1 } },
      });
    }

    // MVP: set isMVP flag only (no bonus points — MVP points only from finalization)
    if (mvpUserId && winnerMembers.some(m => m.userId === mvpUserId)) {
      await tx.user.update({
        where: { id: mvpUserId },
        data: {
          isMVP: true,
        },
      });
    }
  });
}

// ═══ SWISS SYSTEM ADVANCEMENT ═══

interface SwissTeamStanding {
  teamId: string;
  seed: number;
  wins: number;
  losses: number;
  draws: number;
  buchholz: number; // Sum of opponents' wins
}

/**
 * Compute Swiss standings from all completed matches.
 * Ranking: wins (desc) → Buchholz score (desc) → original seed (asc)
 */
async function computeSwissStandings(tournamentId: string): Promise<SwissTeamStanding[]> {
  // Get all teams in the tournament
  const teams = await db.team.findMany({
    where: { tournamentId },
    orderBy: { seed: 'asc' },
  });

  // Get all completed Swiss matches
  const completedMatches = await db.match.findMany({
    where: {
      tournamentId,
      bracket: 'swiss',
      status: 'completed',
    },
  });

  // Build a map of team results
  const standingsMap = new Map<string, SwissTeamStanding>();
  for (const team of teams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      seed: team.seed,
      wins: 0,
      losses: 0,
      draws: 0,
      buchholz: 0,
    });
  }

  // Track opponents for each team (for Buchholz calculation)
  const opponentsMap = new Map<string, Set<string>>();
  for (const team of teams) {
    opponentsMap.set(team.id, new Set());
  }

  // Process completed matches
  for (const m of completedMatches) {
    // Handle bye matches (teamBId is null)
    if (!m.teamBId) {
      // teamA gets an automatic win for a bye
      const standing = standingsMap.get(m.teamAId!);
      if (standing) standing.wins++;
      continue;
    }

    const standingA = standingsMap.get(m.teamAId!);
    const standingB = standingsMap.get(m.teamBId);
    if (!standingA || !standingB) continue;

    // Track opponents
    opponentsMap.get(m.teamAId!)?.add(m.teamBId);
    opponentsMap.get(m.teamBId)?.add(m.teamAId!);

    if (m.winnerId === m.teamAId) {
      standingA.wins++;
      standingB.losses++;
    } else if (m.winnerId === m.teamBId) {
      standingB.wins++;
      standingA.losses++;
    } else {
      // Draw
      standingA.draws++;
      standingB.draws++;
    }
  }

  // Calculate Buchholz score (sum of opponents' wins)
  for (const [teamId, opponents] of opponentsMap) {
    let buchholz = 0;
    for (const oppId of opponents) {
      const oppStanding = standingsMap.get(oppId);
      if (oppStanding) buchholz += oppStanding.wins;
    }
    const standing = standingsMap.get(teamId)!;
    standing.buchholz = buchholz;
  }

  // Sort by: wins (desc) → Buchholz (desc) → seed (asc)
  const standings = Array.from(standingsMap.values());
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return a.seed - b.seed;
  });

  return standings;
}

/**
 * Swiss pairing algorithm:
 * 1. Sort teams by: wins (desc) → Buchholz (desc) → original seed (asc)
 * 2. Group teams by win count
 * 3. For each win group, pair teams that haven't played each other
 * 4. If a team can't be paired within its group, move it to the next group
 * 5. If odd number of teams, one team gets a bye (automatic win)
 * 6. Return array of { teamAId, teamBId } pairs
 */
function pairSwissRound(
  standings: SwissTeamStanding[],
  previousMatches: Array<{ teamAId: string | null; teamBId: string | null }>,
): Array<{ teamAId: string; teamBId: string | null }> {
  // Build set of previous matchups (both directions)
  const playedPairs = new Set<string>();
  for (const m of previousMatches) {
    if (m.teamAId && m.teamBId) {
      playedPairs.add(`${m.teamAId}:${m.teamBId}`);
      playedPairs.add(`${m.teamBId}:${m.teamAId}`);
    }
  }

  // Track how many byes each team has had (to avoid giving same team multiple byes)
  const byeCount = new Map<string, number>();
  for (const m of previousMatches) {
    if (m.teamAId && !m.teamBId) {
      byeCount.set(m.teamAId, (byeCount.get(m.teamAId) || 0) + 1);
    }
  }

  // Work with a mutable copy of teams sorted by standings
  const unpaired = [...standings];
  const pairs: Array<{ teamAId: string; teamBId: string | null }> = [];

  // Group by win count for smarter pairing
  const winGroups = new Map<number, SwissTeamStanding[]>();
  for (const s of unpaired) {
    if (!winGroups.has(s.wins)) winGroups.set(s.wins, []);
    winGroups.get(s.wins)!.push(s);
  }

  // Flatten teams from win groups (highest to lowest wins)
  // Teams in the same win group should be paired together first
  const sortedWinCounts = Array.from(winGroups.keys()).sort((a, b) => b - a);

  // Use a greedy approach: iterate through teams in standings order
  // and try to pair each with the best available opponent they haven't played
  const paired = new Set<string>();

  for (const team of unpaired) {
    if (paired.has(team.teamId)) continue;

    // Try to find an opponent in the same win group first
    let foundOpponent = false;
    const sameWinGroup = winGroups.get(team.wins)?.filter(
      t => !paired.has(t.teamId) && t.teamId !== team.teamId
    ) || [];

    for (const opponent of sameWinGroup) {
      if (!playedPairs.has(`${team.teamId}:${opponent.teamId}`)) {
        pairs.push({ teamAId: team.teamId, teamBId: opponent.teamId });
        paired.add(team.teamId);
        paired.add(opponent.teamId);
        foundOpponent = true;
        break;
      }
    }

    // If no opponent in same win group, try nearby win groups
    if (!foundOpponent) {
      // Try adjacent win groups (±1 win)
      for (const winCount of sortedWinCounts) {
        if (winCount === team.wins) continue; // Already tried
        const nearbyGroup = winGroups.get(winCount)?.filter(
          t => !paired.has(t.teamId) && t.teamId !== team.teamId
        ) || [];

        for (const opponent of nearbyGroup) {
          if (!playedPairs.has(`${team.teamId}:${opponent.teamId}`)) {
            pairs.push({ teamAId: team.teamId, teamBId: opponent.teamId });
            paired.add(team.teamId);
            paired.add(opponent.teamId);
            foundOpponent = true;
            break;
          }
        }
        if (foundOpponent) break;
      }
    }

    // If still no opponent, give a bye (only if odd number of teams)
    if (!foundOpponent) {
      pairs.push({ teamAId: team.teamId, teamBId: null });
      paired.add(team.teamId);
    }
  }

  return pairs;
}

/**
 * Handle Swiss advancement after a match completes.
 * Checks if the current round is fully complete, then generates next round pairings.
 */
async function handleSwissAdvancement(tournamentId: string, completedRound: number): Promise<void> {
  try {
    // Get all Swiss matches in the current round
    const currentRoundMatches = await db.match.findMany({
      where: {
        tournamentId,
        bracket: 'swiss',
        round: completedRound,
      },
    });

    // Check if all matches in the current round are completed
    // A match with teamBId=null (bye) where teamA has no winner yet also needs to be auto-completed
    const allCompleted = currentRoundMatches.every(m => m.status === 'completed');
    if (!allCompleted) {
      console.log('[Swiss] Round', completedRound, 'not yet complete, skipping advancement');
      return;
    }

    // Get tournament to check bracket type and total rounds
    const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.bracketType !== 'swiss') return;

    // Check if there's a next round to fill
    const nextRound = completedRound + 1;
    const nextRoundMatches = await db.match.findMany({
      where: {
        tournamentId,
        bracket: 'swiss',
        round: nextRound,
      },
      orderBy: { matchNumber: 'asc' },
    });

    if (nextRoundMatches.length === 0) {
      console.log('[Swiss] No more rounds after round', completedRound, '. Tournament may be complete.');
      // Check if all Swiss rounds are done
      const allSwissMatches = await db.match.findMany({
        where: { tournamentId, bracket: 'swiss' },
      });
      const maxRound = Math.max(...allSwissMatches.map(m => m.round));
      if (completedRound >= maxRound) {
        // All Swiss rounds complete — update tournament status
        await db.tournament.update({
          where: { id: tournamentId },
          data: { status: 'completed' },
        });
        console.log('[Swiss] Tournament', tournamentId, 'completed!');

        // Notify via Pusher
        if (pusher) {
          pusher.trigger(
            [globalChannel, tournamentChannel(tournamentId)],
            'tournament-update',
            { action: 'tournament-completed', tournamentId }
          ).catch(() => {});
        }
      }
      return;
    }

    // Compute Swiss standings
    const standings = await computeSwissStandings(tournamentId);
    console.log('[Swiss] Standings after round', completedRound, ':',
      standings.map(s => `${s.teamId}(W:${s.wins} B:${s.buchholz})`).join(', '));

    // Get all previous matches for pairing constraint
    const previousMatches = await db.match.findMany({
      where: {
        tournamentId,
        bracket: 'swiss',
        round: { lte: completedRound },
      },
      select: { teamAId: true, teamBId: true },
    });

    // Generate pairings for next round
    const pairings = pairSwissRound(standings, previousMatches);
    console.log('[Swiss] Generated', pairings.length, 'pairings for round', nextRound);

    // Update next round matches with the generated pairings
    for (let i = 0; i < nextRoundMatches.length; i++) {
      const match = nextRoundMatches[i];
      const pairing = pairings[i];

      if (pairing) {
        const updateData: { teamAId: string | null; teamBId: string | null; status?: string; winnerId?: string; scoreA?: number; scoreB?: number } = {
          teamAId: pairing.teamAId,
          teamBId: pairing.teamBId,
        };

        // If it's a bye (teamBId is null), auto-complete the match
        if (!pairing.teamBId) {
          updateData.status = 'completed';
          updateData.winnerId = pairing.teamAId;
          updateData.scoreA = 1;
          updateData.scoreB = 0;
          updateData.completedAt = new Date();
        }

        await db.match.update({
          where: { id: match.id },
          data: updateData,
        });

        // If the bye match is auto-completed, award points and check for further advancement
        if (!pairing.teamBId) {
          await awardMatchPoints(
            { id: match.id, teamAId: pairing.teamAId, teamBId: null, tournamentId, status: 'pending' },
            pairing.teamAId,
            null,
          );
          // Recursively handle advancement for the auto-completed bye
          await handleSwissAdvancement(tournamentId, nextRound);
        }
      }
    }

    console.log('[Swiss] Round', nextRound, 'pairings updated successfully');

    // Notify via Pusher
    if (pusher) {
      pusher.trigger(
        [globalChannel, tournamentChannel(tournamentId)],
        'tournament-update',
        { action: 'swiss-round-paired', tournamentId, round: nextRound }
      ).catch(() => {});
    }
  } catch (error) {
    console.error('[Swiss] Error in advancement:', error);
  }
}

// Award MVP Only (for completed matches where admin adds/changes MVP)
// MVP gets no match points — only toggles isMVP flag
// MVP points only come from tournament finalization
async function awardMVPOnly(newMvpId: string, oldMvpId: string | null) {
  await db.$transaction(async (tx) => {
    if (oldMvpId && oldMvpId !== newMvpId) {
      await tx.user.update({
        where: { id: oldMvpId },
        data: {
          isMVP: false,
        },
      });
    }

    const newMvpUser = await tx.user.findUnique({ where: { id: newMvpId } });
    if (newMvpUser && !newMvpUser.isMVP) {
      await tx.user.update({
        where: { id: newMvpId },
        data: {
          isMVP: true,
        },
      });
    }
  });
}
