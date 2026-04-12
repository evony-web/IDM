import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { ensureWallet } from '@/lib/wallet-utils'

/** Hash a PIN string with SHA-256 */
function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex')
}

/**
 * Normalize Indonesian phone number to local format (08xxxxxxxxxx)
 */
function normalizePhone(phone: string): string {
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

// ═══════════════════════════════════════════════════════════════════════
// POST /api/wallet/setup-pin
// Set PIN for a player who has an auto-created account but no PIN yet.
// This is the "Aktivasi PIN" flow — separate from full signup.
//
// Flow:
// 1. Player enters their name + phone + new PIN
// 2. System finds matching user (by phone first, then by name+gender)
// 3. If user has no PIN → set PIN, return user data for auto-login
// 4. If user already has PIN → reject (tell them to login instead)
// 5. If no user found → reject (tell them to register via full signup)
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, gender, pin } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama wajib diisi' },
        { status: 400 }
      )
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nomor HP wajib diisi' },
        { status: 400 }
      )
    }
    if (!gender || !['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { success: false, error: 'Gender harus "male" atau "female"' },
        { status: 400 }
      )
    }
    if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN harus 4-6 digit angka' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhone(phone)
    const normalizedName = name.trim()
    const hashedPin = hashPin(pin)

    // Validate normalized phone format
    if (!/^08\d{8,11}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Format nomor HP tidak valid. Gunakan format 08xxxxxxxxxx' },
        { status: 400 }
      )
    }

    // ── Step 1: Try to find user by phone number ──
    let matchedUser = await db.user.findFirst({
      where: { phone: normalizedPhone, isAdmin: false },
    })

    // ── Step 2: If not found by phone, try by name + gender (case-insensitive) ──
    if (!matchedUser) {
      const usersWithSameGender = await db.user.findMany({
        where: { gender, isAdmin: false },
      })
      matchedUser = usersWithSameGender.find(
        (u) => u.name.trim().toLowerCase() === normalizedName.toLowerCase()
      ) || null
    }

    // ── Step 3: If no user found at all ──
    if (!matchedUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akun tidak ditemukan. Pastikan nama dan nomor HP sesuai dengan data pendaftaran turnamen, atau daftar akun baru.',
          errorCode: 'USER_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    // ── Step 4: If user already has PIN → tell them to login ──
    if (matchedUser.playerPin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akun sudah memiliki PIN. Silakan masuk dengan nomor HP dan PIN Anda.',
          errorCode: 'PIN_ALREADY_SET',
        },
        { status: 409 }
      )
    }

    // ── Step 5: Set PIN and update phone if missing ──
    const updateData: { playerPin: string; phone?: string } = {
      playerPin: hashedPin,
    }

    // Set phone if user doesn't have one
    if (!matchedUser.phone) {
      updateData.phone = normalizedPhone
    }

    const updatedUser = await db.user.update({
      where: { id: matchedUser.id },
      data: updateData,
    })

    // Ensure wallet exists (should already from auto-create, but just in case)
    await ensureWallet(updatedUser.id, updatedUser.points || 0)

    console.log(`[Setup PIN] PIN set for user ${updatedUser.name} (${updatedUser.id})`)

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone || normalizedPhone,
        gender: updatedUser.gender,
        tier: updatedUser.tier,
        points: updatedUser.points,
        avatar: updatedUser.avatar,
        eloRating: updatedUser.eloRating,
        eloTier: updatedUser.eloTier,
        clubId: updatedUser.clubId,
      },
      message: 'PIN berhasil dibuat! Anda bisa masuk sekarang.',
    })
  } catch (error) {
    console.error('[Setup PIN] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan. Coba lagi.' },
      { status: 500 }
    )
  }
}
