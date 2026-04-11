import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { checkAndAwardAchievements } from '@/lib/achievement-checker';

// POST /api/achievements/check
// Admin-only. Checks all achievement conditions for a user and awards new ones.
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 },
      );
    }

    // Delegate to shared achievement checker
    const result = await checkAndAwardAchievements(userId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Achievements Check] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check achievements' },
      { status: 500 },
    );
  }
}
