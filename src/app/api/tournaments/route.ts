import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { triggerTournamentUpdate } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

// GET - Get tournaments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');
    const status = searchParams.get('status');
    const division = searchParams.get('division');
    const type = searchParams.get('type');

    if (tournamentId) {
      const tournament = await db.tournament.findUnique({
        where: { id: tournamentId },
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
                },
              },
            },
          },
          teams: {
            include: {
              TeamMember: {
                include: {
                  user: true,
                },
              },
            },
          },
          matches: {
            include: {
              teamA: {
                include: { TeamMember: { include: { user: true } } },
              },
              teamB: {
                include: { TeamMember: { include: { user: true } } },
              },
              winner: true,
              mvp: true,
            },
            orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
          },
        },
      });
      return NextResponse.json({ success: true, tournament });
    }

    const where: Record<string, string | undefined> = {};
    if (status) where.status = status;
    if (division) where.division = division;
    if (type) where.type = type;

    const defaultType = !type && !status ? 'weekly' : undefined;
    if (defaultType) where.type = defaultType;

    const tournaments = await db.tournament.findMany({
      where,
      include: {
        _count: {
          select: { registrations: true, teams: true, matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedTournaments = tournaments.map(t => ({
      ...t,
      _count: {
        registrations: t._count.registrations,
        teams: t._count.teams,
        matches: t._count.matches,
      },
    }));

    return NextResponse.json({ success: true, tournaments: mappedTournaments });
  } catch (error) {
    console.error('[Tournaments API] Error fetching tournaments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tournaments',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Create tournament (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, division, type, bracketType, week, startDate, prizePool, mode, bpm, lokasi } = body;

    const tournament = await db.tournament.create({
      data: {
        id: uuidv4(),
        name: name || `${division === 'male' ? 'Male' : 'Female'} Division - Week ${week}`,
        division: division || 'male',
        type: type || 'weekly',
        status: 'setup',
        week: week || 1,
        bracketType: bracketType || 'single',
        prizePool: prizePool || 0,
        mode: mode || 'GR Arena 3vs3',
        bpm: bpm || '130',
        lokasi: lokasi || 'PUB 1',
        startDate: startDate ? new Date(startDate) : null,
      },
    });

    triggerTournamentUpdate(division || 'male', { action: 'created', tournamentId: tournament.id, division: division || 'male' }).catch(() => {});

    // ═══ NOTIFICATION: Fire-and-forget ═══
    try {
      const { triggerNotification } = await import('@/lib/pusher');
      triggerNotification({
        type: 'tournament',
        title: 'Turnamen Baru',
        message: `Turnamen ${tournament.name} telah dibuat!`,
        icon: '⚔️',
        data: { tournamentId: tournament.id, division: division || 'male' },
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}

// PUT - Update tournament (admin only)
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { 
      tournamentId, 
      status, 
      prizePool, 
      prizeChampion,
      prizeRunnerUp,
      prizeThird,
      prizeMvp,
      name, 
      type, 
      bracketType, 
      week, 
      startDate, 
      mode, 
      bpm, 
      lokasi 
    } = body;

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'tournamentId is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, string | number | Date | null | undefined> = {};
    if (status !== undefined) updateData.status = status;
    if (prizePool !== undefined) updateData.prizePool = prizePool;
    if (prizeChampion !== undefined) updateData.prizeChampion = prizeChampion;
    if (prizeRunnerUp !== undefined) updateData.prizeRunnerUp = prizeRunnerUp;
    if (prizeThird !== undefined) updateData.prizeThird = prizeThird;
    if (prizeMvp !== undefined) updateData.prizeMvp = prizeMvp;
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (bracketType !== undefined) updateData.bracketType = bracketType;
    if (week !== undefined) updateData.week = week;
    if (mode !== undefined) updateData.mode = mode;
    if (bpm !== undefined) updateData.bpm = bpm;
    if (lokasi !== undefined) updateData.lokasi = lokasi;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;

    const tournament = await db.tournament.update({
      where: { id: tournamentId },
      data: updateData,
    });

    // ── Auto-increment season when tournament is completed ──
    if (status === 'completed') {
      try {
        const currentSeasonSetting = await db.settings.findUnique({ where: { key: 'current_season' } });
        const currentSeason = currentSeasonSetting ? parseInt(currentSeasonSetting.value, 10) : 1;
        const nextSeason = currentSeason + 1;
        await db.settings.upsert({
          where: { key: 'current_season' },
          update: { value: String(nextSeason) },
          create: { key: 'current_season', value: String(nextSeason) },
        });
        console.log(`[Tournament Update] Season incremented: ${currentSeason} → ${nextSeason}`);
      } catch (seasonErr) {
        console.warn('[Tournament Update] Failed to increment season:', seasonErr);
      }
    }

    triggerTournamentUpdate(tournament.division, { action: 'updated', tournamentId: tournament.id, division: tournament.division }).catch(() => {});

    // ═══ NOTIFICATION: Fire-and-forget (status change) ═══
    try {
      if (status !== undefined) {
        const { triggerNotification } = await import('@/lib/pusher');
        triggerNotification({
          type: 'tournament',
          title: 'Update Turnamen',
          message: `Turnamen ${tournament.name} sekarang status: ${status}`,
          icon: '⚔️',
          data: { tournamentId: tournament.id, division: tournament.division, status },
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a tournament (admin only)
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'tournamentId is required' },
        { status: 400 }
      );
    }

    const existing = await db.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    await db.playerMatchStat.deleteMany({ where: { match: { tournamentId } } });
    await db.match.deleteMany({ where: { tournamentId } } );
    await db.teamMember.deleteMany({ where: { team: { tournamentId } } });
    await db.team.deleteMany({ where: { tournamentId } });
    await db.registration.deleteMany({ where: { tournamentId } });
    await db.tournament.delete({ where: { id: tournamentId } });

    triggerTournamentUpdate(existing.division, { action: 'deleted', tournamentId, division: existing.division }).catch(() => {});

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}
