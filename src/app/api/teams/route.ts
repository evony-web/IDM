import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '@/lib/admin-guard';

// GET - Get teams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'Tournament ID required' },
        { status: 400 }
      );
    }

    const teams = await db.team.findMany({
      where: { tournamentId },
      include: {
        TeamMember: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { seed: 'asc' },
    });

    return NextResponse.json({ success: true, teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST - Generate balanced teams (admin only)
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { tournamentId } = body;

    // Get approved registrations
    const registrations = await db.registration.findMany({
      where: {
        tournamentId,
        status: 'approved',
      },
      include: {
        user: true,
      },
    });

    const tierS = registrations.filter(r => r.tierAssigned === 'S');
    const tierA = registrations.filter(r => r.tierAssigned === 'A');
    const tierB = registrations.filter(r => r.tierAssigned === 'B');
    const totalPlayers = registrations.length;

    const numTeams = Math.min(tierS.length, tierA.length, tierB.length);
    const totalUsed = numTeams * 3;
    const remaining = totalPlayers - totalUsed;

    if (numTeams < 2) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak bisa generate tim. Dibutuhkan minimal 2 tim (6 pemain: 2x S, 2x A, 2x B). Saat ini tersedia: Tier S=${tierS.length}, Tier A=${tierA.length}, Tier B=${tierB.length}.`,
          details: { tierS: tierS.length, tierA: tierA.length, tierB: tierB.length, numTeams, totalPlayers },
        },
        { status: 400 }
      );
    }

    if (remaining > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak bisa generate tim. Sisa ${remaining} pemain tidak dapat masuk tim.`,
          details: { tierS: tierS.length, tierA: tierA.length, tierB: tierB.length, numTeams, totalPlayers, remaining },
        },
        { status: 400 }
      );
    }

    // Shuffle each tier
    const shuffle = <T>(arr: T[]): T[] => {
      const newArr = [...arr];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    };

    const shuffledS = shuffle(tierS);
    const shuffledA = shuffle(tierA);
    const shuffledB = shuffle(tierB);

    const teamIds: string[] = [];
    const teamData = [];
    const allMemberData: Array<{ id: string; teamId: string; userId: string; role: string }> = [];

    for (let i = 0; i < numTeams; i++) {
      const teamId = uuidv4();
      teamIds.push(teamId);
      // Team name based on Tier S player with "Tim" prefix and capitalized name
      const captainName = shuffledS[i]?.user?.name || `${i + 1}`;
      const formattedName = captainName.charAt(0).toUpperCase() + captainName.slice(1);
      teamData.push({
        id: teamId,
        tournamentId,
        name: `Tim ${formattedName}`,
        seed: i + 1,
      });

      allMemberData.push({ id: uuidv4(), teamId, userId: shuffledS[i].userId, role: 'captain' });
      allMemberData.push({ id: uuidv4(), teamId, userId: shuffledA[i].userId, role: 'member' });
      allMemberData.push({ id: uuidv4(), teamId, userId: shuffledB[i].userId, role: 'member' });
    }

    await db.$transaction([
      db.team.createMany({ data: teamData }),
      db.teamMember.createMany({ data: allMemberData }),
      // Update tournament status to team_generation
      db.tournament.update({
        where: { id: tournamentId },
        data: { status: 'team_generation' },
      }),
    ]);

    const createdTeams = teamData.map((team) => {
      const memberCount = allMemberData.filter(m => m.teamId === team.id).length;
      return { ...team, members: memberCount };
    });

    return NextResponse.json({
      success: true,
      teams: createdTeams,
      totalPlayers,
      numTeams,
      playersPerTeam: 3,
    });
  } catch (error) {
    console.error('Error generating teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate teams' },
      { status: 500 }
    );
  }
}

// DELETE - Reset/clear all teams (admin only)
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'Tournament ID required' },
        { status: 400 }
      );
    }

    await db.$transaction([
      db.teamMember.deleteMany({ where: { team: { tournamentId } } }),
      db.team.deleteMany({ where: { tournamentId } }),
      // Reset tournament status back to registration
      db.tournament.update({
        where: { id: tournamentId },
        data: { status: 'registration' },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Tim berhasil direset' });
  } catch (error) {
    console.error('Error resetting teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset teams' },
      { status: 500 }
    );
  }
}
