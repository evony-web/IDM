import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/bounties/[id]/review — Review (approve/reject) a bounty claim
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { claimId, status, reviewedBy } = body;

    if (!claimId || !status || !reviewedBy) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Status tidak valid' }, { status: 400 });
    }

    const bounty = await db.bounty.findUnique({
      where: { id },
      include: { claims: true },
    });
    if (!bounty) return NextResponse.json({ success: false, error: 'Bounty tidak ditemukan' }, { status: 404 });

    const claim = bounty.claims.find(c => c.id === claimId);
    if (!claim) return NextResponse.json({ success: false, error: 'Klaim tidak ditemukan' }, { status: 404 });
    if (claim.status !== 'pending') return NextResponse.json({ success: false, error: 'Klaim sudah direview' }, { status: 400 });

    await db.$transaction(async (tx) => {
      // Update claim
      await tx.bountyClaim.update({
        where: { id: claimId },
        data: { status, reviewedBy, reviewedAt: new Date() },
      });

      if (status === 'approved') {
        // Mark bounty as claimed
        await tx.bounty.update({
          where: { id },
          data: {
            status: 'claimed',
            claimedById: claim.claimerId,
            claimedAt: new Date(),
          },
        });

        // Reward claimer
        if (bounty.currency === 'points') {
          await tx.user.update({
            where: { id: claim.claimerId },
            data: { points: { increment: bounty.amount } },
          });
        }

        // Reject all other pending claims
        await tx.bountyClaim.updateMany({
          where: { bountyId: id, id: { not: claimId }, status: 'pending' },
          data: { status: 'rejected', reviewedBy, reviewedAt: new Date() },
        });

        // Activity log
        await tx.activityLog.create({
          data: {
            action: 'bounty_claimed',
            details: `Bounty ${bounty.amount} ${bounty.currency} diklaim`,
            userId: claim.claimerId,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Bounty Review API] PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mereview klaim' }, { status: 500 });
  }
}
