import { createHash } from 'crypto'

/**
 * Shared authentication utilities.
 *
 * This is the SINGLE SOURCE OF TRUTH for PIN hashing and phone normalization.
 * Used by:
 *   - /src/lib/auth.ts (NextAuth credentials provider)
 *   - /src/app/api/player-auth/route.ts
 *   - /src/app/api/wallet/setup-pin/route.ts
 */

/** Hash a PIN string with SHA-256 */
export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex')
}

/**
 * Normalize Indonesian phone number to local format (08xxxxxxxxxx)
 *
 * Handles:
 *   +6281xxx → 081xxx  (international format with +)
 *   6281xxx  → 081xxx  (international format without +)
 *   081xxx   → 081xxx  (already local format, no change)
 *   81xxx    → 081xxx  (missing leading 0)
 */
export function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/[\s\-()]/g, '')

  if (p.startsWith('+62')) {
    p = '0' + p.slice(3)
  } else if (p.startsWith('62') && p.length >= 10) {
    p = '0' + p.slice(2)
  } else if (/^[1-9]/.test(p)) {
    p = '0' + p
  }

  return p
}
