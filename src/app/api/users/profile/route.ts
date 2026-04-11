import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        club: true,
        rankings: true,
        registrations: {
          where: { status: 'approved' },
          include: { tournament: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        bountiesPlaced: { select: { id: true } },
        bountiesOnMe: { select: { id: true } },
        bountyClaims: { select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get team memberships for match stats
    const teamMemberships = await db.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            matchesAsTeamA: {
              where: { status: 'completed' },
              include: { tournament: { select: { id: true, name: true } } },
              orderBy: { completedAt: 'desc' },
            },
            matchesAsTeamB: {
              where: { status: 'completed' },
              include: { tournament: { select: { id: true, name: true } } },
              orderBy: { completedAt: 'desc' },
            },
          },
        },
      },
    });

    // Calculate all-time stats
    let wins = 0, losses = 0, totalMatches = 0, mvpCount = 0;
    const recentMatches: Array<{
      id: string;
      tournamentName: string;
      result: 'win' | 'loss';
      score: string;
      date: string;
      opponentName: string;
      mvpName?: string;
      bracket: string;
    }> = [];

    const seenMatchIds = new Set<string>();

    for (const membership of teamMemberships) {
      const allMatches = [
        ...membership.team.matchesAsTeamA.map(m => ({ ...m, side: 'A' as const })),
        ...membership.team.matchesAsTeamB.map(m => ({ ...m, side: 'B' as const })),
      ];

      for (const match of allMatches) {
        if (seenMatchIds.has(match.id)) continue;
        seenMatchIds.add(match.id);

        totalMatches++;
        const isWin = match.winnerId === membership.teamId;
        if (isWin) wins++; else losses++;
        if (match.mvpId === userId) mvpCount++;

        const opponentName = match.side === 'A'
          ? (match as any).teamB?.name || 'TBD'
          : (match as any).teamA?.name || 'TBD';

        recentMatches.push({
          id: match.id,
          tournamentName: (match as any).tournament?.name || 'Turnamen',
          result: isWin ? 'win' : 'loss',
          score: `${match.side === 'A' ? match.scoreA : match.scoreB} - ${match.side === 'A' ? match.scoreB : match.scoreA}`,
          date: match.completedAt
            ? new Date(match.completedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '-',
          opponentName,
          mvpName: (match as any).mvp?.name || undefined,
          bracket: match.bracket,
        });
      }
    }

    // Sort recent matches by date descending
    recentMatches.sort((a, b) => b.date.localeCompare(a.date));

    // Calculate achievements based on all-time stats
    const achievements: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      earnedAt: string;
    }> = [];

    if (wins >= 1) achievements.push({ id: 'first_win', name: 'First Blood', description: 'Menang pertama kali', icon: '🏆', earnedAt: user.createdAt.toISOString() });
    if (wins >= 5) achievements.push({ id: 'five_wins', name: 'Veteran', description: `${wins} kemenangan`, icon: '⚔️', earnedAt: user.createdAt.toISOString() });
    if (wins >= 10) achievements.push({ id: 'ten_wins', name: 'Champion', description: `${wins} kemenangan`, icon: '👑', earnedAt: user.createdAt.toISOString() });
    if (mvpCount >= 1) achievements.push({ id: 'first_mvp', name: 'Bintang', description: 'MVP pertama', icon: '⭐', earnedAt: user.createdAt.toISOString() });
    if (mvpCount >= 3) achievements.push({ id: 'mvp_3x', name: 'Superstar', description: `${mvpCount}x MVP`, icon: '💫', earnedAt: user.createdAt.toISOString() });
    if (totalMatches > 0 && wins / totalMatches >= 0.7 && totalMatches >= 3) {
      const wr = Math.round((wins / totalMatches) * 100);
      achievements.push({ id: 'hot_streak', name: 'Hot Streak', description: `Win rate ${wr}%+`, icon: '🔥', earnedAt: user.createdAt.toISOString() });
    }
    if (user.points >= 500) achievements.push({ id: 'elite', name: 'Elite', description: `${user.points.toLocaleString()} poin`, icon: '💎', earnedAt: user.createdAt.toISOString() });
    if (user.points >= 1000) achievements.push({ id: 'legend', name: 'Legend', description: `${user.points.toLocaleString()} poin`, icon: '🌟', earnedAt: user.createdAt.toISOString() });
    if (user.tier === 'S') achievements.push({ id: 'tier_s', name: 'Pro Tier', description: 'Mencapai Tier S', icon: '🎖️', earnedAt: user.createdAt.toISOString() });
    if (user.isMVP) achievements.push({ id: 'mvp_badge', name: 'Most Valuable Player', description: 'MVP Turnamen', icon: '🏅', earnedAt: user.createdAt.toISOString() });
    if (user.club) achievements.push({ id: 'club_member', name: `Anggota ${user.club.name}`, description: 'Bergabung dengan klub', icon: '🏛️', earnedAt: user.createdAt.toISOString() });

    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    const averageScore = totalMatches > 0 ? Math.round(user.points / totalMatches) : 0;

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        tier: user.tier,
        points: user.points,
        avatar: user.avatar,
        city: user.city,
        isMVP: user.isMVP,
        mvpScore: user.mvpScore,
        createdAt: user.createdAt,
        club: user.club ? { id: user.club.id, name: user.club.name, logoUrl: user.club.logoUrl } : null,
        stats: {
          wins,
          losses,
          totalMatches,
          winRate,
          averageScore,
          mvpCount,
          championCount: 0,
        },
        recentMatches: recentMatches.slice(0, 10),
        achievements,
        // ELO & Bounty Stats
        eloRating: user.eloRating || 1000,
        eloTier: user.eloTier || 'Bronze',
        winStreak: user.winStreak || 0,
        bestStreak: user.bestStreak || 0,
        totalKills: user.totalKills || 0,
        totalDeaths: user.totalDeaths || 0,
        bountiesPlaced: user.bountiesPlaced?.length || 0,
        bountiesOnMe: user.bountiesOnMe?.length || 0,
        bountyClaimsCount: user.bountyClaims?.length || 0,
        registrations: user.registrations.map(r => ({
          id: r.id,
          status: r.status,
          tierAssigned: r.tierAssigned,
          tournament: {
            id: r.tournament.id,
            name: r.tournament.name,
            status: r.tournament.status,
          },
        })),
      },
    });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}
