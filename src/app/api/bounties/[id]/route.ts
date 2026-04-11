import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/bounties/[id] — Get bounty details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bounty = await db.bounty.findUnique({
      where: { id },
      include: {
        placer: { select: { id: true, name: true, avatar: true, eloRating: true, eloTier: true } },
        targetPlayer: { select: { id: true, name: true, avatar: true, eloRating: true, eloTier: true } },
        tournament: { select: { id: true, name: true, status: true } },
        claims: {
          include: {
            claimer: { select: { id: true, name: true, avatar: true, eloRating: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!bounty) {
      return NextResponse.json({ success: false, error: 'Bounty tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, bounty });
  } catch (error) {
    console.error('[Bounty Detail API] GET error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat bounty' }, { status: 500 });
  }
}

// PATCH /api/bounties/[id] — Cancel bounty
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, requesterId } = body;

    const bounty = await db.bounty.findUnique({ where: { id } });
    if (!bounty) return NextResponse.json({ success: false, error: 'Bounty tidak ditemukan' }, { status: 404 });

    if (status === 'cancelled') {
      // Only placer can cancel
      if (bounty.placerId !== requesterId) {
        return NextResponse.json({ success: false, error: 'Hanya pemasang yang bisa membatalkan' }, { status: 403 });
      }
      if (bounty.status !== 'active') {
        return NextResponse.json({ success: false, error: 'Bounty tidak bisa dibatalkan' }, { status: 400 });
      }

      // Refund points if currency is "points"
      if (bounty.currency === 'points') {
        await db.user.update({ where: { id: bounty.placerId }, data: { points: { increment: bounty.amount } } });
      }

      await db.bounty.update({ where: { id }, data: { status: 'cancelled' } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Bounty Detail API] PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Gagal update bounty' }, { status: 500 });
  }
}
