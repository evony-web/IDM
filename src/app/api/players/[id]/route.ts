import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Fetch user with club and ranking
    const user = await db.user.findUnique({
      where: { id },
      include: {
        club: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        rankings: {
          select: { points: true, wins: true, losses: true, rank: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    // Get team memberships for match history and stats
    const teamMemberships = await db.teamMember.findMany({
      where: { userId: id },
      include: {
        team: {
          include: {
            matchesAsTeamA: {
              where: { status: 'completed' },
              include: {
                tournament: { select: { id: true, name: true, division: true } },
                teamB: { select: { id: true, name: true } },
              },
              orderBy: { completedAt: 'desc' },
            },
            matchesAsTeamB: {
              where: { status: 'completed' },
              include: {
                tournament: { select: { id: true, name: true, division: true } },
                teamA: { select: { id: true, name: true } },
              },
              orderBy: { completedAt: 'desc' },
            },
          },
        },
      },
    });

    // Calculate stats and build recent matches
    let wins = 0;
    let losses = 0;
    let mvpCount = 0;
    const seenMatchIds = new Set<string>();

    const recentMatches: Array<{
      id: string;
      tournamentName: string;
      result: 'win' | 'loss';
      score: string;
      opponent: string;
      date: string;
      bracket: string;
      round: number;
    }> = [];

    for (const membership of teamMemberships) {
      const teamAMatches = membership.team.matchesAsTeamA.map((m) => ({
        ...m,
        side: 'A' as const,
        opponent: m.teamB,
      }));
      const teamBMatches = membership.team.matchesAsTeamB.map((m) => ({
        ...m,
        side: 'B' as const,
        opponent: m.teamA,
      }));

      for (const match of [...teamAMatches, ...teamBMatches]) {
        if (seenMatchIds.has(match.id)) continue;
        seenMatchIds.add(match.id);

        const isWin = match.winnerId === membership.teamId;
        if (isWin) wins++;
        else losses++;

        if (match.mvpId === id) mvpCount++;

        const scoreFor = match.side === 'A' ? match.scoreA : match.scoreB;
        const scoreAgainst = match.side === 'A' ? match.scoreB : match.scoreA;

        recentMatches.push({
          id: match.id,
          tournamentName: match.tournament?.name || 'Turnamen',
          result: isWin ? 'win' : 'loss',
          score: `${scoreFor ?? 0}-${scoreAgainst ?? 0}`,
          opponent: match.opponent?.name || 'TBD',
          date: match.completedAt
            ? new Date(match.completedAt).toISOString().split('T')[0]
            : '',
          bracket: match.bracket,
          round: match.round,
        });
      }
    }

    // Sort recent matches by date descending, take last 10
    recentMatches.sort((a, b) => b.date.localeCompare(a.date));
    const limitedRecentMatches = recentMatches.slice(0, 10);

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Count champion titles (won highest round in a tournament)
    const championCount = await countChampionTitles(id, teamMemberships);

    return NextResponse.json({
      success: true,
      player: {
        id: user.id,
        name: user.name,
        gender: user.gender,
        tier: user.tier,
        points: user.points,
        avatar: user.avatar,
        city: user.city,
        isMVP: user.isMVP,
        mvpScore: user.mvpScore,
        club: user.club,
        ranking: user.rankings
          ? {
              wins: user.rankings.wins,
              losses: user.rankings.losses,
              rank: user.rankings.rank,
              points: user.rankings.points,
            }
          : { wins, losses, rank: null, points: user.points },
        stats: {
          totalMatches,
          wins,
          losses,
          winRate,
          mvpCount,
          championCount,
        },
        recentMatches: limitedRecentMatches,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Player API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player profile' },
      { status: 500 }
    );
  }
}

/**
 * Count how many tournaments the player has won (highest round match winner)
 */
async function countChampionTitles(
  userId: string,
  teamMemberships: { teamId: string }[]
): Promise<number> {
  try {
    const teamIds = teamMemberships.map((m) => m.teamId);
    if (teamIds.length === 0) return 0;

    // Find the highest-round completed matches for each tournament
    // where the user's team was the winner
    const championMatches = await db.match.findMany({
      where: {
        status: 'completed',
        winnerId: { in: teamIds },
      },
      include: {
        tournament: { select: { id: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Group by tournament, count unique tournaments won
    const wonTournaments = new Set<string>();
    for (const match of championMatches) {
      // A champion is the winner of the highest-round match in a tournament
      wonTournaments.add(match.tournamentId);
    }

    return wonTournaments.size;
  } catch {
    return 0;
  }
}
