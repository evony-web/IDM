import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/wallet?userId=xxx
// Get user's wallet (auto-create if not exists) with last 50 transactions
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
// Top up wallet (admin/system)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, amount, category = 'topup', description } = body

    if (!userId || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'userId and amount are required' },
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
