import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePlayerAuth } from '@/lib/session'

// GET /api/wallet
// Get authenticated user's wallet (auto-create if not exists) with last 50 transactions
// Session-based: uses NextAuth httpOnly cookie for authentication
export async function GET(request: NextRequest) {
  try {
    // Verify session — user must be authenticated
    const session = await requirePlayerAuth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Auto-create wallet if not exists
    let wallet = await db.wallet.findUnique({
      where: { userId },
    })

    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          userId,
          balance: 0,
          totalIn: 0,
          totalOut: 0,
        },
      })
    }

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
      transactions,
    })
  } catch (error) {
    console.error('[Wallet GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/wallet
// Top up wallet — requires authentication (session-based)
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await requirePlayerAuth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { amount, category = 'topup', description } = body

    // Use session user ID — ignore any userId from the request body for security
    const userId = session.user.id

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'Amount is required' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
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

    // Auto-create wallet if not exists
    let wallet = await db.wallet.findUnique({ where: { userId } })
    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          userId,
          balance: 0,
          totalIn: 0,
          totalOut: 0,
        },
      })
    }

    // Create credit transaction and update wallet in a transaction
    const result = await db.$transaction(async (tx) => {
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          type: 'credit',
          amount,
          category,
          description: description || `Top up ${amount} points`,
        },
      })

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet!.id },
        data: {
          balance: { increment: amount },
          totalIn: { increment: amount },
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
    console.error('[Wallet POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
