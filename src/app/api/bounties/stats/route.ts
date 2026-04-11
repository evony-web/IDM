import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/bounties/stats — Bounty statistics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const division = searchParams.get('division');

    const baseWhere: Record<string, unknown> = {};
    if (division) {
      baseWhere.targetPlayer = { gender: division === 'male' ? 'male' : 'female' };
    }

    const [totalActive, totalClaimed, totalAmount, highestBounty] = await Promise.all([
      db.bounty.count({ where: { ...baseWhere, status: 'active' } }),
      db.bounty.count({ where: { ...baseWhere, status: 'claimed' } }),
      db.bounty.aggregate({ where: { ...baseWhere, status: 'active' }, _sum: { amount: true } }),
      db.bounty.findFirst({ where: { ...baseWhere, status: 'active' }, orderBy: { amount: 'desc' }, include: { targetPlayer: { select: { name: true, avatar: true } } } }),
    ]);

    // Top bounty hunters (most approved claims)
    const topHunters = await db.bountyClaim.groupBy({
      by: ['claimerId'],
      where: { status: 'approved' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    // Get hunter details
    const hunterIds = topHunters.map(h => h.claimerId);
    const hunters = await db.user.findMany({
      where: { id: { in: hunterIds } },
      select: { id: true, name: true, avatar: true, eloRating: true, eloTier: true },
    });

    const topHuntersWithInfo = topHunters.map(h => ({
      ...hunters.find(u => u.id === h.claimerId),
      claimsCount: h._count.id,
    }));

    // User-specific stats
    let userStats = null;
    if (userId) {
      const [placed, onMe, claimed] = await Promise.all([
        db.bounty.count({ where: { placerId: userId } }),
        db.bounty.count({ where: { targetPlayerId: userId } }),
        db.bountyClaim.count({ where: { claimerId: userId, status: 'approved' } }),
      ]);

      const totalEarned = await db.bountyClaim.aggregate({
        where: { claimerId: userId, status: 'approved' },
        _sum: { true: true } as any,
      });

      userStats = { placed, onMe, claimed };
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalActive,
        totalClaimed,
        totalAmount: totalAmount._sum.amount || 0,
        highestBounty: highestBounty ? { amount: highestBounty.amount, target: highestBounty.targetPlayer } : null,
        topHunters: topHuntersWithInfo,
        userStats,
      },
    });
  } catch (error) {
    console.error('[Bounty Stats API] GET error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat statistik bounty' }, { status: 500 });
  }
}
