import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/clubs/join — Submit a join request to a club
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, clubId, message } = body;

    if (!userId || !clubId) {
      return NextResponse.json(
        { success: false, error: 'userId dan clubId wajib diisi' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate club exists
    const club = await db.club.findUnique({ where: { id: clubId } });
    if (!club) {
      return NextResponse.json(
        { success: false, error: 'Club tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if user is already in a club
    if (user.clubId) {
      return NextResponse.json(
        { success: false, error: 'Kamu sudah tergabung di club. Keluar dulu untuk bergabung club lain.' },
        { status: 400 }
      );
    }

    // Check for existing pending request for the same club
    const existingRequest = await db.clubJoinRequest.findUnique({
      where: {
        clubId_userId: { clubId, userId },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'Kamu sudah mengirim permintaan ke club ini. Menunggu persetujuan.' },
          { status: 400 }
        );
      }
      if (existingRequest.status === 'approved') {
        return NextResponse.json(
          { success: false, error: 'Kamu sudah menjadi anggota club ini.' },
          { status: 400 }
        );
      }
      // If rejected before, allow re-applying by updating the existing request
      const updatedRequest = await db.clubJoinRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: 'pending',
          message: message || null,
          reviewedBy: null,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        request: {
          id: updatedRequest.id,
          clubId: updatedRequest.clubId,
          userId: updatedRequest.userId,
          message: updatedRequest.message,
          status: updatedRequest.status,
          createdAt: updatedRequest.createdAt,
        },
      });
    }

    // Create new join request
    const joinRequest = await db.clubJoinRequest.create({
      data: {
        clubId,
        userId,
        message: message || null,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      request: {
        id: joinRequest.id,
        clubId: joinRequest.clubId,
        userId: joinRequest.userId,
        message: joinRequest.message,
        status: joinRequest.status,
        createdAt: joinRequest.createdAt,
      },
    });
  } catch (error) {
    console.error('[Clubs Join POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/clubs/join?clubId=xxx&status=pending — List join requests for a club
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const status = searchParams.get('status'); // pending / approved / rejected

    if (!clubId) {
      return NextResponse.json(
        { success: false, error: 'clubId wajib diisi' },
        { status: 400 }
      );
    }

    const where: { clubId: string; status?: string } = { clubId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.status = status;
    }

    const requests = await db.clubJoinRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            eloRating: true,
            eloTier: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      requests: requests.map((r) => ({
        id: r.id,
        clubId: r.clubId,
        userId: r.userId,
        message: r.message,
        status: r.status,
        reviewedBy: r.reviewedBy,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: {
          id: r.user.id,
          name: r.user.name,
          avatar: r.user.avatar,
          eloRating: r.user.eloRating,
          eloTier: r.user.eloTier,
        },
      })),
    });
  } catch (error) {
    console.error('[Clubs Join GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
