import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import pusher, { globalChannel, tournamentChannel } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';
import { ensureWallet } from '@/lib/wallet-utils';
import { apiError, ErrorCodes, handlePrismaError, safeParseBody } from '@/lib/api-utils';

// ═══════════════════════════════════════════════════════════════════════
// POST /api/tournaments/finalize
// Finalize tournament (admin only) — award prizes, update rankings,
// write PlayerSeason records, credit wallets, log activity.
//
// Guards:
// - Admin auth required
// - Tournament must exist
// - Tournament must NOT already be completed (idempotency)
// - Final match must have a winner
// ═══════════════════════════════════════════════════════════════════════

// ── Validation helpers ──

function isValidTournamentId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0
}

// ── Season calculation ──
// Current season = floor(completedTournaments / 11) + 1
// But AFTER this tournament is marked completed, the count will be +1
// So we calculate: season = floor((currentCompletedCount + 1) / 11) + 1
// Actually we use the count AFTER the update since we mark completed inside the tx.
// Simpler: we compute it from the tournament.week field.
// season = floor((week - 1) / 11) + 1  (week is 1-based)
// Week 1-11 → Season 1, Week 12-22 → Season 2, etc.

function seasonFromWeek(week: number | null | undefined): number {
  const w = week || 1
  return Math.floor((w - 1) / 11) + 1
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { data: body, error: parseError } = await safeParseBody(request);
    if (parseError || !body) return parseError!;

    const { tournamentId } = body;

    // ── Input validation ──
    if (!isValidTournamentId(tournamentId)) {
      return apiError('tournamentId wajib diisi.', ErrorCodes.VALIDATION_ERROR, 400);
    }

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
      return apiError('Turnamen tidak ditemukan.', ErrorCodes.NOT_FOUND, 404);
    }

    // ── Idempotency guard: prevent double-finalize ──
    if (tournament.status === 'completed') {
      return apiError(
        'Turnamen sudah pernah difinalisasi. Tidak dapat finalize ulang.',
        ErrorCodes.ALREADY_COMPLETED,
        409
      );
    }

    // Find champion (winner of final match)
    const finalMatch = tournament.matches[0];
    if (!finalMatch || !finalMatch.winnerId) {
      return apiError(
        'Final match belum selesai. Tentukan pemenang terlebih dahulu.',
        ErrorCodes.VALIDATION_ERROR,
        400
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
    const FALLBACK_POINTS = { champion: 100, runnerUp: 70, third: 50, mvp: 30, participation: 10 };

    const calculatePointsPerMember = (prizeAmount: number, memberCount: number, fallbackKey: keyof typeof FALLBACK_POINTS): number => {
      if (prizeAmount > 0 && memberCount > 0) {
        return Math.round(prizeAmount / memberCount / 1000);
      }
      return FALLBACK_POINTS[fallbackKey];
    };

    const championMemberCount = champion?.TeamMember?.length || 0;
    const runnerUpMemberCount = runnerUp?.TeamMember?.length || 0;
    const thirdMemberCount = thirdPlace?.TeamMember?.length || 0;
    const mvpMemberCount = 1;

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
    const walletOps = await Promise.all(
      Array.from(userPointsMap.entries()).map(async ([userId, data]) => {
        const user = await db.user.findUnique({ where: { id: userId }, select: { points: true } });
        const wallet = await ensureWallet(userId, user?.points || 0);

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

    // ── Calculate season for PlayerSeason write ──
    // Season advances every 11 weeks. We use the tournament's week number
    // plus the count of previously completed tournaments to determine the season.
    const completedCount = await db.tournament.count({
      where: { status: 'completed' },
    });
    // After this tournament is completed, total completed = completedCount + 1
    // Season = floor(totalCompleted / 11) + 1 (consistent with season-leaderboard API)
    const targetSeason = Math.floor((completedCount + 1) / 11) + 1;

    // ── Execute all updates in a single atomic transaction ──
    await db.$transaction(async (tx) => {
      // 1. Update User.points (leaderboard)
      for (const [userId, data] of userPointsMap) {
        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: data.points } },
        });
      }

      // 2. Update Rankings
      for (const [userId, data] of userPointsMap) {
        // Ranking may not exist for some users (edge case) — use upsert
        await tx.ranking.upsert({
          where: { userId },
          update: {
            points: { increment: data.points },
            ...(data.wins > 0 ? { wins: { increment: data.wins } } : {}),
          },
          create: {
            userId,
            points: data.points,
            wins: data.wins,
            losses: 0,
          },
        });
      }

      // 3. MVP flag
      if (finalMatch.mvpId) {
        await tx.user.update({ where: { id: finalMatch.mvpId }, data: { isMVP: true } });
      }

      // 4. Credit wallets for tournament earnings
      for (const wo of walletOps) {
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
        await tx.wallet.update({
          where: { id: wo.walletId },
          data: {
            balance: { increment: wo.points },
            totalIn: { increment: wo.points },
          },
        });
      }

      // 5. ═══ Auto-write PlayerSeason records ═══
      // Each player who earned points gets their season points incremented
      for (const [userId, data] of userPointsMap) {
        await tx.playerSeason.upsert({
          where: {
            userId_season: { userId, season: targetSeason },
          },
          update: {
            points: { increment: data.points },
          },
          create: {
            userId,
            season: targetSeason,
            points: data.points,
          },
        });
      }

      // 6. Mark tournament as completed
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'completed' },
      });
    });

    // ── Post-transaction: Activity logs (non-critical) ──
    if (champion) {
      for (const member of champion.TeamMember) {
        try {
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
                season: targetSeason,
              }),
              userId: member.userId,
            },
          });
          // Log win_streak if 3+ consecutive wins
          if (totalWins >= 3) {
            await db.activityLog.create({
              data: {
                action: 'win_streak',
                details: JSON.stringify({
                  streak: totalWins,
                  tournamentName: tournament.name,
                  season: targetSeason,
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

    // Pusher broadcast (safe — pusher may be null if not configured)
    if (pusher) {
      pusher.trigger([globalChannel, tournamentChannel(tournamentId)], 'tournament-update', { action: 'finalized', tournamentId, division: tournament.division }).catch(() => {});
      pusher.trigger([globalChannel, tournamentChannel(tournamentId)], 'announcement', { message: 'Tournament completed!', type: 'success', tournamentId }).catch(() => {});
    }

    console.log(`[Finalize] Tournament ${tournament.name} finalized. Season ${targetSeason}. ${userPointsMap.size} players awarded.`);

    return NextResponse.json({
      success: true,
      champion: champion ? { id: champion.id, name: champion.name } : null,
      runnerUp: runnerUp ? { id: runnerUp.id, name: runnerUp.name } : null,
      thirdPlace: thirdPlace ? { id: thirdPlace.id, name: thirdPlace.name } : null,
      mvp: finalMatch.mvp ? { id: finalMatch.mvp.id, name: finalMatch.mvp.name } : null,
      pointSystem,
      season: targetSeason,
      results,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}
