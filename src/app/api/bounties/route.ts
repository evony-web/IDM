import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/bounties — List bounties with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const targetPlayerId = searchParams.get('targetPlayerId');
    const placerId = searchParams.get('placerId');
    const division = searchParams.get('division');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (targetPlayerId) where.targetPlayerId = targetPlayerId;
    if (placerId) where.placerId = placerId;
    if (division) {
      where.targetPlayer = { gender: division === 'male' ? 'male' : 'female' };
    }

    const bounties = await db.bounty.findMany({
      where,
      include: {
        placer: { select: { id: true, name: true, avatar: true, eloRating: true, eloTier: true } },
        targetPlayer: { select: { id: true, name: true, avatar: true, eloRating: true, eloTier: true, gender: true } },
        tournament: { select: { id: true, name: true, status: true } },
        claims: { select: { id: true, status: true } },
      },
      orderBy: status === 'active' ? { amount: 'desc' } : { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.bounty.count({ where });

    return NextResponse.json({
      success: true,
      bounties,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('[Bounties API] GET error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat bounty' }, { status: 500 });
  }
}

// POST /api/bounties — Place a new bounty
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { placerId, targetPlayerId, tournamentId, amount, currency = 'points', reason, expiresAt } = body;

    if (!placerId || !targetPlayerId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Validate users exist
    const [placer, target] = await Promise.all([
      db.user.findUnique({ where: { id: placerId } }),
      db.user.findUnique({ where: { id: targetPlayerId } }),
    ]);

    if (!placer) return NextResponse.json({ success: false, error: 'Pemain pemasang tidak ditemukan' }, { status: 404 });
    if (!target) return NextResponse.json({ success: false, error: 'Target pemain tidak ditemukan' }, { status: 404 });
    if (placerId === targetPlayerId) return NextResponse.json({ success: false, error: 'Tidak bisa pasang bounty diri sendiri' }, { status: 400 });

    // Deduct points if currency is "points"
    if (currency === 'points') {
      if (placer.points < amount) {
        return NextResponse.json({ success: false, error: 'Poin tidak cukup' }, { status: 400 });
      }
      await db.user.update({ where: { id: placerId }, data: { points: { decrement: amount } } });
    }

    const bounty = await db.bounty.create({
      data: {
        placerId,
        targetPlayerId,
        tournamentId: tournamentId || null,
        amount,
        currency,
        reason: reason || null,
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        placer: { select: { id: true, name: true, avatar: true, eloRating: true, eloTier: true } },
        targetPlayer: { select: { id: true, name: true, avatar: true, eloRating: true, eloTier: true } },
        tournament: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, bounty });
  } catch (error) {
    console.error('[Bounties API] POST error:', error);
    return NextResponse.json({ success: false, error: 'Gagal membuat bounty' }, { status: 500 });
  }
}
