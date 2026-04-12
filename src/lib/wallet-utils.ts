import { db } from '@/lib/db'

/**
 * Ensure a user has a wallet — auto-create if missing, sync balance from User.points.
 *
 * This is the SINGLE SOURCE OF TRUTH for wallet auto-creation.
 * Used across all wallet-related API routes to avoid code duplication.
 *
 * Race condition safe: handles concurrent calls that both try to create
 * a wallet for the same userId by catching the unique constraint violation.
 *
 * @param userId - The user's ID
 * @param userPoints - The user's current leaderboard points (User.points)
 * @returns The existing or newly created Wallet
 */
export async function ensureWallet(userId: string, userPoints: number) {
  try {
    // Fast path: find existing wallet first
    const existing = await db.wallet.findUnique({ where: { userId } })
    if (existing) return existing

    // No wallet exists — create one
    const initialBalance = userPoints || 0
    const newWallet = await db.wallet.create({
      data: {
        userId,
        balance: initialBalance,
        totalIn: initialBalance,
        totalOut: 0,
      },
    })

    // Create initial transaction record for the sync
    if (initialBalance > 0) {
      await db.walletTransaction.create({
        data: {
          walletId: newWallet.id,
          type: 'credit',
          amount: initialBalance,
          category: 'prize',
          description: 'Sinkronisasi poin leaderboard ke wallet',
        },
      })
    }

    return newWallet
  } catch (error: any) {
    // Handle race condition: if two concurrent calls both pass the findUnique check,
    // one will fail with P2002 (unique constraint violation on userId).
    // In that case, the wallet was created by the other call — just fetch it.
    if (error.code === 'P2002') {
      const existing = await db.wallet.findUnique({ where: { userId } })
      if (existing) return existing
    }
    throw error
  }
}
