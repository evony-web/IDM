import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ELO Tier thresholds
function getEloTier(rating: number): string {
  if (rating >= 2000) return 'Grandmaster'
  if (rating >= 1800) return 'Master'
  if (rating >= 1600) return 'Diamond'
  if (rating >= 1400) return 'Platinum'
  if (rating >= 1200) return 'Gold'
  if (rating >= 1000) return 'Silver'
  return 'Bronze'
}

// ELO expected score
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

// GET /api/elo?division=male&limit=50
// Get ELO leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const division = searchParams.get('division')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 50

    if (isNaN(limit) || limit < 1 || limit > 200) {
      return NextResponse.json(
        { success: false, error: 'limit must be between 1 and 200' },
        { status: 400 }
      )
    }

    const where: Record<string, string> = {}
    if (division) {
      where.gender = division
    }

    const users = await db.user.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { eloRating: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        avatar: true,
        eloRating: true,
        eloTier: true,
        winStreak: true,
        bestStreak: true,
        points: true,
        gender: true,
      },
    })

    // Get win/loss counts from Ranking table
    const userIds = users.map((u) => u.id)
    const rankings = await db.ranking.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        wins: true,
        losses: true,
      },
    })

    const rankingMap = new Map(rankings.map((r) => [r.userId, r]))

    const leaderboard = users.map((user) => {
      const ranking = rankingMap.get(user.id)
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        eloRating: user.eloRating,
        eloTier: user.eloTier,
        winStreak: user.winStreak,
        bestStreak: user.bestStreak,
        points: user.points,
        wins: ranking?.wins ?? 0,
        losses: ranking?.losses ?? 0,
        gender: user.gender,
      }
    })

    return NextResponse.json({
      success: true,
      leaderboard,
    })
  } catch (error) {
    console.error('[ELO GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/elo
// Calculate & update ELO after a match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { winnerId, loserId, isDraw = false } = body

    if (!winnerId || !loserId) {
      return NextResponse.json(
        { success: false, error: 'winnerId and loserId are required' },
        { status: 400 }
      )
    }

    if (winnerId === loserId) {
      return NextResponse.json(
        { success: false, error: 'winnerId and loserId must be different' },
        { status: 400 }
      )
    }

    // Fetch both users
    const [playerA, playerB] = await Promise.all([
      db.user.findUnique({ where: { id: winnerId } }),
      db.user.findUnique({ where: { id: loserId } }),
    ])

    if (!playerA) {
      return NextResponse.json(
        { success: false, error: 'Winner not found' },
        { status: 404 }
      )
    }

    if (!playerB) {
      return NextResponse.json(
        { success: false, error: 'Loser not found' },
        { status: 404 }
      )
    }

    const K = 32 // Standard K-factor
    const ratingA = playerA.eloRating
    const ratingB = playerB.eloRating

    // Expected scores
    const expectedA = expectedScore(ratingA, ratingB)
    const expectedB = expectedScore(ratingB, ratingA)

    let newRatingA: number
    let newRatingB: number

    if (isDraw) {
      // Draw: both get 0.5 * K * (0.5 - E)
      newRatingA = ratingA + K * (0.5 - expectedA)
      newRatingB = ratingB + K * (0.5 - expectedB)
    } else {
      // Win/Loss
      // Winner (playerA/winnerId) gets K * (1 - expectedA)
      // Loser (playerB/loserId) gets K * (0 - expectedB)
      newRatingA = ratingA + K * (1 - expectedA)
      newRatingB = ratingB + K * (0 - expectedB)
    }

    // Minimum ELO: 100
    newRatingA = Math.max(100, Math.round(newRatingA))
    newRatingB = Math.max(100, Math.round(newRatingB))

    const newTierA = getEloTier(newRatingA)
    const newTierB = getEloTier(newRatingB)

    // Update both users in a transaction
    const result = await db.$transaction(async (tx) => {
      // Update winner (playerA)
      const updatedWinner = await tx.user.update({
        where: { id: winnerId },
        data: {
          eloRating: newRatingA,
          eloTier: newTierA,
          // Win streak: increment on win, reset on loss, no change on draw
          winStreak: isDraw ? playerA.winStreak : playerA.winStreak + 1,
          bestStreak: isDraw
            ? playerA.bestStreak
            : Math.max(playerA.bestStreak, playerA.winStreak + 1),
        },
      })

      // Update loser (playerB)
      const updatedLoser = await tx.user.update({
        where: { id: loserId },
        data: {
          eloRating: newRatingB,
          eloTier: newTierB,
          // Win streak: reset on loss, no change on draw
          winStreak: isDraw ? playerB.winStreak : 0,
          // bestStreak only updates on new best, so no change on loss
          bestStreak: playerB.bestStreak,
        },
      })

      // Update ranking wins/losses
      // Winner's ranking: increment wins
      const winnerRanking = await tx.ranking.findUnique({
        where: { userId: winnerId },
      })
      if (winnerRanking) {
        await tx.ranking.update({
          where: { userId: winnerId },
          data: {
            wins: isDraw ? winnerRanking.wins : winnerRanking.wins + 1,
          },
        })
      }

      // Loser's ranking: increment losses
      const loserRanking = await tx.ranking.findUnique({
        where: { userId: loserId },
      })
      if (loserRanking) {
        await tx.ranking.update({
          where: { userId: loserId },
          data: {
            losses: isDraw ? loserRanking.losses : loserRanking.losses + 1,
          },
        })
      }

      return { updatedWinner, updatedLoser }
    })

    return NextResponse.json({
      success: true,
      winner: {
        id: winnerId,
        newElo: newRatingA,
        eloTier: newTierA,
        oldElo: ratingA,
        eloChange: newRatingA - ratingA,
      },
      loser: {
        id: loserId,
        newElo: newRatingB,
        eloTier: newTierB,
        oldElo: ratingB,
        eloChange: newRatingB - ratingB,
      },
      isDraw,
    })
  } catch (error) {
    console.error('[ELO POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
