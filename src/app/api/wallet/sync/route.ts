import { db } from '@/lib/db'
import { ensureWallet } from '@/lib/wallet-utils'
import { NextRequest, NextResponse } from 'next/server'
import { apiError, ErrorCodes, handlePrismaError, safeParseBody } from '@/lib/api-utils'

// ═══════════════════════════════════════════════════════════════════════
// POST /api/wallet/sync
// Global wallet sync — syncs ALL player wallets with their User.points
// This ensures every player's Wallet.balance matches their leaderboard points.
// Can also fix wallets that have balance=0 but User.points>0.
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // Safely parse request body
    const { data: body, error: parseError } = await safeParseBody(request)
    if (parseError || !body) return parseError!

    const { adminKey } = body

    // Auth: admin key from env only — no hardcoded fallback
    if (!process.env.ADMIN_SYNC_KEY || adminKey !== process.env.ADMIN_SYNC_KEY) {
      return apiError('Unauthorized. Admin key required.', ErrorCodes.UNAUTHORIZED, 401)
    }

    // Get all non-admin users
    const users = await db.user.findMany({
      where: { isAdmin: false },
      select: {
        id: true,
        name: true,
        points: true,
        phone: true,
      },
    })

    let created = 0
    let synced = 0
    let skipped = 0
    const results: Array<{
      userId: string
      name: string
      action: 'created' | 'synced' | 'skipped'
      points: number
      oldBalance?: number
      newBalance?: number
    }> = []

    for (const user of users) {
      // Check if wallet exists
      let wallet = await db.wallet.findUnique({
        where: { userId: user.id },
      })

      if (!wallet) {
        // Use shared ensureWallet utility
        wallet = await ensureWallet(user.id, user.points || 0)
        created++
        results.push({
          userId: user.id,
          name: user.name,
          action: 'created',
          points: user.points,
          newBalance: wallet.balance,
        })
      } else if (wallet.balance === 0 && user.points > 0) {
        // Wallet exists but empty — sync with leaderboard points
        const oldBalance = wallet.balance
        await db.wallet.update({
          where: { id: wallet.id },
          data: { balance: user.points, totalIn: user.points },
        })
        await db.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'credit',
            amount: user.points,
            category: 'prize',
            description: 'Sinkronisasi poin leaderboard ke wallet',
          },
        })

        synced++
        results.push({
          userId: user.id,
          name: user.name,
          action: 'synced',
          points: user.points,
          oldBalance,
          newBalance: user.points,
        })
      } else {
        skipped++
        results.push({
          userId: user.id,
          name: user.name,
          action: 'skipped',
          points: user.points,
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalUsers: users.length,
        created,
        synced,
        skipped,
      },
      results,
    })
  } catch (error) {
    return handlePrismaError(error)
  }
}
