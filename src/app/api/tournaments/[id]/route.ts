import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/tournaments/[id] ─ Full tournament detail ─────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tournament ID is required' },
        { status: 400 }
      );
    }

    const tournament = await db.tournament.findUnique({
      where: { id },
      include: {
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                gender: true,
                tier: true,
                avatar: true,
                points: true,
                city: true,
                isMVP: true,
                mvpScore: true,
                clubId: true,
                eloRating: true,
                eloTier: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        teams: {
          include: {
            TeamMember: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    tier: true,
                    eloRating: true,
                    eloTier: true,
                    isMVP: true,
                    mvpScore: true,
                  },
                },
              },
            },
          },
          orderBy: { seed: 'asc' },
        },
        matches: {
          include: {
            teamA: {
              include: {
                TeamMember: { include: { user: { select: { id: true, name: true, avatar: true } } } },
              },
            },
            teamB: {
              include: {
                TeamMember: { include: { user: { select: { id: true, name: true, avatar: true } } } },
              },
            },
            winner: {
              include: {
                TeamMember: { include: { user: { select: { id: true, name: true } } } },
              },
            },
            mvp: {
              select: { id: true, name: true, avatar: true, isMVP: true },
            },
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
        bounties: {
          include: {
            placer: { select: { id: true, name: true, avatar: true } },
            targetPlayer: { select: { id: true, name: true, avatar: true } },
          },
          where: { status: 'active' },
          orderBy: { amount: 'desc' },
        },
        sawers: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            registrations: true,
            teams: true,
            matches: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tournament,
    });
  } catch (error) {
    console.error('[Tournament Detail API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tournament',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
