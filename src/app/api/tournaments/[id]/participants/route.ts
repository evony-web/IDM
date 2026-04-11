import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tournaments/[id]/participants - List participants
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await db.tournament.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const participants = await db.participant.findMany({
      where: { tournamentId: id },
      orderBy: { seed: 'asc' },
    });

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('Error listing participants:', error);
    return NextResponse.json(
      { error: 'Failed to list participants' },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/participants - Add participant(s), supports bulk add
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await db.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status === 'in_progress' || tournament.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot add participants to a tournament that has already started' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { participants } = body;

    // Support both single and bulk add
    const participantsToAdd: { name: string; seed?: number }[] = [];
    if (Array.isArray(participants)) {
      participantsToAdd.push(...participants);
    } else if (body.name) {
      participantsToAdd.push({ name: body.name, seed: body.seed });
    } else {
      return NextResponse.json(
        { error: 'Provide either a "name" field or a "participants" array' },
        { status: 400 }
      );
    }

    // Validate
    for (const p of participantsToAdd) {
      if (!p.name || typeof p.name !== 'string' || p.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Each participant must have a non-empty name' },
          { status: 400 }
        );
      }
    }

    // Check max participants
    const currentCount = tournament._count.participants;
    if (currentCount + participantsToAdd.length > tournament.maxParticipants) {
      return NextResponse.json(
        { error: `Adding ${participantsToAdd.length} participants would exceed the maximum of ${tournament.maxParticipants}` },
        { status: 400 }
      );
    }

    // Check for duplicate names within the tournament
    const existingParticipants = await db.participant.findMany({
      where: { tournamentId: id },
      select: { name: true },
    });
    const existingNames = new Set(existingParticipants.map((p) => p.name.toLowerCase()));

    for (const p of participantsToAdd) {
      if (existingNames.has(p.name.trim().toLowerCase())) {
        return NextResponse.json(
          { error: `Participant "${p.name}" already exists in this tournament` },
          { status: 400 }
        );
      }
      existingNames.add(p.name.trim().toLowerCase());
    }

    // Auto-assign seeds if not provided
    const nextSeed = currentCount + 1;
    const data = participantsToAdd.map((p, idx) => ({
      name: p.name.trim(),
      seed: p.seed || nextSeed + idx,
      tournamentId: id,
    }));

    const created = await db.participant.createMany({
      data,
    });

    // Fetch the newly created participants
    const newParticipants = await db.participant.findMany({
      where: { tournamentId: id },
      orderBy: { seed: 'asc' },
    });

    return NextResponse.json(
      {
        participants: newParticipants,
        added: created.count,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding participants:', error);
    return NextResponse.json(
      { error: 'Failed to add participants' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id]/participants - Remove a participant
export async function DELETE(
  request: NextRequest,
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

    const { searchParams } = request.nextUrl;
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId query parameter is required' },
        { status: 400 }
      );
    }

    const participant = await db.participant.findFirst({
      where: { id: participantId, tournamentId: id },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found in this tournament' },
        { status: 404 }
      );
    }

    // If tournament is in_progress, we need to regenerate the bracket
    const wasInProgress = tournament.status === 'in_progress';

    await db.participant.delete({
      where: { id: participantId },
    });

    // Re-seed remaining participants
    const remaining = await db.participant.findMany({
      where: { tournamentId: id },
      orderBy: { seed: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      await db.participant.update({
        where: { id: remaining[i].id },
        data: { seed: i + 1 },
      });
    }

    // If tournament was in progress, delete all matches and set back to pending
    // Bracket must be regenerated
    if (wasInProgress) {
      await db.match.deleteMany({
        where: { tournamentId: id },
      });
      await db.tournament.update({
        where: { id },
        data: { status: 'pending' },
      });

      return NextResponse.json({
        message: 'Participant removed. Tournament bracket has been reset - please regenerate.',
        bracketReset: true,
      });
    }

    return NextResponse.json({
      message: 'Participant removed successfully',
      bracketReset: false,
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    return NextResponse.json(
      { error: 'Failed to remove participant' },
      { status: 500 }
    );
  }
}
