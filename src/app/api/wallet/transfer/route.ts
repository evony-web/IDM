import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePlayerAuth } from '@/lib/session'

// POST /api/wallet/transfer
// Transfer points between users — requires authentication
export async function POST(request: NextRequest) {
  try {
    // Verify session — sender must be authenticated
    const session = await requirePlayerAuth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { receiverId, amount, reason } = body

    // Sender is always the authenticated user — ignore any senderId from request body
    const senderId = session.user.id

    // Validate required fields
    if (!receiverId || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'receiverId and amount are required' },
        { status: 400 }
      )
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Cannot transfer to self
    if (senderId === receiverId) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat transfer ke diri sendiri' },
        { status: 400 }
      )
    }

    // Verify both users exist
    const [sender, receiver] = await Promise.all([
      db.user.findUnique({ where: { id: senderId } }),
      db.user.findUnique({ where: { id: receiverId } }),
    ])

    if (!sender) {
      return NextResponse.json(
        { success: false, error: 'Sender not found' },
        { status: 404 }
      )
    }

    if (!receiver) {
      return NextResponse.json(
        { success: false, error: 'Penerima tidak ditemukan' },
        { status: 404 }
      )
    }

    // Auto-create wallets if not exists
    let senderWallet = await db.wallet.findUnique({ where: { userId: senderId } })
    if (!senderWallet) {
      senderWallet = await db.wallet.create({
        data: { userId: senderId, balance: 0, totalIn: 0, totalOut: 0 },
      })
    }

    let receiverWallet = await db.wallet.findUnique({ where: { userId: receiverId } })
    if (!receiverWallet) {
      receiverWallet = await db.wallet.create({
        data: { userId: receiverId, balance: 0, totalIn: 0, totalOut: 0 },
      })
    }

    // Check sufficient balance
    if (senderWallet.balance < amount) {
      return NextResponse.json(
        { success: false, error: 'Saldo tidak mencukupi' },
        { status: 400 }
      )
    }

    // Execute transfer in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create transfer record
      const transfer = await tx.walletTransfer.create({
        data: {
          senderId,
          receiverId,
          amount,
          reason: reason || null,
          status: 'completed',
        },
      })

      // Create debit transaction for sender
      const senderTransaction = await tx.walletTransaction.create({
        data: {
          walletId: senderWallet!.id,
          type: 'debit',
          amount,
          category: 'transfer',
          description: reason
            ? `Transfer ke ${receiver.name}: ${reason}`
            : `Transfer ke ${receiver.name}`,
          referenceId: transfer.id,
        },
      })

      // Create credit transaction for receiver
      const receiverTransaction = await tx.walletTransaction.create({
        data: {
          walletId: receiverWallet!.id,
          type: 'credit',
          amount,
          category: 'transfer',
          description: reason
            ? `Transfer dari ${sender.name}: ${reason}`
            : `Transfer dari ${sender.name}`,
          referenceId: transfer.id,
        },
      })

      // Update sender wallet (debit)
      const updatedSenderWallet = await tx.wallet.update({
        where: { id: senderWallet!.id },
        data: {
          balance: { decrement: amount },
          totalOut: { increment: amount },
        },
      })

      // Update receiver wallet (credit)
      const updatedReceiverWallet = await tx.wallet.update({
        where: { id: receiverWallet!.id },
        data: {
          balance: { increment: amount },
          totalIn: { increment: amount },
        },
      })

      return {
        transfer,
        senderTransaction,
        receiverTransaction,
        updatedSenderWallet,
        updatedReceiverWallet,
      }
    })

    return NextResponse.json({
      success: true,
      transfer: result.transfer,
    })
  } catch (error) {
    console.error('[Wallet Transfer POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
