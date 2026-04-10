import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import pusher, { tournamentChannel, globalChannel } from '@/lib/pusher';
import { checkAndAwardAchievements } from '@/lib/achievement-checker';

// Point Configuration
const POINTS_CONFIG = {
  win: 100,
  mvpBonus: 25,
  loss: 25,
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

  await db.$transaction(async (tx) => {
    // Award WIN points to winning team members
    for (const member of winnerMembers) {
      await tx.user.update({
        where: { id: member.userId },
        data: { points: { increment: POINTS_CONFIG.win } },
      });
      await tx.ranking.upsert({
        where: { userId: member.userId },
        create: { userId: member.userId, points: POINTS_CONFIG.win, wins: 1 },
        update: { points: { increment: POINTS_CONFIG.win }, wins: { increment: 1 } },
      });
    }

    // Award LOSS points to losing team members
    for (const member of loserMembers) {
      await tx.user.update({
        where: { id: member.userId },
        data: { points: { increment: POINTS_CONFIG.loss } },
      });
      await tx.ranking.upsert({
        where: { userId: member.userId },
        create: { userId: member.userId, points: POINTS_CONFIG.loss, losses: 1 },
        update: { points: { increment: POINTS_CONFIG.loss }, losses: { increment: 1 } },
      });
    }

    // Award MVP bonus
    if (mvpUserId && winnerMembers.some(m => m.userId === mvpUserId)) {
      await tx.user.update({
        where: { id: mvpUserId },
        data: {
          points: { increment: POINTS_CONFIG.mvpBonus },
          isMVP: true,
        },
      });
      await tx.ranking.upsert({
        where: { userId: mvpUserId },
        create: { userId: mvpUserId, points: POINTS_CONFIG.mvpBonus },
        update: { points: { increment: POINTS_CONFIG.mvpBonus } },
      });
    }
  });
}

// Award MVP Only (for completed matches where admin adds/changes MVP)
async function awardMVPOnly(newMvpId: string, oldMvpId: string | null) {
  await db.$transaction(async (tx) => {
    if (oldMvpId && oldMvpId !== newMvpId) {
      await tx.user.update({
        where: { id: oldMvpId },
        data: {
          isMVP: false,
          points: { decrement: POINTS_CONFIG.mvpBonus },
        },
      });
      await tx.ranking.upsert({
        where: { userId: oldMvpId },
        create: { userId: oldMvpId, points: 0 },
        update: { points: { decrement: POINTS_CONFIG.mvpBonus } },
      });
    }

    const newMvpUser = await tx.user.findUnique({ where: { id: newMvpId } });
    if (newMvpUser && !newMvpUser.isMVP) {
      await tx.user.update({
        where: { id: newMvpId },
        data: {
          isMVP: true,
          points: { increment: POINTS_CONFIG.mvpBonus },
        },
      });
      await tx.ranking.upsert({
        where: { userId: newMvpId },
        create: { userId: newMvpId, points: POINTS_CONFIG.mvpBonus },
        update: { points: { increment: POINTS_CONFIG.mvpBonus } },
      });
    }
  });
}
