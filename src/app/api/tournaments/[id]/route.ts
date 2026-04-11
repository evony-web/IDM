import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const VALID_FORMATS = ['single_elimination', 'double_elimination', 'round_robin', 'swiss'];
const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function generateRandomSuffix(): string {
  return Math.random().toString(36).substring(2, 8);
}

// GET /api/tournaments/[id] - Get tournament with participants and matches
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await db.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          orderBy: { seed: 'asc' },
        },
        matches: {
          orderBy: [{ bracket: 'asc' }, { round: 'asc' }, { position: 'asc' }],
          include: {
            player1: { select: { id: true, name: true, seed: true } },
            player2: { select: { id: true, name: true, seed: true } },
            winner: { select: { id: true, name: true, seed: true } },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tournament });
  } catch (error) {
    console.error('Error getting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to get tournament' },
      { status: 500 }
    );
  }
}

// PUT /api/tournaments/[id] - Update tournament details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.tournament.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      format,
      gameName,
      isPublic,
      seeded,
      thirdPlace,
      randomize,
      maxParticipants,
      swissRounds,
      groupIdSize,
      holdThirdPlaceMatch,
      status,
    } = body;

    // If tournament is in_progress, restrict what can be updated
    if (existing.status === 'in_progress') {
      const allowedFields = ['name', 'description', 'gameName', 'isPublic'];
      const attemptedFields = Object.keys(body);
      const disallowed = attemptedFields.filter((f) => !allowedFields.includes(f));
      if (disallowed.length > 0) {
        return NextResponse.json(
          { error: `Cannot update ${disallowed.join(', ')} while tournament is in progress` },
          { status: 400 }
        );
      }
    }

    // If tournament is completed, don't allow updates
    if (existing.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot update a completed tournament. Reset it first.' },
        { status: 400 }
      );
    }

    // Validate format if provided
    if (format !== undefined && !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (format !== undefined) updateData.format = format;
    if (gameName !== undefined) updateData.gameName = gameName;
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (seeded !== undefined) updateData.seeded = Boolean(seeded);
    if (thirdPlace !== undefined) updateData.thirdPlace = Boolean(thirdPlace);
    if (randomize !== undefined) updateData.randomize = Boolean(randomize);
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
    if (swissRounds !== undefined) updateData.swissRounds = swissRounds;
    if (groupIdSize !== undefined) updateData.groupIdSize = groupIdSize;
    if (holdThirdPlaceMatch !== undefined) updateData.holdThirdPlaceMatch = Boolean(holdThirdPlaceMatch);
    if (status !== undefined) updateData.status = status;

    // If name is being updated, regenerate slug
    if (name !== undefined && name.trim() !== existing.name) {
      const baseSlug = slugify(name.trim());
      if (baseSlug) {
        let slug = baseSlug;
        let slugExists = await db.tournament.findFirst({
          where: { slug, id: { not: id } },
        });
        while (slugExists) {
          slug = `${baseSlug}-${generateRandomSuffix()}`;
          slugExists = await db.tournament.findFirst({
            where: { slug, id: { not: id } },
          });
        }
        updateData.slug = slug;
      }
    }

    const tournament = await db.tournament.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { participants: true, matches: true },
        },
      },
    });

    return NextResponse.json({ tournament });
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id] - Delete tournament and all related data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.tournament.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Cascade delete will handle participants and matches
    await db.tournament.delete({ where: { id } });

    return NextResponse.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}
