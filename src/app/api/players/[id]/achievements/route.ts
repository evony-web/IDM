import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_MAP, ACHIEVEMENT_CATEGORIES } from '@/lib/achievements';

// GET /api/players/[id]/achievements
// Returns all earned achievements for a player, plus summary stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Player ID required' },
        { status: 400 },
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 },
      );
    }

    // Fetch all earned achievements
    const earnedAchievements = await db.achievement.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });

    // Group by category for display
    const byCategory: Record<string, typeof earnedAchievements> = {};
    for (const ach of earnedAchievements) {
      const def = ACHIEVEMENT_MAP[ach.type];
      const cat = def?.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(ach);
    }

    // Build a summary of all possible achievements with earned status
    const allAchievements = ACHIEVEMENT_DEFINITIONS.map((def) => {
      const earned = earnedAchievements.find((a) => a.type === def.type);
      return {
        type: def.type,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        earned: !!earned,
        earnedAt: earned?.earnedAt?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      player: {
        id: user.id,
        name: user.name,
      },
      achievements: earnedAchievements.map((a) => ({
        id: a.id,
        type: a.type,
        name: a.name,
        description: a.description,
        icon: a.icon,
        earnedAt: a.earnedAt.toISOString(),
      })),
      byCategory,
      allAchievements,
      categories: ACHIEVEMENT_CATEGORIES,
      stats: {
        totalEarned: earnedAchievements.length,
        totalPossible: ACHIEVEMENT_DEFINITIONS.length,
        completionPercent: Math.round(
          (earnedAchievements.length / ACHIEVEMENT_DEFINITIONS.length) * 100,
        ),
      },
    });
  } catch (error) {
    console.error('[Achievements API] Error fetching player achievements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch achievements' },
      { status: 500 },
    );
  }
}
