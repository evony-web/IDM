// Combined initialization API - fetches all app data in ONE request
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division') || 'male';

    const [
      users,
      tournaments,
      donationsAgg,
      sawerAgg,
    ] = await Promise.all([
      // Users - include MVP admins in same query
      db.user.findMany({
        where: {
          gender: division,
          OR: [
            { isAdmin: false },
            { isMVP: true, isAdmin: true },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gender: true,
          tier: true,
          avatar: true,
          points: true,
          city: true,
          isMVP: true,
          mvpScore: true,
          clubId: true,
          role: true,
          isAdmin: true,
          rankings: { select: { wins: true, losses: true, points: true } },
          club: { select: { id: true, name: true, slug: true, logoUrl: true } },
          seasonPoints: { select: { season: true, points: true }, orderBy: { season: 'asc' } },
        },
        orderBy: { points: 'desc' },
        take: 100,
      }),

      // Tournaments - minimal fields
      db.tournament.findMany({
        where: { division, type: 'weekly' },
        select: {
          id: true,
          name: true,
          status: true,
          week: true,
          bracketType: true,
          prizePool: true,
          prizeChampion: true,
          prizeRunnerUp: true,
          prizeThird: true,
          prizeMvp: true,
          mode: true,
          bpm: true,
          lokasi: true,
          startDate: true,
          createdAt: true,
          _count: { select: { registrations: true, teams: true, matches: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Aggregations - lightweight
      db.donation.aggregate({
        where: { paymentStatus: 'confirmed' },
        _sum: { amount: true },
      }),

      db.sawer.aggregate({
        where: { paymentStatus: 'confirmed' },
        _sum: { amount: true },
      }),
    ]);

    // Get current tournament
    const currentTournament = tournaments.find(t => t.status !== 'completed') || tournaments[0];

    // Fetch tournament details only if needed
    let registrations: unknown[] = [];
    let teams: unknown[] = [];
    let matches: unknown[] = [];

    if (currentTournament) {
      [registrations, teams, matches] = await Promise.all([
        db.registration.findMany({
          where: { tournamentId: currentTournament.id },
          select: {
            id: true,
            userId: true,
            tournamentId: true,
            status: true,
            tierAssigned: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                gender: true,
                tier: true,
                avatar: true,
                points: true,
                city: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        db.team.findMany({
          where: { tournamentId: currentTournament.id },
          include: {
            TeamMember: {
              include: {
                user: {
                  select: { id: true, name: true, tier: true, avatar: true, points: true },
                },
              },
            },
          },
        }),
        db.match.findMany({
          where: { tournamentId: currentTournament.id },
          include: {
            teamA: {
              include: {
                TeamMember: {
                  include: {
                    user: { select: { id: true, name: true, tier: true, avatar: true, points: true } },
                  },
                },
              },
            },
            teamB: {
              include: {
                TeamMember: {
                  include: {
                    user: { select: { id: true, name: true, tier: true, avatar: true, points: true } },
                  },
                },
              },
            },
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        }),
      ]);
    }

    // Transform users - flatten rankings
    const finalUsers = users.map(u => ({
      ...u,
      wins: u.rankings?.wins ?? 0,
      losses: u.rankings?.losses ?? 0,
      rankings: undefined,
    }));

    const responseData = {
      division,
      users: finalUsers,
      tournaments,
      currentTournament: currentTournament ? {
        ...currentTournament,
        registrations,
        teams,
        matches,
      } : null,
      donations: [],
      totalDonation: donationsAgg._sum.amount || 0,
      totalSawer: sawerAgg._sum.amount || 0,
    };

    console.log(`[Init API] Fresh data for ${division} (${Date.now() - startTime}ms)`);

    return NextResponse.json({
      success: true,
      data: responseData,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[Init API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize app' },
      { status: 500 }
    );
  }
}
