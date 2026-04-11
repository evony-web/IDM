import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ELO range limits based on eloRange setting
function getEloRangeLimit(eloRange: string): number | null {
  switch (eloRange) {
    case 'narrow':
      return 200
    case 'wide':
      return 400
    case 'any':
      return null // no limit
    default:
      return null
  }
}

// POST /api/matchmaking
// Join matchmaking queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, division = 'male', eloRange = 'any' } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user already in queue with status "waiting"
    const existingEntry = await db.matchmakingQueue.findFirst({
      where: {
        userId,
        status: 'waiting',
      },
    })

    if (existingEntry) {
      // Already in queue — try to find a match for the existing entry
      const matchResult = await tryFindMatch(existingEntry, user.eloRating)
      if (matchResult) {
        return NextResponse.json({
          success: true,
          matched: true,
          opponent: matchResult.opponent,
          queueEntry: matchResult.updatedEntry,
        })
      }

      return NextResponse.json({
        success: true,
        matched: false,
        queueEntry: existingEntry,
      })
    }

    // Create new queue entry
    const queueEntry = await db.matchmakingQueue.create({
      data: {
        userId,
        division,
        eloRange,
        status: 'waiting',
      },
    })

    // Try to find a match
    const matchResult = await tryFindMatch(queueEntry, user.eloRating)
    if (matchResult) {
      return NextResponse.json({
        success: true,
        matched: true,
        opponent: matchResult.opponent,
        queueEntry: matchResult.updatedEntry,
      })
    }

    return NextResponse.json({
      success: true,
      matched: false,
      queueEntry,
    })
  } catch (error) {
    console.error('[Matchmaking POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper: try to find a match for a queue entry
async function tryFindMatch(
  queueEntry: { id: string; userId: string; division: string; eloRange: string },
  userElo: number
): Promise<{ opponent: Record<string, unknown>; updatedEntry: Record<string, unknown> } | null> {
  const eloLimit = getEloRangeLimit(queueEntry.eloRange)

  // Build filter for potential opponents
  const whereFilter: {
    status: string
    division: string
    userId: { not: string }
    id: { not: string }
  } & Record<string, unknown> = {
    status: 'waiting',
    division: queueEntry.division,
    userId: { not: queueEntry.userId },
    id: { not: queueEntry.id },
  }

  // Find potential opponents in the queue
  const potentialOpponents = await db.matchmakingQueue.findMany({
    where: whereFilter,
  })

  // Filter by ELO range if applicable
  let matchedOpponent = null
  for (const opponent of potentialOpponents) {
    const opponentUser = await db.user.findUnique({
      where: { id: opponent.userId },
      select: { id: true, name: true, avatar: true, eloRating: true, eloTier: true, gender: true },
    })

    if (!opponentUser) continue

    // Check ELO range
    if (eloLimit !== null) {
      const eloDiff = Math.abs(userElo - opponentUser.eloRating)
      if (eloDiff > eloLimit) continue
    }

    matchedOpponent = { queueEntry: opponent, user: opponentUser }
    break
  }

  if (!matchedOpponent) {
    return null
  }

  // Match found — update both entries in a transaction
  const result = await db.$transaction(async (tx) => {
    const updatedEntry = await tx.matchmakingQueue.update({
      where: { id: queueEntry.id },
      data: {
        status: 'matched',
        matchedWith: matchedOpponent.user.id,
      },
    })

    const updatedOpponentEntry = await tx.matchmakingQueue.update({
      where: { id: matchedOpponent.queueEntry.id },
      data: {
        status: 'matched',
        matchedWith: queueEntry.userId,
      },
    })

    return { updatedEntry, updatedOpponentEntry }
  })

  return {
    opponent: {
      id: matchedOpponent.user.id,
      name: matchedOpponent.user.name,
      avatar: matchedOpponent.user.avatar,
      eloRating: matchedOpponent.user.eloRating,
      eloTier: matchedOpponent.user.eloTier,
      gender: matchedOpponent.user.gender,
    },
    updatedEntry: result.updatedEntry,
  }
}

// GET /api/matchmaking?userId=xxx
// Check matchmaking status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // Find the user's most recent queue entry
    const queueEntry = await db.matchmakingQueue.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    if (!queueEntry) {
      return NextResponse.json({
        success: true,
        inQueue: false,
        status: null,
      })
    }

    // If matched, get opponent info
    let opponent = null
    if (queueEntry.status === 'matched' && queueEntry.matchedWith) {
      const opponentUser = await db.user.findUnique({
        where: { id: queueEntry.matchedWith },
        select: {
          id: true,
          name: true,
          avatar: true,
          eloRating: true,
          eloTier: true,
          gender: true,
        },
      })

      if (opponentUser) {
        opponent = opponentUser
      }
    }

    return NextResponse.json({
      success: true,
      inQueue: queueEntry.status === 'waiting',
      status: queueEntry.status,
      queueEntry: {
        id: queueEntry.id,
        division: queueEntry.division,
        eloRange: queueEntry.eloRange,
        status: queueEntry.status,
        matchedWith: queueEntry.matchedWith,
        createdAt: queueEntry.createdAt,
      },
      opponent,
    })
  } catch (error) {
    console.error('[Matchmaking GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/matchmaking?userId=xxx
// Leave queue
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // Find the user's waiting queue entry
    const queueEntry = await db.matchmakingQueue.findFirst({
      where: {
        userId,
        status: 'waiting',
      },
    })

    if (!queueEntry) {
      return NextResponse.json(
        { success: false, error: 'No active queue entry found' },
        { status: 404 }
      )
    }

    // Set status to cancelled
    await db.matchmakingQueue.update({
      where: { id: queueEntry.id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({
      success: true,
      message: 'Left matchmaking queue',
    })
  } catch (error) {
    console.error('[Matchmaking DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
