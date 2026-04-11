import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Public: Get season points for a specific user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const seasons = await db.playerSeason.findMany({
      where: { userId },
      orderBy: { season: 'asc' },
    });
    return NextResponse.json({ success: true, data: seasons });
  } catch (error) {
    console.error('[PlayerSeasons] Public GET error:', error);
    return NextResponse.json({ success: false, data: [] });
  }
}
