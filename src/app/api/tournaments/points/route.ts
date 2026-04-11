import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Match-level point constants (synced with /api/matches/route.ts)
const MATCH_POINTS = {
  participation: 1,
  win: 2,
  mvpBonus: 0,
};

// Tournament finalization fallback constants (synced with /api/tournaments/finalize/route.ts)
const FALLBACK_POINTS = {
  champion: 100,
  runnerUp: 70,
  third: 50,
  mvp: 30,
  participation: 10,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json({ success: false, error: 'tournamentId required' }, { status: 400 });
    }

    const tournament = await db.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        bracketType: true,
        prizePool: true,
        prizeChampion: true,
        prizeRunnerUp: true,
        prizeThird: true,
        prizeMvp: true,
        status: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    // Calculate actual points based on prize pool or fallback
    const hasPrize = (tournament.prizeChampion || 0) > 0;

    // Estimate team member count from actual teams
    const teams = await db.team.findMany({
      where: { tournamentId },
      include: { TeamMember: true },
    });

    const memberCounts = teams.map(t => t.TeamMember.length).filter(c => c > 0);
    const avgMembers = memberCounts.length > 0 ? Math.round(memberCounts.reduce((a, b) => a + b, 0) / memberCounts.length) : 3;

    const calculatePoints = (prizeAmount: number, memberCount: number, fallback: number): number => {
      if (prizeAmount > 0 && memberCount > 0) {
        return Math.round(prizeAmount / memberCount / 1000);
      }
      return fallback;
    };

    const pointBreakdown = {
      // Per-match points
      match: {
        participation: MATCH_POINTS.participation,
        win: MATCH_POINTS.win,
        mvpBonus: MATCH_POINTS.mvpBonus,
      },
      // Tournament finalization points
      tournament: {
        champion: calculatePoints(tournament.prizeChampion || 0, avgMembers, FALLBACK_POINTS.champion),
        runnerUp: calculatePoints(tournament.prizeRunnerUp || 0, avgMembers, FALLBACK_POINTS.runnerUp),
        third: calculatePoints(tournament.prizeThird || 0, avgMembers, FALLBACK_POINTS.third),
        mvp: calculatePoints(tournament.prizeMvp || 0, 1, FALLBACK_POINTS.mvp),
        participation: FALLBACK_POINTS.participation,
      },
      // Metadata
      meta: {
        hasPrize,
        avgMembersPerTeam: avgMembers,
        prizeChampion: tournament.prizeChampion || 0,
        prizeRunnerUp: tournament.prizeRunnerUp || 0,
        prizeThird: tournament.prizeThird || 0,
        prizeMvp: tournament.prizeMvp || 0,
        isPrizeBased: hasPrize,
        fallbackPoints: FALLBACK_POINTS,
      },
    };

    return NextResponse.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
      },
      pointBreakdown,
    });
  } catch (error) {
    console.error('[Points API Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
