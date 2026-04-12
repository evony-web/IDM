import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET — List followers of a user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const [followers, total] = await Promise.all([
      db.follow.findMany({
        where: { followingId: userId },
        select: {
          follower: {
            select: { id: true, name: true, avatar: true, gender: true, eloTier: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.follow.count({ where: { followingId: userId } }),
    ]);

    return NextResponse.json({
      success: true,
      followers: followers.map(f => f.follower),
      total,
    });
  } catch (error: unknown) {
    console.error('[Follow Followers]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
