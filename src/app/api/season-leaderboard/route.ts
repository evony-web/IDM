import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Public: Get all players with their season points for leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get('gender'); // 'male', 'female', or null for all

    // Fetch all non-admin users with their season points
    const where: Record<string, any> = { isAdmin: false };
    if (gender) where.gender = gender;

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        avatar: true,
        gender: true,
        tier: true,
        isMVP: true,
        points: true,
        club: { select: { name: true, slug: true } },
        seasonPoints: {
          select: { season: true, points: true },
          orderBy: { season: 'asc' },
        },
      },
      orderBy: { points: 'desc' },
    });

    // Include ALL players — even those without season points yet
    const playersWithSeasons = users.map(u => {
      const totalSeasonPoints = (u.seasonPoints || []).reduce((sum, sp) => sum + sp.points, 0);
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        gender: u.gender,
        tier: u.tier,
        isMVP: u.isMVP,
        currentPoints: u.points,
        clubName: u.club?.name || null,
        seasonPoints: u.seasonPoints || [],
        totalSeasonPoints,
      };
    });

    // Sort by total season points descending
    playersWithSeasons.sort((a, b) => b.totalSeasonPoints - a.totalSeasonPoints);

    // Determine all unique season numbers across all players
    const allSeasons = new Set<number>();
    playersWithSeasons.forEach(p => {
      p.seasonPoints.forEach(sp => allSeasons.add(sp.season));
    });
    const seasons = Array.from(allSeasons).sort((a, b) => a - b);

    // Calculate current season dynamically:
    // Each season = 11 weeks/tournaments. Season advances every 11 completed tournaments.
    // Season 1 = tournaments 1-11, Season 2 = tournaments 12-22, etc.
    // currentSeason = Math.floor(completedTournaments / 11) + 1
    let currentSeason = 1;
    try {
      const completedCount = await db.tournament.count({
        where: { status: 'completed' },
      });
      currentSeason = Math.floor(completedCount / 11) + 1;
    } catch { /* use default 1 */ }

    return NextResponse.json({
      success: true,
      data: {
        players: playersWithSeasons,
        seasons,
        currentSeason,
        totalPlayers: playersWithSeasons.length,
      },
    });
  } catch (error) {
    console.error('[SeasonLeaderboard] GET error:', error);
    return NextResponse.json({ success: false, data: { players: [], seasons: [], currentSeason: 1, totalPlayers: 0 } });
  }
}
