import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/clubs/join/[id] — Approve or reject a join request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reviewedBy } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status harus "approved" atau "rejected"' },
        { status: 400 }
      );
    }

    if (!reviewedBy) {
      return NextResponse.json(
        { success: false, error: 'reviewedBy wajib diisi' },
        { status: 400 }
      );
    }

    // Find the join request
    const joinRequest = await db.clubJoinRequest.findUnique({
      where: { id },
    });

    if (!joinRequest) {
      return NextResponse.json(
        { success: false, error: 'Permintaan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Permintaan sudah ${joinRequest.status}` },
        { status: 400 }
      );
    }

    // If approved: update user's clubId and request status in a transaction
    if (status === 'approved') {
      await db.$transaction(async (tx) => {
        // Update the join request
        await tx.clubJoinRequest.update({
          where: { id },
          data: {
            status: 'approved',
            reviewedBy,
            updatedAt: new Date(),
          },
        });

        // Update user's clubId
        await tx.user.update({
          where: { id: joinRequest.userId },
          data: { clubId: joinRequest.clubId },
        });
      });
    } else {
      // Just update the request status for rejected
      await db.clubJoinRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedBy,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Clubs Join PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
