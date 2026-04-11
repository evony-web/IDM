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

    // Only include users who have at least one season point record
    const playersWithSeasons = users
      .filter(u => u.seasonPoints && u.seasonPoints.length > 0)
      .map(u => {
        const totalSeasonPoints = u.seasonPoints.reduce((sum, sp) => sum + sp.points, 0);
        return {
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          gender: u.gender,
          tier: u.tier,
          isMVP: u.isMVP,
          currentPoints: u.points,
          clubName: u.club?.name || null,
          seasonPoints: u.seasonPoints,
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

    // Get current season from settings
    let currentSeason = 1;
    try {
      const currentSeasonSetting = await db.settings.findUnique({ where: { key: 'current_season' } });
      if (currentSeasonSetting) {
        const parsed = parseInt(currentSeasonSetting.value, 10);
        if (!isNaN(parsed) && parsed >= 1) currentSeason = parsed;
      }
    } catch { /* use default */ }

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
