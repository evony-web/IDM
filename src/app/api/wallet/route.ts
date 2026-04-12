import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePlayerAuth } from '@/lib/session'
import { ensureWallet } from '@/lib/wallet-utils'
import {
  apiError,
  ErrorCodes,
  validateAmount,
  validateCategory,
  validateLength,
  handlePrismaError,
  safeParseBody,
  MAX_REASON_LENGTH,
} from '@/lib/api-utils'

// ═══════════════════════════════════════════════════════════════════════
// GET /api/wallet
// Get authenticated user's wallet (auto-create if not exists) with last 50 transactions
// Also returns leaderboard points (User.points) for display
// Session-based: uses NextAuth httpOnly cookie for authentication
// ═══════════════════════════════════════════════════════════════════════
export async function GET() {
  try {
    // Verify session — user must be authenticated
    const session = await requirePlayerAuth()
    if (!session) {
      return apiError('Akses ditolak. Silakan login terlebih dahulu.', ErrorCodes.UNAUTHORIZED, 401)
    }

    const userId = session.user.id

    // Verify user exists — also get leaderboard points
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        points: true,
        eloRating: true,
        eloTier: true,
        gender: true,
      },
    })
    if (!user) {
      return apiError('User tidak ditemukan.', ErrorCodes.USER_NOT_FOUND, 404)
    }

    // Get wins/losses from Ranking model (separate from User)
    const ranking = await db.ranking.findUnique({
      where: { userId },
      select: { wins: true, losses: true },
    })

    // Auto-create wallet if not exists — uses shared utility
    const wallet = await ensureWallet(userId, user.points || 0)

    // Get last 50 transactions sorted by createdAt DESC
    const transactions = await db.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        totalIn: wallet.totalIn,
        totalOut: wallet.totalOut,
      },
      leaderboardPoints: user.points,
      playerStats: {
        wins: ranking?.wins ?? 0,
        losses: ranking?.losses ?? 0,
        eloRating: user.eloRating,
        eloTier: user.eloTier,
        gender: user.gender,
      },
      transactions,
    })
  } catch (error) {
    return handlePrismaError(error)
  }
}

// ═══════════════════════════════════════════════════════════════════════
// POST /api/wallet
// Top up wallet — requires authentication (session-based)
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await requirePlayerAuth()
    if (!session) {
      return apiError('Akses ditolak. Silakan login terlebih dahulu.', ErrorCodes.UNAUTHORIZED, 401)
    }

    // Safely parse request body
    const { data: body, error: parseError } = await safeParseBody(request)
    if (parseError || !body) return parseError!

    const { amount, category = 'topup', description } = body

    // Use session user ID — ignore any userId from the request body for security
    const userId = session.user.id

    // ── Validation ──
    const amountError = validateAmount(amount, 1, 100000, 'Jumlah top up')
    if (amountError) {
      return apiError(amountError, ErrorCodes.INVALID_AMOUNT, 400)
    }

    const categoryError = validateCategory(category)
    if (categoryError) {
      return apiError(categoryError, ErrorCodes.INVALID_CATEGORY, 400)
    }

    const descError = validateLength(description, MAX_REASON_LENGTH, 'Deskripsi')
    if (descError) {
      return apiError(descError, ErrorCodes.FIELD_TOO_LONG, 400)
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return apiError('User tidak ditemukan.', ErrorCodes.USER_NOT_FOUND, 404)
    }

    // Auto-create wallet if not exists — uses shared utility
    const wallet = await ensureWallet(userId, user.points || 0)

    // Create credit transaction and update wallet in a transaction
    const result = await db.$transaction(async (tx) => {
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'credit',
          amount: amount as number,
          category: category as string,
          description: (description as string) || `Top up ${amount} poin`,
        },
      })

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount as number },
          totalIn: { increment: amount as number },
        },
      })

      return { transaction, updatedWallet }
    })

    return NextResponse.json({
      success: true,
      wallet: {
        id: result.updatedWallet.id,
        userId: result.updatedWallet.userId,
        balance: result.updatedWallet.balance,
        totalIn: result.updatedWallet.totalIn,
        totalOut: result.updatedWallet.totalOut,
      },
      transaction: result.transaction,
    })
  } catch (error) {
    return handlePrismaError(error)
  }
}
