import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/** Hash a PIN string with SHA-256 */
function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
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

// ─────────────────────────────────────────────
// POST /api/player-auth — Signup / Register
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, gender, pin } = body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama wajib diisi' },
        { status: 400 }
      );
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nomor HP wajib diisi' },
        { status: 400 }
      );
    }
    if (!gender || !['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { success: false, error: 'Gender harus "male" atau "female"' },
        { status: 400 }
      );
    }
    if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN harus 4-6 digit angka' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.trim();
    const normalizedName = name.trim();
    const hashedPin = hashPin(pin);

    // 2. Check if a user with this phone number already exists
    const existingByPhone = await db.user.findFirst({
      where: { phone: normalizedPhone },
    });

    if (existingByPhone) {
      // 3a. If they already have a playerPin → already registered
      if (existingByPhone.playerPin) {
        return NextResponse.json(
          { success: false, error: 'Akun sudah terdaftar. Silakan login.' },
          { status: 409 }
        );
      }

      // 3b. Admin created them but they have no PIN — set the PIN now
      const updatedUser = await db.user.update({
        where: { id: existingByPhone.id },
        data: { playerPin: hashedPin },
      });

      // Ensure they have a Ranking record
      const existingRanking = await db.ranking.findUnique({
        where: { userId: updatedUser.id },
      });
      if (!existingRanking) {
        await db.ranking.create({
          data: {
            id: uuidv4(),
            userId: updatedUser.id,
            points: 0,
            wins: 0,
            losses: 0,
          },
        });
      }

      // Ensure they have a Wallet record
      const existingWallet = await db.wallet.findUnique({
        where: { userId: updatedUser.id },
      });
      if (!existingWallet) {
        await db.wallet.create({
          data: {
            id: uuidv4(),
            userId: updatedUser.id,
            balance: 0,
            totalIn: 0,
            totalOut: 0,
          },
        });
      }

      return NextResponse.json({
        success: true,
        user: userResponseData(updatedUser),
        isNewLink: true,
        isNewAccount: false,
      });
    }

    // 4. User doesn't exist by phone — check by name + gender (admin may have created them)
    // SQLite doesn't support mode: 'insensitive', so we fetch by gender and filter in JS
    const usersWithSameGender = await db.user.findMany({
      where: { gender, isAdmin: false },
    });
    const existingByName = usersWithSameGender.find(
      (u) => u.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );

    if (existingByName) {
      // Link to that account by setting phone + playerPin
      const updatedUser = await db.user.update({
        where: { id: existingByName.id },
        data: {
          phone: normalizedPhone,
          playerPin: hashedPin,
        },
      });

      // Ensure they have a Ranking record
      const existingRanking = await db.ranking.findUnique({
        where: { userId: updatedUser.id },
      });
      if (!existingRanking) {
        await db.ranking.create({
          data: {
            id: uuidv4(),
            userId: updatedUser.id,
            points: 0,
            wins: 0,
            losses: 0,
          },
        });
      }

      // Ensure they have a Wallet record
      const existingWallet = await db.wallet.findUnique({
        where: { userId: updatedUser.id },
      });
      if (!existingWallet) {
        await db.wallet.create({
          data: {
            id: uuidv4(),
            userId: updatedUser.id,
            balance: 0,
            totalIn: 0,
            totalOut: 0,
          },
        });
      }

      return NextResponse.json({
        success: true,
        user: userResponseData(updatedUser),
        isNewLink: true,
        isNewAccount: false,
      });
    }

    // 5. No existing user found — create a brand new account
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

    // Create Wallet record
    await db.wallet.create({
      data: {
        id: uuidv4(),
        userId: newUser.id,
        balance: 0,
        totalIn: 0,
        totalOut: 0,
      },
    });

    return NextResponse.json({
      success: true,
      user: userResponseData(newUser),
      isNewLink: false,
      isNewAccount: true,
    });
  } catch (error) {
    console.error('[Player Auth] Signup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat mendaftar',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// PUT /api/player-auth — Login
// ─────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    // 1. Validate required fields
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nomor HP wajib diisi' },
        { status: 400 }
      );
    }
    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { success: false, error: 'PIN wajib diisi' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.trim();

    // 2. Find user by phone where isAdmin: false
    const user = await db.user.findFirst({
      where: {
        phone: normalizedPhone,
        isAdmin: false,
      },
    });

    // 3. If not found
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Nomor HP tidak terdaftar' },
        { status: 404 }
      );
    }

    // 4. If found but no playerPin
    if (!user.playerPin) {
      return NextResponse.json(
        { success: false, error: 'Akun belum memiliki PIN. Silakan daftar terlebih dahulu.' },
        { status: 403 }
      );
    }

    // 5. Hash the provided PIN and compare
    const hashedPin = hashPin(pin);

    // 6-7. Compare
    if (hashedPin !== user.playerPin) {
      return NextResponse.json(
        { success: false, error: 'PIN salah' },
        { status: 401 }
      );
    }

    // Success
    return NextResponse.json({
      success: true,
      user: userResponseData(user),
      isNewLink: false,
      isNewAccount: false,
    });
  } catch (error) {
    console.error('[Player Auth] Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat login',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
