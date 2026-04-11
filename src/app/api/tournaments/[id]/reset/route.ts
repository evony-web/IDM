import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/tournaments/[id]/reset - Reset tournament
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await db.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status === 'pending') {
      return NextResponse.json(
        { error: 'Tournament has not been started yet' },
        { status: 400 }
      );
    }

    // Delete all matches
    await db.match.deleteMany({
      where: { tournamentId: id },
    });

    // Reset tournament status to pending
    await db.tournament.update({
      where: { id },
      data: { status: 'pending' },
    });

    // Reset participant scores/records if needed
    // (In our schema, participants don't have win/loss counts directly,
    //  those are computed from matches)

    const updatedTournament = await db.tournament.findUnique({
      where: { id },
      include: {
        participants: { orderBy: { seed: 'asc' } },
        _count: {
          select: { participants: true, matches: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Tournament reset successfully',
      tournament: updatedTournament,
    });
  } catch (error) {
    console.error('Error resetting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to reset tournament' },
      { status: 500 }
    );
  }
}
