import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

// GET - Get season points for a user (or all users)
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const seasons = await db.playerSeason.findMany({
        where: { userId },
        orderBy: { season: 'asc' },
      });
      return NextResponse.json({ success: true, data: seasons });
    }

    // Get all season points
    const seasons = await db.playerSeason.findMany({
      orderBy: [{ season: 'asc' }, { points: 'desc' }],
      include: {
        user: {
          select: { id: true, name: true, avatar: true, gender: true, tier: true },
        },
      },
    });
    return NextResponse.json({ success: true, data: seasons });
  } catch (error) {
    console.error('[PlayerSeasons] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch season points' }, { status: 500 });
  }
}

// POST - Add or update season points for a user
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    const { userId, season, points } = body as {
      userId: string;
      season: number;
      points: number;
    };

    if (!userId || !season || points === undefined) {
      return NextResponse.json({ success: false, error: 'userId, season, and points are required' }, { status: 400 });
    }

    // Upsert: create or update
    const record = await db.playerSeason.upsert({
      where: {
        userId_season: { userId, season },
      },
      update: { points },
      create: { userId, season, points },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('[PlayerSeasons] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save season points' }, { status: 500 });
  }
}

// DELETE - Remove a season record
export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await db.playerSeason.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Season points deleted' });
  } catch (error) {
    console.error('[PlayerSeasons] DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete season points' }, { status: 500 });
  }
}
