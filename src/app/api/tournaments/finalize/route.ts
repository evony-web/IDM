import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import pusher, { globalChannel, tournamentChannel } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

// POST - Finalize tournament (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tournamentId } = body;

    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        matches: {
          where: { bracket: 'winners' },
          include: {
            teamA: { include: { TeamMember: true } },
            teamB: { include: { TeamMember: true } },
            winner: { include: { TeamMember: true } },
            mvp: true,
          },
          orderBy: { round: 'desc' },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Find champion (winner of final match)
    const finalMatch = tournament.matches[0];
    if (!finalMatch || !finalMatch.winnerId) {
      return NextResponse.json(
        { success: false, error: 'Final match not completed' },
        { status: 400 }
      );
    }

    const champion = finalMatch.winner;
    const runnerUp = finalMatch.winnerId === finalMatch.teamAId ? finalMatch.teamB : finalMatch.teamA;

    // Find third place (simplified - winner of previous round's losing match)
    const previousRoundMatches = tournament.matches.filter(m => m.round === finalMatch.round - 1);
    let thirdPlace = null;
    if (previousRoundMatches.length > 0) {
      for (const match of previousRoundMatches) {
        const loser = match.winnerId === match.teamAId ? match.teamB : match.teamA;
        if (loser && loser.id !== champion.id && (!runnerUp || loser.id !== runnerUp.id)) {
          thirdPlace = loser;
          break;
        }
      }
    }

    // ── Prize-based point system ──
    // Points = prize_per_team / team_members_count
    // Example: prizeChampion = 150000, team has 3 members → each member gets 50000 pts (+50)
    // Falls back to fixed points if prize pool is 0 or not set
    const FALLBACK_POINTS = { champion: 100, runnerUp: 70, third: 50, mvp: 30, participation: 10 };

    const calculatePointsPerMember = (prizeAmount: number, memberCount: number, fallbackKey: keyof typeof FALLBACK_POINTS): number => {
      if (prizeAmount > 0 && memberCount > 0) {
        // prize divided by team members, then convert to whole number points
        // e.g. 150000 / 3 = 50000 → we use 50 as points (prize / 1000 per point)
        return Math.round(prizeAmount / memberCount / 1000);
      }
      return FALLBACK_POINTS[fallbackKey];
    };

    const championMemberCount = champion?.TeamMember?.length || 0;
    const runnerUpMemberCount = runnerUp?.TeamMember?.length || 0;
    const thirdMemberCount = thirdPlace?.TeamMember?.length || 0;
    const mvpMemberCount = 1; // MVP is always 1 person

    const pointSystem = {
      champion: calculatePointsPerMember(tournament.prizeChampion, championMemberCount, 'champion'),
      runnerUp: calculatePointsPerMember(tournament.prizeRunnerUp, runnerUpMemberCount, 'runnerUp'),
      third: calculatePointsPerMember(tournament.prizeThird, thirdMemberCount, 'third'),
      mvp: calculatePointsPerMember(tournament.prizeMvp, mvpMemberCount, 'mvp'),
      participation: FALLBACK_POINTS.participation,
    };

    // Collect all unique user IDs who receive special points
    const awardedUserIds = new Set<string>();
    const results: Array<{ userId: string; points: number; role: string }> = [];

    // Build user → total points map (merge multiple roles)
    const userPointsMap = new Map<string, { points: number; wins: number; roles: string[] }>();

    const addPoints = (userId: string, pts: number, role: string, addWin: boolean) => {
      awardedUserIds.add(userId);
      const existing = userPointsMap.get(userId) || { points: 0, wins: 0, roles: [] };
      existing.points += pts;
      if (addWin) existing.wins += 1;
      existing.roles.push(role);
      userPointsMap.set(userId, existing);
    };

    // Champion members
    if (champion) {
      for (const member of champion.TeamMember) {
        addPoints(member.userId, pointSystem.champion, 'champion', true);
      }
    }

    // Runner-up members
    if (runnerUp) {
      for (const member of runnerUp.TeamMember) {
        addPoints(member.userId, pointSystem.runnerUp, 'runner-up', false);
      }
    }

    // Third place members
    if (thirdPlace) {
      for (const member of thirdPlace.TeamMember) {
        addPoints(member.userId, pointSystem.third, 'third', false);
      }
    }

    // MVP
    if (finalMatch.mvpId) {
      addPoints(finalMatch.mvpId, pointSystem.mvp, 'mvp', false);
    }

    // Get ALL matches for participation points
    const allMatches = await db.match.findMany({
      where: { tournamentId },
      include: {
        teamA: { include: { TeamMember: true } },
        teamB: { include: { TeamMember: true } },
      },
    });

    // Award participation to all unique participants not already awarded
    for (const match of allMatches) {
      if (match.teamA) {
        for (const member of match.teamA.TeamMember) {
          if (!awardedUserIds.has(member.userId)) {
            addPoints(member.userId, pointSystem.participation, 'participant', false);
          }
        }
      }
      if (match.teamB) {
        for (const member of match.teamB.TeamMember) {
          if (!awardedUserIds.has(member.userId)) {
            addPoints(member.userId, pointSystem.participation, 'participant', false);
          }
        }
      }
    }

    // Build results array
    for (const [userId, data] of userPointsMap) {
      for (const role of data.roles) {
        const pts = role === 'champion' ? pointSystem.champion
          : role === 'runner-up' ? pointSystem.runnerUp
          : role === 'third' ? pointSystem.third
          : role === 'mvp' ? pointSystem.mvp
          : pointSystem.participation;
        results.push({ userId, points: pts, role });
      }
    }

    // ── Credit wallets for tournament earnings ──
    // For each player who earned points, ensure they have a wallet and credit it
    const walletOps = await Promise.all(
      Array.from(userPointsMap.entries()).map(async ([userId, data]) => {
        // Find or create wallet
        let wallet = await db.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          // Get user's current points to set as initial balance
          const user = await db.user.findUnique({ where: { id: userId }, select: { points: true } });
          const currentPoints = user?.points || 0;
          const initialBalance = Math.max(0, currentPoints);
          wallet = await db.wallet.create({
            data: { userId, balance: initialBalance, totalIn: initialBalance, totalOut: 0 },
          });
          if (initialBalance > 0) {
            await db.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'credit',
                amount: initialBalance,
                category: 'prize',
                description: 'Sinkronisasi poin leaderboard ke wallet',
              },
            });
          }
        }

        // Create wallet transaction label for tournament earnings
        const roleLabel = data.roles.length === 1
          ? data.roles[0] === 'champion' ? 'Juara'
            : data.roles[0] === 'runner-up' ? 'Runner-up'
            : data.roles[0] === 'third' ? 'Juara 3'
            : data.roles[0] === 'mvp' ? 'MVP'
            : 'Partisipasi'
          : data.roles.map(r => r === 'champion' ? 'Juara' : r === 'runner-up' ? 'Runner-up' : r === 'third' ? 'Juara 3' : r === 'mvp' ? 'MVP' : 'Partisipasi').join(' + ');

        return {
          walletId: wallet.id,
          userId,
          points: data.points,
          roleLabel,
        };
      })
    );

    // Execute all updates in a single atomic transaction
    await db.$transaction(async (tx) => {
      // Update User.points (leaderboard)
      for (const [userId, data] of userPointsMap) {
        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: data.points } },
        });
      }

      // Update Rankings
      for (const [userId, data] of userPointsMap) {
        await tx.ranking.update({
          where: { userId },
          data: {
            points: { increment: data.points },
            ...(data.wins > 0 ? { wins: { increment: data.wins } } : {}),
          },
        });
      }

      // MVP flag
      if (finalMatch.mvpId) {
        await tx.user.update({ where: { id: finalMatch.mvpId }, data: { isMVP: true } });
      }

      // Credit wallets for tournament earnings
      for (const wo of walletOps) {
        // Create wallet transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wo.walletId,
            type: 'credit',
            amount: wo.points,
            category: 'prize',
            description: `Hadiah turnamen (${wo.roleLabel}): ${tournament.name}`,
            referenceId: tournamentId,
          },
        });
        // Update wallet balance
        await tx.wallet.update({
          where: { id: wo.walletId },
          data: {
            balance: { increment: wo.points },
            totalIn: { increment: wo.points },
          },
        });
      }

      // Mark tournament as completed
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'completed' },
      });
    });

    // Log tournament_win activity for champion members
    if (champion) {
      for (const member of champion.TeamMember) {
        try {
          // Count consecutive tournament wins for this user
          const userRanking = await db.ranking.findUnique({ where: { userId: member.userId } });
          const totalWins = userRanking?.wins || 0;
          await db.activityLog.create({
            data: {
              action: 'tournament_win',
              details: JSON.stringify({
                tournamentName: tournament.name,
                division: tournament.division,
                week: tournament.week,
                teamName: champion.name,
                totalWins,
              }),
              userId: member.userId,
            },
          });
          // Log win_streak if 3+ consecutive wins
          if (totalWins >= 3 && totalWins % 1 === 0) {
            await db.activityLog.create({
              data: {
                action: 'win_streak',
                details: JSON.stringify({
                  streak: totalWins,
                  tournamentName: tournament.name,
                }),
                userId: member.userId,
              },
            });
          }
        } catch (e) {
          console.warn('[Finalize] Failed to log tournament win activity:', e);
        }
      }
    }

    pusher.trigger([globalChannel, tournamentChannel(tournamentId)], 'tournament-update', { action: 'finalized', tournamentId, division: tournament.division }).catch(() => {});
    pusher.trigger([globalChannel, tournamentChannel(tournamentId)], 'announcement', { message: 'Tournament completed!', type: 'success', tournamentId }).catch(() => {});

    return NextResponse.json({
      success: true,
      champion: champion ? { id: champion.id, name: champion.name } : null,
      runnerUp: runnerUp ? { id: runnerUp.id, name: runnerUp.name } : null,
      thirdPlace: thirdPlace ? { id: thirdPlace.id, name: thirdPlace.name } : null,
      mvp: finalMatch.mvp ? { id: finalMatch.mvp.id, name: finalMatch.mvp.name } : null,
      pointSystem,
      results,
    });
  } catch (error) {
    console.error('Error finalizing tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to finalize tournament' },
      { status: 500 }
    );
  }
}
