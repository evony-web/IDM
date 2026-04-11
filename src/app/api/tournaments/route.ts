import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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

const VALID_FORMATS = ['single_elimination', 'double_elimination', 'round_robin', 'swiss'];
const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

// GET /api/tournaments - List all tournaments with pagination, search, format filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const format = searchParams.get('format') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { gameName: { contains: search } },
      ];
    }

    if (format && VALID_FORMATS.includes(format)) {
      where.format = format;
    }

    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [tournaments, total] = await Promise.all([
      db.tournament.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { participants: true, matches: true },
          },
        },
      }),
      db.tournament.count({ where }),
    ]);

    return NextResponse.json({
      tournaments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to list tournaments' },
      { status: 500 }
    );
  }
}

// POST /api/tournaments - Create a new tournament
export async function POST(request: NextRequest) {
  try {
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
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tournament name is required' },
        { status: 400 }
      );
    }

    // Validate format
    const tournamentFormat = format || 'single_elimination';
    if (!VALID_FORMATS.includes(tournamentFormat)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate slug
    const baseSlug = slugify(name.trim());
    if (!baseSlug) {
      return NextResponse.json(
        { error: 'Tournament name must contain alphanumeric characters' },
        { status: 400 }
      );
    }

    // Check for slug conflicts and append suffix if needed
    let slug = baseSlug;
    let existing = await db.tournament.findUnique({ where: { slug } });
    while (existing) {
      slug = `${baseSlug}-${generateRandomSuffix()}`;
      existing = await db.tournament.findUnique({ where: { slug } });
    }

    const tournament = await db.tournament.create({
      data: {
        name: name.trim(),
        slug,
        description: description || '',
        format: tournamentFormat,
        gameName: gameName || '',
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        seeded: seeded !== undefined ? Boolean(seeded) : false,
        thirdPlace: thirdPlace !== undefined ? Boolean(thirdPlace) : false,
        randomize: randomize !== undefined ? Boolean(randomize) : false,
        maxParticipants: maxParticipants || 64,
        swissRounds: swissRounds || 3,
        groupIdSize: groupIdSize || 4,
        holdThirdPlaceMatch: holdThirdPlaceMatch !== undefined ? Boolean(holdThirdPlaceMatch) : false,
      },
      include: {
        _count: {
          select: { participants: true, matches: true },
        },
      },
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}
