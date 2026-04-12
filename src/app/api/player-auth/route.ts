import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ensureWallet } from '@/lib/wallet-utils';
import { apiError, ErrorCodes, handlePrismaError, safeParseBody, validateLength } from '@/lib/api-utils';

/** Hash a PIN string with SHA-256 */
function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

/**
 * Normalize Indonesian phone number to local format (08xxxxxxxxxx)
 * Handles: +6281xxx → 081xxx, 6281xxx → 081xxx, 081xxx → 081xxx
 * This ensures consistent matching regardless of input format.
 */
function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/[\s\-()]/g, ''); // remove spaces, dashes, parens

  // +6281xxx → 081xxx (international format with +)
  if (p.startsWith('+62')) {
    p = '0' + p.slice(3);
  }
  // 6281xxx → 081xxx (international format without +)
  else if (p.startsWith('62') && p.length >= 10) {
    p = '0' + p.slice(2);
  }
  // 081xxx → 081xxx (already local format, no change)
  // 81xxx → 081xxx (missing leading 0)
  else if (/^[1-9]/.test(p)) {
    p = '0' + p;
  }

  return p;
}

/** Shape of user data returned in responses */
function userResponseData(user: {
  id: string;
  name: string;
  phone: string | null;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  eloRating: number;
  eloTier: string;
  clubId: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    gender: user.gender,
    tier: user.tier,
    points: user.points,
    avatar: user.avatar,
    eloRating: user.eloRating,
    eloTier: user.eloTier,
    clubId: user.clubId,
  };
}

/**
 * Ensure a user has a Ranking record and a Wallet (synced with User.points)
 */
async function ensureUserRecords(userId: string, userPoints: number) {
  // Ensure Ranking record
  const existingRanking = await db.ranking.findUnique({ where: { userId } });
  if (!existingRanking) {
    await db.ranking.create({
      data: {
        id: uuidv4(),
        userId,
        points: 0,
        wins: 0,
        losses: 0,
      },
    });
  }

  // Ensure Wallet record — uses shared utility
  await ensureWallet(userId, userPoints);
}

// ─────────────────────────────────────────────
// POST /api/player-auth — Signup / Register
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { data: body, error: parseError } = await safeParseBody(request);
    if (parseError || !body) return parseError!;
    const { name, phone, gender, pin } = body as Record<string, string>;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return apiError('Nama wajib diisi.', ErrorCodes.VALIDATION_ERROR, 400);
    }
    const nameLenError = validateLength(name, 50, 'Nama');
    if (nameLenError) return apiError(nameLenError, ErrorCodes.FIELD_TOO_LONG, 400);
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return apiError('Nomor HP wajib diisi.', ErrorCodes.VALIDATION_ERROR, 400);
    }
    if (!gender || !['male', 'female'].includes(gender)) {
      return apiError('Gender harus "male" atau "female".', ErrorCodes.VALIDATION_ERROR, 400);
    }
    if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
      return apiError('PIN harus 4-6 digit angka.', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const normalizedPhone = normalizePhone(phone);
    const normalizedName = name.trim();
    const hashedPin = hashPin(pin);

    // Validate normalized phone format (must start with 08 and be 10-13 digits)
    if (!/^08\d{8,11}$/.test(normalizedPhone)) {
      return apiError('Format nomor HP tidak valid. Gunakan format 08xxxxxxxxxx.', ErrorCodes.VALIDATION_ERROR, 400);
    }

    // 2. Check if a user with this phone number already exists (exact match, normalized)
    const existingByPhone = await db.user.findFirst({
      where: { phone: normalizedPhone },
    });

    if (existingByPhone) {
      // If user is admin, they can't sign up as player
      if (existingByPhone.isAdmin) {
        return apiError('Nomor HP terdaftar sebagai admin. Gunakan nomor HP lain.', ErrorCodes.FORBIDDEN, 409);
      }

      // If they already have a playerPin → already registered
      if (existingByPhone.playerPin) {
        return apiError('Akun sudah terdaftar. Silakan login.', ErrorCodes.PIN_ALREADY_SET, 409);
      }

      // Admin created them but they have no PIN — set the PIN now
      const updatedUser = await db.user.update({
        where: { id: existingByPhone.id },
        data: { playerPin: hashedPin },
      });

      // Ensure they have Ranking + Wallet (synced with points)
      await ensureUserRecords(updatedUser.id, updatedUser.points);

      return NextResponse.json({
        success: true,
        user: userResponseData(updatedUser),
        isNewLink: true,
        isNewAccount: false,
      });
    }

    // 3. User doesn't exist by phone — check by name + gender (admin may have created them)
    // Case-insensitive name matching, EXCLUDE admin users
    const usersWithSameGender = await db.user.findMany({
      where: { gender, isAdmin: false },
    });
    const existingByName = usersWithSameGender.find(
      (u) => u.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );

    if (existingByName) {
      // Check if this user already has a phone + PIN (already claimed by someone else)
      if (existingByName.phone && existingByName.playerPin) {
        // This name is already claimed by another player with a different phone
        // Don't link — create a new account instead
        // (This handles the case where two people have the same name)
      } else {
        // Link to that account by setting phone + playerPin
        const updatedUser = await db.user.update({
          where: { id: existingByName.id },
          data: {
            phone: normalizedPhone,
            playerPin: hashedPin,
          },
        });

        // Ensure they have Ranking + Wallet (synced with points)
        await ensureUserRecords(updatedUser.id, updatedUser.points);

        return NextResponse.json({
          success: true,
          user: userResponseData(updatedUser),
          isNewLink: true,
          isNewAccount: false,
        });
      }
    }

    // 4. No existing user found — create a brand new account
    const newUser = await db.user.create({
      data: {
        id: uuidv4(),
        name: normalizedName,
        email: `${normalizedPhone}@phone.local`,
        gender,
        tier: 'B',
        points: 0,
        phone: normalizedPhone,
        isAdmin: false,
        playerPin: hashedPin,
      },
    });

    // Create Ranking record
    await db.ranking.create({
      data: {
        id: uuidv4(),
        userId: newUser.id,
        points: 0,
        wins: 0,
        losses: 0,
      },
    });

    // Create Wallet record — uses shared utility
    await ensureWallet(newUser.id, 0);

    return NextResponse.json({
      success: true,
      user: userResponseData(newUser),
      isNewLink: false,
      isNewAccount: true,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}

// ─────────────────────────────────────────────
// PUT /api/player-auth — Login
// ─────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const { data: body, error: parseError } = await safeParseBody(request);
    if (parseError || !body) return parseError!;
    const { phone, pin } = body as Record<string, string>;

    // 1. Validate required fields
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return apiError('Nomor HP wajib diisi.', ErrorCodes.VALIDATION_ERROR, 400);
    }
    if (!pin || typeof pin !== 'string') {
      return apiError('PIN wajib diisi.', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const normalizedPhone = normalizePhone(phone);

    // 2. Find user by phone (exact match on normalized number) where isAdmin: false
    const user = await db.user.findFirst({
      where: {
        phone: normalizedPhone,
        isAdmin: false,
      },
    });

    // 3. If not found with exact phone, try all phone numbers and normalize in JS
    // This handles the case where existing phones are stored in +62 format
    let matchedUser = user;
    if (!matchedUser) {
      const allPlayerUsers = await db.user.findMany({
        where: { isAdmin: false, phone: { not: null } },
      });
      matchedUser = allPlayerUsers.find(u => {
        if (!u.phone) return false;
        return normalizePhone(u.phone) === normalizedPhone;
      });
    }

    // 4. If still not found
    if (!matchedUser) {
      return apiError('Nomor HP tidak terdaftar.', ErrorCodes.USER_NOT_FOUND, 404);
    }

    // 5. If found but no playerPin
    if (!matchedUser.playerPin) {
      return apiError('Akun belum memiliki PIN. Silakan daftar terlebih dahulu.', ErrorCodes.FORBIDDEN, 403);
    }

    // 6. Hash the provided PIN and compare
    const hashedPin = hashPin(pin);

    // 7. Compare
    if (hashedPin !== matchedUser.playerPin) {
      return apiError('PIN salah.', ErrorCodes.UNAUTHORIZED, 401);
    }

    // 8. If the phone in DB is not normalized, fix it now
    if (matchedUser.phone !== normalizedPhone) {
      await db.user.update({
        where: { id: matchedUser.id },
        data: { phone: normalizedPhone },
      });
    }

    // Success
    return NextResponse.json({
      success: true,
      user: userResponseData(matchedUser),
      isNewLink: false,
      isNewAccount: false,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}
