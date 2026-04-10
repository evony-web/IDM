/**
 * Achievement checking logic — shared between /api/achievements/check and /api/matches.
 *
 * Extracted so match completion can auto-check achievements without duplicating code.
 */

import { db } from '@/lib/db';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_MAP } from '@/lib/achievements';
import pusher, { globalChannel } from '@/lib/pusher';

// ─── Return type ──────────────────────────────────────────────────────────────

export interface CheckAchievementsResult {
  newAchievements: Array<{
    type: string;
    name: string;
    description: string;
    icon: string;
  }>;
  totalAchievements: number;
  totalPossible: number;
  stats: {
    totalMatches: number;
    totalWins: number;
    maxStreak: number;
    mvpCount: number;
    points: number;
  };
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Check and award achievements for a user.
 * Can be called from the API route or automatically after match completion.
 * Returns the result or null if the user was not found.
 */
export async function checkAndAwardAchievements(
  userId: string,
): Promise<CheckAchievementsResult | null> {
  // ─── Validate user exists ──────────────────────────────────────────────
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      points: true,
      clubId: true,
    },
  });

  if (!user) {
    return null;
  }

  // ─── Fetch already-earned achievement types ────────────────────────────
  const existingAchievements = await db.achievement.findMany({
    where: { userId },
    select: { type: true },
  });
  const earnedTypes = new Set(existingAchievements.map((a) => a.type));

  // ─── Gather data needed for condition checks ───────────────────────────

  // 1. Team memberships → match participation and win/loss data
  const teamMemberships = await db.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          matchesAsTeamA: {
            where: { status: 'completed' },
            include: { tournament: { select: { id: true, status: true } } },
            orderBy: { completedAt: 'asc' },
          },
          matchesAsTeamB: {
            where: { status: 'completed' },
            include: { tournament: { select: { id: true, status: true } } },
            orderBy: { completedAt: 'asc' },
          },
        },
      },
    },
  });

  // Build ordered list of completed matches (by completedAt) with win/loss result
  interface MatchResult {
    matchId: string;
    isWin: boolean;
    completedAt: Date | null;
    tournamentId: string;
    tournamentStatus: string;
  }

  const matchResults: MatchResult[] = [];
  const seenMatchIds = new Set<string>();

  for (const membership of teamMemberships) {
    const allMatches = [
      ...membership.team.matchesAsTeamA.map((m) => ({
        ...m,
        side: 'A' as const,
      })),
      ...membership.team.matchesAsTeamB.map((m) => ({
        ...m,
        side: 'B' as const,
      })),
    ];

    for (const match of allMatches) {
      if (seenMatchIds.has(match.id)) continue;
      seenMatchIds.add(match.id);

      const isWin = match.winnerId === membership.teamId;
      matchResults.push({
        matchId: match.id,
        isWin,
        completedAt: match.completedAt,
        tournamentId: match.tournament.id,
        tournamentStatus: match.tournament.status,
      });
    }
  }

  // Sort by completedAt ascending for streak calculation
  matchResults.sort(
    (a, b) =>
      (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
  );

  // 2. Direct MVP count query
  const mvpMatches = await db.match.count({
    where: {
      mvpId: userId,
      status: 'completed',
    },
  });

  // 3. Total completed matches
  const totalMatches = matchResults.length;

  // 4. Total wins
  const totalWins = matchResults.filter((m) => m.isWin).length;

  // 5. Win streak (longest consecutive wins)
  let currentStreak = 0;
  let maxStreak = 0;
  for (const m of matchResults) {
    if (m.isWin) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // 6. Tournament results — check champion / runner_up / third_place
  const completedTournaments = await db.tournament.findMany({
    where: { status: 'completed' },
    include: {
      matches: {
        where: { bracket: 'winners', status: 'completed' },
        include: {
          teamA: { include: { TeamMember: true } },
          teamB: { include: { TeamMember: true } },
          winner: true,
        },
        orderBy: { round: 'desc' },
      },
    },
  });

  let isChampion = false;
  let isRunnerUp = false;
  let isThirdPlace = false;

  for (const tournament of completedTournaments) {
    if (tournament.matches.length === 0) continue;

    const finalMatch = tournament.matches[0]; // highest round = final
    if (!finalMatch.winnerId) continue;

    // Check champion — resolve from teamA/teamB which include TeamMember
    if (finalMatch.teamA && finalMatch.teamB) {
      const champTeam =
        finalMatch.winnerId === finalMatch.teamAId
          ? finalMatch.teamA
          : finalMatch.teamB;
      const memberIds = champTeam.TeamMember.map((m) => m.userId);
      if (memberIds.includes(userId)) isChampion = true;
    }

    // Check runner-up
    if (finalMatch.teamA && finalMatch.teamB) {
      const rupTeam =
        finalMatch.winnerId === finalMatch.teamAId
          ? finalMatch.teamB
          : finalMatch.teamA;
      const memberIds = rupTeam.TeamMember.map((m) => m.userId);
      if (memberIds.includes(userId)) isRunnerUp = true;
    }

    // Check third place: loser of the previous round match
    const previousRoundMatches = tournament.matches.filter(
      (m) => m.round === finalMatch.round - 1,
    );
    for (const match of previousRoundMatches) {
      const loser =
        match.winnerId === match.teamAId ? match.teamB : match.teamA;
      if (loser) {
        const memberIds = loser.TeamMember.map((m) => m.userId);
        if (memberIds.includes(userId) && !isChampion && !isRunnerUp) {
          isThirdPlace = true;
        }
      }
    }
  }

  // 7. Check ranking
  const ranking = await db.ranking.findUnique({
    where: { userId },
    select: { rank: true },
  });

  const isTop10 = ranking?.rank != null && ranking.rank <= 10;

  // ─── Evaluate each achievement condition ───────────────────────────────

  const newAchievementsToAward: typeof ACHIEVEMENT_DEFINITIONS = [];

  const tryAward = (type: string) => {
    if (earnedTypes.has(type)) return;
    const def = ACHIEVEMENT_MAP[type];
    if (def) {
      earnedTypes.add(type); // prevent duplicates within this run
      newAchievementsToAward.push(def);
    }
  };

  // first_win: at least 1 completed match as winner
  if (totalWins >= 1) tryAward('first_win');

  // champion: user is in winning team of a completed tournament's final match
  if (isChampion) tryAward('champion');

  // runner_up: user is in losing team of a completed tournament's final match
  if (isRunnerUp) tryAward('runner_up');

  // third_place: user is in 3rd place team of a completed tournament
  if (isThirdPlace) tryAward('third_place');

  // mvp_first: at least 1 MVP
  if (mvpMatches >= 1) tryAward('mvp_first');

  // mvp_3x: 3+ MVP awards
  if (mvpMatches >= 3) tryAward('mvp_3x');

  // mvp_5x: 5+ MVP awards
  if (mvpMatches >= 5) tryAward('mvp_5x');

  // win_streak_3: won 3 consecutive matches
  if (maxStreak >= 3) tryAward('win_streak_3');

  // win_streak_5: won 5 consecutive matches
  if (maxStreak >= 5) tryAward('win_streak_5');

  // matches_10: participated in 10+ completed matches
  if (totalMatches >= 10) tryAward('matches_10');

  // matches_25: participated in 25+ completed matches
  if (totalMatches >= 25) tryAward('matches_25');

  // points_500: user has 500+ points
  if (user.points >= 500) tryAward('points_500');

  // points_1000: user has 1000+ points
  if (user.points >= 1000) tryAward('points_1000');

  // club_member: user has a clubId set
  if (user.clubId) tryAward('club_member');

  // top_10: user has rank <= 10 in rankings
  if (isTop10) tryAward('top_10');

  // ─── Persist newly earned achievements ─────────────────────────────────
  if (newAchievementsToAward.length > 0) {
    await db.achievement.createMany({
      data: newAchievementsToAward.map((def) => ({
        userId,
        type: def.type,
        name: def.name,
        description: def.description,
        icon: def.icon,
      })),
      skipDuplicates: true,
    });

    // Trigger Pusher event for real-time notification
    if (pusher) {
      pusher
        .trigger(globalChannel, 'achievement-awarded', {
          userId,
          userName: user.name,
          achievements: newAchievementsToAward.map((a) => ({
            type: a.type,
            name: a.name,
            icon: a.icon,
            description: a.description,
          })),
        })
        .catch(() => {
          /* ignore pusher errors */
        });
    }

    console.log(
      `[Auto-Achievement] Awarded ${newAchievementsToAward.length} new achievement(s) to ${user.name}:`,
      newAchievementsToAward.map((a) => `${a.icon} ${a.name}`).join(', '),
    );
  }

  // ─── Fetch final count ─────────────────────────────────────────────────
  const totalAchievements = await db.achievement.count({
    where: { userId },
  });

  return {
    newAchievements: newAchievementsToAward.map((a) => ({
      type: a.type,
      name: a.name,
      description: a.description,
      icon: a.icon,
    })),
    totalAchievements,
    totalPossible: ACHIEVEMENT_DEFINITIONS.length,
    stats: {
      totalMatches,
      totalWins,
      maxStreak,
      mvpCount: mvpMatches,
      points: user.points,
    },
  };
}
