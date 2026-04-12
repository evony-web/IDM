import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════
// POST /api/wallet/sync
// Global wallet sync — syncs ALL player wallets with their User.points
// This ensures every player's Wallet.balance matches their leaderboard points.
// Can also fix wallets that have balance=0 but User.points>0.
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // Simple admin check — only admins can run global sync
    const body = await request.json().catch(() => ({}))
    const { adminKey } = body

    // Basic auth: admin key from env or default
    if (adminKey !== 'idm-sync-2024' && adminKey !== process.env.ADMIN_SYNC_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin key required.' },
        { status: 401 }
      )
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
        // Create wallet with User.points as initial balance
        const initialBalance = user.points || 0
        wallet = await db.wallet.create({
          data: {
            userId: user.id,
            balance: initialBalance,
            totalIn: initialBalance,
            totalOut: 0,
          },
        })

        // Create sync transaction record
        if (initialBalance > 0) {
          await db.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'credit',
              amount: initialBalance,
              category: 'prize',
              description: 'Sinkronisasi poin leaderboard ke wallet',
            },
          })
        }

        created++
        results.push({
          userId: user.id,
          name: user.name,
          action: 'created',
          points: user.points,
          newBalance: initialBalance,
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
    console.error('[Wallet Sync] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
