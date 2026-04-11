import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tournaments/discover — Browse & search tournaments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const division = searchParams.get('division');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const bracketType = searchParams.get('bracketType');
    const sort = searchParams.get('sort') || 'newest';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };
    if (division) where.division = division;
    if (status) where.status = status;
    if (type) where.type = type;
    if (bracketType) where.bracketType = bracketType;

    // Determine sort order
    let orderBy: Record<string, unknown> = { createdAt: 'desc' };
    switch (sort) {
      case 'oldest': orderBy = { createdAt: 'asc' }; break;
      case 'prize_high': orderBy = { prizePool: 'desc' }; break;
      case 'prize_low': orderBy = { prizePool: 'asc' }; break;
      case 'newest': default: orderBy = { createdAt: 'desc' }; break;
    }

    const tournaments = await db.tournament.findMany({
      where,
      include: {
        _count: { select: { registrations: true, teams: true, matches: true } },
        registrations: {
          where: { status: 'approved' },
          take: 3,
          include: { user: { select: { name: true, avatar: true } } },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    const total = await db.tournament.count({ where });

    // For completed tournaments, try to get champion info from final match
    const tournamentIds = tournaments.map(t => t.id);
    const finalMatches = await db.match.findMany({
      where: {
        tournamentId: { in: tournamentIds },
        status: 'completed',
        winnerId: { not: null },
      },
      include: { winner: { include: { TeamMember: { include: { user: { select: { name: true } } } } } } },
      orderBy: { round: 'desc' },
    });

    const tournamentsWithChamps = tournaments.map(t => {
      const finalMatch = finalMatches.find(m => m.tournamentId === t.id);
      const championName = finalMatch?.winner?.TeamMember?.[0]?.user?.name || null;
      return { ...t, championName };
    });

    return NextResponse.json({
      success: true,
      tournaments: tournamentsWithChamps,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('[Tournament Discover API] GET error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat turnamen' }, { status: 500 });
  }
}
