import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePlayerAuth } from '@/lib/session'
import { ensureWallet } from '@/lib/wallet-utils'
import {
  apiError,
  ErrorCodes,
  validateAmount,
  validateLength,
  handlePrismaError,
  safeParseBody,
  MIN_TRANSFER_AMOUNT,
  MAX_TRANSFER_AMOUNT,
  MAX_REASON_LENGTH,
} from '@/lib/api-utils'

// ═══════════════════════════════════════════════════════════════════════
// POST /api/wallet/transfer
// Transfer points between users — requires authentication
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // Verify session — sender must be authenticated
    const session = await requirePlayerAuth()
    if (!session) {
      return apiError('Akses ditolak. Silakan login terlebih dahulu.', ErrorCodes.UNAUTHORIZED, 401)
    }

    // Safely parse request body
    const { data: body, error: parseError } = await safeParseBody(request)
    if (parseError || !body) return parseError!

    const { receiverId, amount, reason } = body

    // Sender is always the authenticated user — ignore any senderId from request body
    const senderId = session.user.id

    // ── Validation ──
    if (!receiverId || typeof receiverId !== 'string') {
      return apiError('ID penerima wajib diisi.', ErrorCodes.VALIDATION_ERROR, 400)
    }

    const amountError = validateAmount(amount, MIN_TRANSFER_AMOUNT, MAX_TRANSFER_AMOUNT, 'Jumlah transfer')
    if (amountError) {
      return apiError(amountError, ErrorCodes.INVALID_AMOUNT, 400)
    }

    const reasonError = validateLength(reason, MAX_REASON_LENGTH, 'Alasan')
    if (reasonError) {
      return apiError(reasonError, ErrorCodes.FIELD_TOO_LONG, 400)
    }

    // Cannot transfer to self
    if (senderId === receiverId) {
      return apiError('Tidak dapat transfer ke diri sendiri.', ErrorCodes.SELF_TRANSFER, 400)
    }

    // Verify both users exist
    const [sender, receiver] = await Promise.all([
      db.user.findUnique({ where: { id: senderId } }),
      db.user.findUnique({ where: { id: receiverId } }),
    ])

    if (!sender) {
      return apiError('Akun pengirim tidak ditemukan.', ErrorCodes.USER_NOT_FOUND, 404)
    }

    if (!receiver) {
      return apiError('Penerima tidak ditemukan.', ErrorCodes.USER_NOT_FOUND, 404)
    }

    // Auto-create wallets if not exists — uses shared utility
    const senderWallet = await ensureWallet(senderId, sender.points || 0)
    const receiverWallet = await ensureWallet(receiverId, receiver.points || 0)

    // Execute transfer in a transaction (balance check INSIDE to prevent race condition)
    const transferAmount = amount as number
    const transferReason = (reason as string) || null

    const result = await db.$transaction(async (tx) => {
      // Re-read sender wallet inside transaction to get latest balance
      const currentSenderWallet = await tx.wallet.findUnique({
        where: { id: senderWallet.id },
      })

      if (!currentSenderWallet) {
        throw new Error('SENDER_WALLET_NOT_FOUND')
      }

      // Check sufficient balance (inside transaction — prevents race condition)
      if (currentSenderWallet.balance < transferAmount) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      // Create transfer record
      const transfer = await tx.walletTransfer.create({
        data: {
          senderId,
          receiverId,
          amount: transferAmount,
          reason: transferReason,
          status: 'completed',
        },
      })

      // Create debit transaction for sender
      await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          type: 'debit',
          amount: transferAmount,
          category: 'transfer',
          description: transferReason
            ? `Transfer ke ${receiver.name}: ${transferReason}`
            : `Transfer ke ${receiver.name}`,
          referenceId: transfer.id,
        },
      })

      // Create credit transaction for receiver
      await tx.walletTransaction.create({
        data: {
          walletId: receiverWallet.id,
          type: 'credit',
          amount: transferAmount,
          category: 'transfer',
          description: transferReason
            ? `Transfer dari ${sender.name}: ${transferReason}`
            : `Transfer dari ${sender.name}`,
          referenceId: transfer.id,
        },
      })

      // Update sender wallet (debit)
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: { decrement: transferAmount },
          totalOut: { increment: transferAmount },
        },
      })

      // Update receiver wallet (credit)
      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: {
          balance: { increment: transferAmount },
          totalIn: { increment: transferAmount },
        },
      })

      return { transfer, senderBalance: currentSenderWallet.balance - transferAmount }
    })

    return NextResponse.json({
      success: true,
      transfer: result.transfer,
      senderBalance: result.senderBalance,
    })
  } catch (error) {
    // Handle custom business-logic errors thrown inside transaction
    if (error instanceof Error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        const senderWallet = await db.wallet.findUnique({ where: { userId: session.user.id } })
        return apiError(
          `Saldo tidak mencukupi. Saldo Anda: ${(senderWallet?.balance ?? 0).toLocaleString('id-ID')} poin.`,
          ErrorCodes.INSUFFICIENT_BALANCE,
          400
        )
      }
      if (error.message === 'SENDER_WALLET_NOT_FOUND') {
        return apiError('Wallet pengirim tidak ditemukan.', ErrorCodes.USER_NOT_FOUND, 404)
      }
    }
    return handlePrismaError(error)
  }
}
