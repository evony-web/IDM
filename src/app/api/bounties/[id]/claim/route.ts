import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/bounties/[id]/claim — Submit a bounty claim
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { claimerId, matchId, proof } = body;

    if (!claimerId) {
      return NextResponse.json({ success: false, error: 'claimerId diperlukan' }, { status: 400 });
    }

    const bounty = await db.bounty.findUnique({ where: { id } });
    if (!bounty) return NextResponse.json({ success: false, error: 'Bounty tidak ditemukan' }, { status: 404 });

    if (bounty.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Bounty tidak aktif' }, { status: 400 });
    }
    if (bounty.placerId === claimerId) {
      return NextResponse.json({ success: false, error: 'Pemasang tidak bisa klaim bounty sendiri' }, { status: 400 });
    }
    if (bounty.targetPlayerId === claimerId) {
      return NextResponse.json({ success: false, error: 'Target tidak bisa klaim bounty sendiri' }, { status: 400 });
    }

    // Check if claimer already claimed this bounty
    const existingClaim = await db.bountyClaim.findFirst({
      where: { bountyId: id, claimerId },
    });
    if (existingClaim) {
      return NextResponse.json({ success: false, error: 'Anda sudah mengajukan klaim untuk bounty ini' }, { status: 400 });
    }

    const claim = await db.bountyClaim.create({
      data: {
        bountyId: id,
        claimerId,
        matchId: matchId || null,
        proof: proof || null,
        status: 'pending',
      },
      include: {
        claimer: { select: { id: true, name: true, avatar: true, eloRating: true } },
      },
    });

    return NextResponse.json({ success: true, claim });
  } catch (error) {
    console.error('[Bounty Claim API] POST error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengajukan klaim' }, { status: 500 });
  }
}
