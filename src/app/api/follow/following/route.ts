import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET — List who a user follows
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const [following, total] = await Promise.all([
      db.follow.findMany({
        where: { followerId: userId },
        select: {
          following: {
            select: { id: true, name: true, avatar: true, gender: true, eloTier: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.follow.count({ where: { followerId: userId } }),
    ]);

    return NextResponse.json({
      success: true,
      following: following.map(f => f.following),
      total,
    });
  } catch (error: unknown) {
    console.error('[Follow Following]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
