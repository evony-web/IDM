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

    // Check sufficient balance
    if (senderWallet.balance < (amount as number)) {
      return apiError(
        `Saldo tidak mencukupi. Saldo Anda: ${senderWallet.balance.toLocaleString('id-ID')} poin.`,
        ErrorCodes.INSUFFICIENT_BALANCE,
        400
      )
    }

    // Execute transfer in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create transfer record
      const transfer = await tx.walletTransfer.create({
        data: {
          senderId,
          receiverId,
          amount: amount as number,
          reason: (reason as string) || null,
          status: 'completed',
        },
      })

      // Create debit transaction for sender
      await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          type: 'debit',
          amount: amount as number,
          category: 'transfer',
          description: reason
            ? `Transfer ke ${receiver.name}: ${reason}`
            : `Transfer ke ${receiver.name}`,
          referenceId: transfer.id,
        },
      })

      // Create credit transaction for receiver
      await tx.walletTransaction.create({
        data: {
          walletId: receiverWallet.id,
          type: 'credit',
          amount: amount as number,
          category: 'transfer',
          description: reason
            ? `Transfer dari ${sender.name}: ${reason}`
            : `Transfer dari ${sender.name}`,
          referenceId: transfer.id,
        },
      })

      // Update sender wallet (debit)
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: { decrement: amount as number },
          totalOut: { increment: amount as number },
        },
      })

      // Update receiver wallet (credit)
      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: {
          balance: { increment: amount as number },
          totalIn: { increment: amount as number },
        },
      })

      return { transfer }
    })

    return NextResponse.json({
      success: true,
      transfer: result.transfer,
    })
  } catch (error) {
    return handlePrismaError(error)
  }
}
