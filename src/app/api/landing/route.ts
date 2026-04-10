// Landing Page API - Fetches combined data for BOTH divisions in one request
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  try {
    // Validate db client has required models
    if (!db || !db.user || !db.tournament || !db.club) {
      console.error('[Landing API] Prisma client missing models:', {
        hasDb: !!db,
        hasUser: !!db?.user,
        hasTournament: !!db?.tournament,
        hasMatch: !!db?.match,
        hasAchievement: !!db?.achievement,
        hasSettings: !!db?.settings,
      });
      return NextResponse.json(
        { success: false, error: 'Database client not properly initialized' },
        { status: 503 }
      );
    }

    // Fetch data for both divisions in parallel
    const [
      maleUsers,
      maleTournaments,
      maleDonationsAgg,
      femaleUsers,
      femaleTournaments,
      femaleDonationsAgg,
      globalDonationAgg,
      globalSawerAgg,
      clubs,
      bannerSettings,
      recentCompletedMatches,
      liveMatches,
      recentAchievements,
    ] = await Promise.all([
      // Male users - top 10
      db.user.findMany({
        where: { gender: 'male', isAdmin: false },
        select: {
          id: true,
          name: true,
          tier: true,
          avatar: true,
          points: true,
          isMVP: true,
          mvpScore: true,
        },
        orderBy: { points: 'desc' },
        take: 10,
      }),

      // Male tournaments - latest
      db.tournament.findMany({
        where: { division: 'male', type: 'weekly' },
        select: {
          id: true,
          name: true,
          status: true,
          week: true,
          prizePool: true,
          _count: { select: { registrations: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),

      // Male donation aggregate
      db.donation.aggregate({
        where: {
          paymentStatus: 'confirmed',
          user: { gender: 'male' },
        },
        _sum: { amount: true },
      }),

      // Female users - top 10
      db.user.findMany({
        where: { gender: 'female', isAdmin: false },
        select: {
          id: true,
          name: true,
          tier: true,
          avatar: true,
          points: true,
          isMVP: true,
          mvpScore: true,
        },
        orderBy: { points: 'desc' },
        take: 10,
      }),

      // Female tournaments - latest
      db.tournament.findMany({
        where: { division: 'female', type: 'weekly' },
        select: {
          id: true,
          name: true,
          status: true,
          week: true,
          prizePool: true,
          _count: { select: { registrations: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),

      // Female donation aggregate
      db.donation.aggregate({
        where: {
          paymentStatus: 'confirmed',
          user: { gender: 'female' },
        },
        _sum: { amount: true },
      }),

      // Global donations
      db.donation.aggregate({
        where: { paymentStatus: 'confirmed' },
        _sum: { amount: true },
      }),

      // Global sawer (sawer doesn't have gender filter)
      db.sawer.aggregate({
        where: { paymentStatus: 'confirmed' },
        _sum: { amount: true },
      }),

      // Clubs with member counts and total points
      db.club.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          _count: { select: { members: true } },
          members: {
            select: { points: true },
          },
        },
      }),

      // Banner image settings
      db.settings.findMany({
        where: { key: { in: ['banner_male_url', 'banner_female_url'] } },
      }),

      // Recent completed matches - last 6
      ...(db.match ? [db.match.findMany({
        where: { status: 'completed' },
        select: {
          id: true,
          round: true,
          matchNumber: true,
          scoreA: true,
          scoreB: true,
          completedAt: true,
          bracket: true,
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
          winner: { select: { id: true, name: true } },
          mvp: { select: { id: true, name: true, avatar: true } },
          tournament: { select: { id: true, name: true, division: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 6,
      })] : [Promise.resolve([])]),

      // Live matches (status = 'live' or 'ongoing')
      ...(db.match ? [db.match.findMany({
        where: { status: { in: ['live', 'ongoing'] } },
        select: {
          id: true,
          round: true,
          matchNumber: true,
          scoreA: true,
          scoreB: true,
          bracket: true,
          scheduledAt: true,
          createdAt: true,
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
          winner: { select: { id: true, name: true } },
          mvp: { select: { id: true, name: true, avatar: true } },
          tournament: { select: { id: true, name: true, division: true } },
        },
        orderBy: { createdAt: 'desc' },
      })] : [Promise.resolve([])]),

      // Recent achievements - last 8
      ...(db.achievement ? [db.achievement.findMany({
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
          icon: true,
          earnedAt: true,
          user: { select: { id: true, name: true, avatar: true, gender: true } },
        },
        orderBy: { earnedAt: 'desc' },
        take: 8,
      })] : [Promise.resolve([])]),
    ]);

    // Total player counts
    const maleTotal = await db.user.count({ where: { gender: 'male', isAdmin: false } });
    const femaleTotal = await db.user.count({ where: { gender: 'female', isAdmin: false } });

    // Process division data
    function processDivision(
      users: typeof maleUsers,
      tournaments: typeof maleTournaments,
      donationAgg: typeof maleDonationsAgg,
      totalPlayerCount: number,
      gender: 'male' | 'female',
    ) {
      const currentTournament = tournaments.find(t => t.status !== 'completed') || tournaments[0];

      return {
        topPlayers: users.map((u, i) => ({
          id: u.id,
          rank: i + 1,
          name: u.name,
          avatar: u.avatar,
          points: u.points,
          tier: u.tier,
          isMVP: u.isMVP,
          mvpScore: u.mvpScore,
          gender,
        })),
        tournament: currentTournament ? {
          name: currentTournament.name,
          status: currentTournament.status,
          week: currentTournament.week || 0,
          prizePool: currentTournament.prizePool || 0,
          participants: currentTournament._count.registrations,
        } : null,
        totalPlayers: totalPlayerCount,
        totalDonation: donationAgg._sum.amount || 0,
      };
    }

    const maleData = processDivision(maleUsers, maleTournaments, maleDonationsAgg, maleTotal, 'male');
    const femaleData = processDivision(femaleUsers, femaleTournaments, femaleDonationsAgg, femaleTotal, 'female');

    // Process clubs - sort by totalPoints descending
    const clubsData = clubs
      .map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        logoUrl: c.logoUrl,
        memberCount: c._count.members,
        totalPoints: c.members.reduce((sum, m) => sum + m.points, 0),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Process banner settings
    const bannerMap = Object.fromEntries(bannerSettings.map(s => [s.key, s.value]));

    const responseData = {
      male: maleData,
      female: femaleData,
      totalDonation: globalDonationAgg._sum.amount || 0,
      totalSawer: globalSawerAgg._sum.amount || 0,
      clubs: clubsData,
      bannerMaleUrl: bannerMap['banner_male_url'] || null,
      bannerFemaleUrl: bannerMap['banner_female_url'] || null,
      liveMatchCount: Array.isArray(liveMatches) ? liveMatches.length : 0,
      recentMatches: Array.isArray(recentCompletedMatches) ? recentCompletedMatches.map((m: any) => ({
        id: m.id,
        round: m.round,
        matchNumber: m.matchNumber,
        teamAName: m.teamA?.name || 'TBD',
        teamBName: m.teamB?.name || 'TBD',
        scoreA: m.scoreA ?? 0,
        scoreB: m.scoreB ?? 0,
        winnerName: m.winner?.name || null,
        mvpName: m.mvp?.name || null,
        mvpAvatar: m.mvp?.avatar || null,
        division: m.tournament?.division || 'unknown',
        tournamentName: m.tournament?.name || 'Unknown',
        bracket: m.bracket,
        completedAt: m.completedAt,
      })) : [],
      liveMatches: Array.isArray(liveMatches) ? liveMatches.map((m: any) => ({
        id: m.id,
        round: m.round,
        matchNumber: m.matchNumber,
        teamAName: m.teamA?.name || 'TBD',
        teamBName: m.teamB?.name || 'TBD',
        scoreA: m.scoreA ?? 0,
        scoreB: m.scoreB ?? 0,
        winnerName: m.winner?.name || null,
        mvpName: m.mvp?.name || null,
        mvpAvatar: m.mvp?.avatar || null,
        division: m.tournament?.division || 'unknown',
        tournamentName: m.tournament?.name || 'Unknown',
        bracket: m.bracket,
        completedAt: m.scheduledAt,
      })) : [],
      recentAchievements: Array.isArray(recentAchievements) ? recentAchievements.map((a: any) => ({
        id: a.id,
        type: a.type,
        name: a.name,
        icon: a.icon || '🏆',
        userName: a.user?.name || 'Unknown',
        userAvatar: a.user?.avatar || null,
        userGender: a.user?.gender || 'male',
        earnedAt: a.earnedAt,
      })) : [],
    };

    console.log(`[Landing API] Combined data loaded (${Date.now() - startTime}ms)`);

    return NextResponse.json({
      success: true,
      data: responseData,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Landing API] Error:', error);
    console.error('[Landing API] Error stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { success: false, error: 'Failed to load landing data', debug: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
