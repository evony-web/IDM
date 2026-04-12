import { db } from '@/lib/db'

/**
 * Ensure a user has a wallet — auto-create if missing, sync balance from User.points.
 *
 * This is the SINGLE SOURCE OF TRUTH for wallet auto-creation.
 * Used across all wallet-related API routes to avoid code duplication.
 *
 * @param userId - The user's ID
 * @param userPoints - The user's current leaderboard points (User.points)
 * @returns The existing or newly created Wallet
 */
export async function ensureWallet(userId: string, userPoints: number) {
  const existingWallet = await db.wallet.findUnique({ where: { userId } })

  if (existingWallet) {
    return existingWallet
  }

  // First-time wallet creation: sync balance with leaderboard points
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
}
