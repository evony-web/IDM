import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePlayerAuth } from '@/lib/session';

// GET — Check follow status and counts
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePlayerAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = auth.user.id;

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });

    const [followRecord, followerCount, followingCount] = await Promise.all([
      db.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: targetUserId } },
        select: { id: true },
      }),
      db.follow.count({ where: { followingId: targetUserId } }),
      db.follow.count({ where: { followerId: targetUserId } }),
    ]);

    return NextResponse.json({
      success: true,
      isFollowing: !!followRecord,
      followerCount,
      followingCount,
    });
  } catch (error: unknown) {
    console.error('[Follow Status]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
