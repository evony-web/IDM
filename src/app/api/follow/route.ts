import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePlayerAuth } from '@/lib/session';

// POST — Follow a user
export async function POST(req: NextRequest) {
  try {
    const auth = await requirePlayerAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { targetUserId } = body;
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
    if (targetUserId === auth.userId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

    // Check target user exists
    const target = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Check if already following
    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: auth.userId, followingId: targetUserId } },
    });
    if (existing) return NextResponse.json({ error: 'Already following' }, { status: 409 });

    // Create follow + notification in transaction
    await db.$transaction([
      db.follow.create({ data: { followerId: auth.userId, followingId: targetUserId } }),
      db.notification.create({
        data: {
          type: 'social',
          title: 'Pengikut Baru',
          message: `${auth.userName || 'Seseorang'} mulai mengikuti kamu`,
          icon: '👥',
          userId: targetUserId,
        },
      }),
    ]);

    // Count followers/following for target
    const [followerCount, followingCount] = await Promise.all([
      db.follow.count({ where: { followingId: targetUserId } }),
      db.follow.count({ where: { followerId: targetUserId } }),
    ]);

    return NextResponse.json({ success: true, isFollowing: true, followerCount, followingCount });
  } catch (error: unknown) {
    console.error('[Follow POST]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — Unfollow a user
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requirePlayerAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { targetUserId } = body;
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });

    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: auth.userId, followingId: targetUserId } },
    });
    if (!existing) return NextResponse.json({ error: 'Not following' }, { status: 404 });

    await db.follow.delete({ where: { id: existing.id } });

    const [followerCount, followingCount] = await Promise.all([
      db.follow.count({ where: { followingId: targetUserId } }),
      db.follow.count({ where: { followerId: targetUserId } }),
    ]);

    return NextResponse.json({ success: true, isFollowing: false, followerCount, followingCount });
  } catch (error: unknown) {
    console.error('[Follow DELETE]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
