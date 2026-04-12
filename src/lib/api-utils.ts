import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// ═══════════════════════════════════════════════════════════════════════
// Shared API error handling utilities
// ═══════════════════════════════════════════════════════════════════════

/**
 * Standard error codes used across the application.
 * These provide machine-readable error identifiers for the frontend.
 */
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  SELF_TRANSFER: 'SELF_TRANSFER',
  AMOUNT_TOO_LARGE: 'AMOUNT_TOO_LARGE',
  AMOUNT_TOO_SMALL: 'AMOUNT_TOO_SMALL',
  FIELD_TOO_LONG: 'FIELD_TOO_LONG',

  // Conflict
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',
  PIN_ALREADY_SET: 'PIN_ALREADY_SET',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',

  // Not found
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DB_ERROR: 'DB_ERROR',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Build a standard error response.
 */
export function apiError(
  message: string,
  code: ErrorCode,
  status: number = 400,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errorCode: code,
      ...extra,
    },
    { status }
  )
}

/**
 * Handle Prisma errors with user-friendly messages.
 * Converts database-level errors into consistent API responses.
 */
export function handlePrismaError(error: unknown): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (error.meta?.target as string[])?.join(', ') || 'field'
        return apiError(
          `Data duplikat: ${target} sudah digunakan.`,
          ErrorCodes.DUPLICATE_NAME,
          409
        )
      }
      case 'P2025':
        // Record not found
        return apiError(
          'Data tidak ditemukan.',
          ErrorCodes.NOT_FOUND,
          404
        )
      case 'P2003':
        // Foreign key constraint
        return apiError(
          'Data referensi tidak valid.',
          ErrorCodes.VALIDATION_ERROR,
          400
        )
      default:
        console.error(`[Prisma Error] Code: ${error.code}`, error.meta)
        return apiError(
          'Terjadi kesalahan database. Coba lagi.',
          ErrorCodes.DB_ERROR,
          500
        )
    }
  }

  // Unknown error — don't leak internals
  console.error('[API Error]', error)
  return apiError(
    'Terjadi kesalahan. Coba lagi.',
    ErrorCodes.INTERNAL_ERROR,
    500
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Validation constants
// ═══════════════════════════════════════════════════════════════════════

/** Valid wallet transaction categories */
export const VALID_CATEGORIES = [
  'bounty_place',
  'bounty_claim',
  'prize',
  'topup',
  'withdraw',
  'sawer',
  'donation',
  'transfer',
] as const

export type ValidCategory = typeof VALID_CATEGORIES[number]

/** Maximum top-up amount (points) */
export const MAX_TOPUP_AMOUNT = 100000

/** Minimum transfer amount (points) */
export const MIN_TRANSFER_AMOUNT = 1

/** Maximum transfer amount (points) */
export const MAX_TRANSFER_AMOUNT = 100000

/** Maximum reason/description length */
export const MAX_REASON_LENGTH = 200

/**
 * Validate an amount value for wallet operations.
 * Returns an error message if invalid, null if valid.
 */
export function validateAmount(
  amount: unknown,
  min: number = 1,
  max: number = MAX_TOPUP_AMOUNT,
  fieldName: string = 'Jumlah'
): string | null {
  if (amount === undefined || amount === null) {
    return `${fieldName} wajib diisi`
  }
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `${fieldName} harus berupa angka`
  }
  if (amount < min) {
    return `${fieldName} minimal ${min.toLocaleString('id-ID')} poin`
  }
  if (amount > max) {
    return `${fieldName} maksimal ${max.toLocaleString('id-ID')} poin`
  }
  if (!Number.isFinite(amount)) {
    return `${fieldName} tidak valid`
  }
  return null
}

/**
 * Validate a category string against the whitelist.
 */
export function validateCategory(category: unknown): string | null {
  if (!category || typeof category !== 'string') {
    return 'Kategori tidak valid'
  }
  if (!VALID_CATEGORIES.includes(category as ValidCategory)) {
    return `Kategori "${category}" tidak valid. Kategori yang diizinkan: ${VALID_CATEGORIES.join(', ')}`
  }
  return null
}

/**
 * Validate a string field length.
 */
export function validateLength(
  value: unknown,
  maxLength: number,
  fieldName: string
): string | null {
  if (value && typeof value === 'string' && value.length > maxLength) {
    return `${fieldName} terlalu panjang (maks ${maxLength} karakter)`
  }
  return null
}

/**
 * Safely parse JSON from a request with error handling.
 */
export async function safeParseBody(request: NextRequest): Promise<{
  data: Record<string, unknown> | null
  error: NextResponse | null
}> {
  try {
    const data = await request.json()
    return { data, error: null }
  } catch {
    return {
      data: null,
      error: apiError('Format request tidak valid.', ErrorCodes.VALIDATION_ERROR, 400),
    }
  }
}
