import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/clubs/[id] — Get club details with members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const club = await db.club.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            avatar: true,
            eloRating: true,
            eloTier: true,
            points: true,
            gender: true,
          },
          orderBy: { points: 'desc' },
        },
        joinRequests: {
          where: { status: 'pending' },
          select: { id: true },
        },
      },
    });

    if (!club) {
      return NextResponse.json(
        { success: false, error: 'Club tidak ditemukan' },
        { status: 404 }
      );
    }

    const totalPoints = club.members.reduce((sum, m) => sum + m.points, 0);

    return NextResponse.json({
      success: true,
      club: {
        id: club.id,
        name: club.name,
        slug: club.slug,
        logoUrl: club.logoUrl,
        description: club.description,
        motto: club.motto,
        isRecruiting: club.isRecruiting,
        createdBy: club.createdBy,
        createdAt: club.createdAt,
        updatedAt: club.updatedAt,
        members: club.members.map((m) => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          eloRating: m.eloRating,
          eloTier: m.eloTier,
          points: m.points,
        })),
        joinRequestsCount: club.joinRequests.length,
        totalPoints,
        memberCount: club.members.length,
      },
    });
  } catch (error) {
    console.error('[Clubs Detail GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
