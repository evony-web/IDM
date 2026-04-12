import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { uploadBase64ToCloudinary } from '@/lib/server-utils';
import { ensureWallet } from '@/lib/wallet-utils';

/** Process avatar: upload base64 to Cloudinary, pass through URLs, return null for empty */
async function processAvatar(avatar: string | null | undefined): Promise<string | null> {
  if (!avatar || avatar.trim().length === 0) return null;
  if (avatar.startsWith('https://res.cloudinary.com')) return avatar;
  if (avatar.startsWith('data:image/')) {
    const result = await uploadBase64ToCloudinary(avatar, 'idm/avatars', {
      maxWidth: 512,
      maxHeight: 512,
      quality: 'auto:good',
    });
    if (result) return result.url;
    // Upload failed — return undefined sentinel so caller knows NOT to overwrite
    // We use a special marker to distinguish "don't update" from "clear avatar"
    return '__UPLOAD_FAILED__' as unknown as null;
  }
  return null; // unknown format
}

// GET - Get all users or specific user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const gender = searchParams.get('gender');
    const tier = searchParams.get('tier');

    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          rankings: true,
          teamMembers: {
            include: {
              team: true,
            },
          },
        },
      });
      return NextResponse.json({ success: true, user });
    }

    const where: Record<string, string | boolean> = {};
    if (gender) where.gender = gender;
    if (tier) where.tier = tier;
    where.isAdmin = false;

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        tier: true,
        avatar: true,
        points: true,
        city: true,
        isMVP: true,
        mvpScore: true,
        clubId: true,
        eloRating: true,
        eloTier: true,
        rankings: true,
        club: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
      orderBy: {
        points: 'desc',
      },
    });

    // Also fetch MVP user if they're an admin (not included in regular list)
    const mvpUser = await db.user.findFirst({
      where: { isMVP: true, isAdmin: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        tier: true,
        avatar: true,
        points: true,
        city: true,
        isMVP: true,
        mvpScore: true,
        clubId: true,
        rankings: true,
        club: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    let finalUsers = users;
    if (mvpUser && (!gender || mvpUser.gender === gender)) {
      const mvpInList = users.find(u => u.id === mvpUser.id);
      if (!mvpInList) {
        finalUsers = [...users, mvpUser];
        finalUsers.sort((a, b) => b.points - a.points);
      }
    }

    return NextResponse.json({ success: true, users: finalUsers });
  } catch (error) {
    console.error('[Users API] Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Create new user (registration)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, gender, discordId, avatar, city, club, whatsappJid } = body;

    if (avatar && avatar.length > 1.4 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Ukuran gambar terlalu besar. Maksimal 1MB.' },
        { status: 400 }
      );
    }

    const normalizedName = name.trim().toLowerCase();
    const normalizedPhone = phone ? phone.trim() : null;
    const normalizedJid = whatsappJid ? whatsappJid.trim() : null;

    // Check by WhatsApp JID first
    if (normalizedJid) {
      const existingByJid = await db.user.findFirst({
        where: { whatsappJid: normalizedJid },
      });
      if (existingByJid) {
        // Ensure wallet exists for existing user
        await ensureWallet(existingByJid.id, existingByJid.points || 0);

        const updateData: Record<string, string | null> = {};
        if (avatar) updateData.avatar = await processAvatar(avatar);
        if (city !== undefined) updateData.city = city || null;
        if (club) {
          const clubSlug = club.trim().toLowerCase().replace(/\s+/g, '-');
          let clubRecord = await db.club.findUnique({ where: { slug: clubSlug } });
          if (!clubRecord) {
            clubRecord = await db.club.create({ data: { name: club.trim(), slug: clubSlug } });
          }
          updateData.clubId = clubRecord.id;
        }
        if (Object.keys(updateData).length > 0) {
          const updated = await db.user.update({
            where: { id: existingByJid.id },
            data: updateData,
          });
          return NextResponse.json(
            { success: true, user: updated, isExisting: true },
            { status: 200 }
          );
        }
        return NextResponse.json(
          { success: true, user: existingByJid, isExisting: true },
          { status: 200 }
        );
      }
    }

    // Check by phone number
    if (normalizedPhone) {
      const existingByPhone = await db.user.findFirst({
        where: { phone: normalizedPhone },
      });
      if (existingByPhone) {
        // Ensure wallet exists for existing user
        await ensureWallet(existingByPhone.id, existingByPhone.points || 0);

        const updateData: Record<string, string | null> = {};
        if (normalizedJid && !existingByPhone.whatsappJid) {
          updateData.whatsappJid = normalizedJid;
        }
        if (avatar) updateData.avatar = await processAvatar(avatar);
        if (city !== undefined) updateData.city = city || null;
        if (club) {
          const clubSlug = club.trim().toLowerCase().replace(/\s+/g, '-');
          let clubRecord = await db.club.findUnique({ where: { slug: clubSlug } });
          if (!clubRecord) {
            clubRecord = await db.club.create({ data: { name: club.trim(), slug: clubSlug } });
          }
          updateData.clubId = clubRecord.id;
        }
        if (Object.keys(updateData).length > 0) {
          const updated = await db.user.update({
            where: { id: existingByPhone.id },
            data: updateData,
          });
          return NextResponse.json(
            { success: true, user: updated, isExisting: true },
            { status: 200 }
          );
        }
        return NextResponse.json(
          { success: true, user: existingByPhone, isExisting: true },
          { status: 200 }
        );
      }
    }

    // Check by name in same division
    const existingUsers = await db.user.findMany({
      where: { gender: gender || 'male' },
    });

    let existingByName = existingUsers.find(
      (u) => u.name.trim().toLowerCase() === normalizedName
    );

    if (existingByName) {
      // Ensure wallet exists for existing user
      await ensureWallet(existingByName.id, existingByName.points || 0);

      const updateData: Record<string, string | null> = {};
      if (normalizedJid && !existingByName.whatsappJid) {
        updateData.whatsappJid = normalizedJid;
      }
      if (normalizedPhone && !existingByName.phone) {
        updateData.phone = normalizedPhone;
      }
      if (avatar) updateData.avatar = await processAvatar(avatar);
      if (city !== undefined) updateData.city = city || null;
      if (club) {
        const clubSlug = club.trim().toLowerCase().replace(/\s+/g, '-');
        let clubRecord = await db.club.findUnique({ where: { slug: clubSlug } });
        if (!clubRecord) {
          clubRecord = await db.club.create({ data: { name: club.trim(), slug: clubSlug } });
        }
        updateData.clubId = clubRecord.id;
      }
      
      if (Object.keys(updateData).length > 0) {
        const updated = await db.user.update({
          where: { id: existingByName.id },
          data: updateData,
        });
        return NextResponse.json(
          { success: true, user: updated, isExisting: true },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { success: true, user: existingByName, isExisting: true },
        { status: 200 }
      );
    }

    // Resolve club if provided
    let clubId: string | null = null;
    if (club && typeof club === 'string' && club.trim().length >= 2) {
      const clubSlug = club.trim().toLowerCase().replace(/\s+/g, '-');
      let clubRecord = await db.club.findUnique({ where: { slug: clubSlug } });
      if (!clubRecord) {
        clubRecord = await db.club.create({
          data: { name: club.trim(), slug: clubSlug },
        });
      }
      clubId = clubRecord.id;
    }

    const user = await db.user.create({
      data: {
        id: uuidv4(),
        name,
        email: phone ? `${phone}@phone.local` : `user-${Date.now()}@local`,
        gender: gender || 'male',
        tier: 'B',
        phone: phone || null,
        whatsappJid: normalizedJid || null,
        discordId: discordId || null,
        avatar: avatar ? await processAvatar(avatar) : null,
        city: city || null,
        points: 0,
        isAdmin: false,
        clubId,
      },
    });

    // Create initial ranking
    await db.ranking.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        points: 0,
        wins: 0,
        losses: 0,
      },
    });

    // ═══ Auto-create wallet for new player ═══
    // Every new player gets a wallet immediately so they can receive
    // tournament prizes without needing a separate wallet signup step
    await ensureWallet(user.id, 0);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length');
    const maxSize = 2 * 1024 * 1024;
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Ukuran request terlalu besar.' },
        { status: 413 }
      );
    }
    
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Gagal memparse request body.' },
        { status: 400 }
      );
    }
    
    const { userId, tier, points, isMVP, name, avatar, city, phone, club, whatsappJid, clearAvatar } = body;
    
    if (avatar && typeof avatar === 'string' && avatar.length > 500 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Ukuran avatar terlalu besar.' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId diperlukan' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate name uniqueness if name is being changed
    if (name && name.trim().toLowerCase() !== existingUser.name.trim().toLowerCase()) {
      const normalizedName = name.trim().toLowerCase();
      const existingGender = existingUser.gender;
      // Check for duplicate name in same division (case-insensitive)
      const usersInSameDivision = await db.user.findMany({
        where: { gender: existingGender },
        select: { id: true, name: true },
      });
      const duplicate = usersInSameDivision.find(
        (u) => u.id !== userId && u.name.trim().toLowerCase() === normalizedName
      );
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `Nama "${name}" sudah digunakan oleh pemain lain di divisi yang sama. Gunakan nama yang berbeda atau tambahkan penanda (misal: "${name} 2").`,
            errorCode: 'DUPLICATE_NAME',
          },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, string | number | boolean | undefined | null> = {};
    if (tier) updateData.tier = tier;
    if (points !== undefined) updateData.points = points;
    if (isMVP !== undefined) updateData.isMVP = isMVP;
    if (name) updateData.name = name;
    if (avatar !== undefined) {
      const processedAvatar = await processAvatar(avatar);
      // If upload failed, don't overwrite the existing avatar
      if (processedAvatar !== '__UPLOAD_FAILED__' as unknown as null) {
        updateData.avatar = processedAvatar;
      }
      // If upload failed and avatar was a base64 data URL, return error
      if (processedAvatar === '__UPLOAD_FAILED__' as unknown as null) {
        return NextResponse.json(
          { success: false, error: 'Gagal mengupload avatar ke Cloudinary. Coba lagi.' },
          { status: 500 }
        );
      }
    }
    if (clearAvatar) updateData.avatar = null;
    if (city !== undefined) updateData.city = city || null;
    if (phone) updateData.phone = phone;
    if (whatsappJid) updateData.whatsappJid = whatsappJid;
    
    // Track club transfer for activity log
    let clubTransferFrom: string | null = null;
    let clubTransferTo: string | null = null;

    if (club !== undefined) {
      // Get current club name before change
      if (existingUser.clubId) {
        const oldClub = await db.club.findUnique({ where: { id: existingUser.clubId } });
        clubTransferFrom = oldClub?.name || null;
      }
      if (club === null || club === '') {
        updateData.clubId = null;
        clubTransferTo = null;
      } else {
        const slug = (club as string).trim().toLowerCase().replace(/\s+/g, '-');
        let clubRecord = await db.club.findUnique({ where: { slug } });
        if (!clubRecord) {
          clubRecord = await db.club.create({ data: { name: (club as string).trim(), slug } });
        }
        updateData.clubId = clubRecord.id;
        clubTransferTo = clubRecord.name;
      }
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Log club transfer activity
    if (club !== undefined && clubTransferFrom !== clubTransferTo && (clubTransferFrom || clubTransferTo)) {
      try {
        await db.activityLog.create({
          data: {
            action: 'club_transfer',
            details: JSON.stringify({
              from: clubTransferFrom,
              to: clubTransferTo,
              playerName: existingUser.name,
            }),
            userId,
          },
        });
      } catch (e) {
        // Non-critical, don't fail the update
        console.warn('[Users PUT] Failed to log club transfer activity:', e);
      }
    }

    if (points !== undefined) {
      const existingRanking = await db.ranking.findUnique({ where: { userId } });
      if (existingRanking) {
        await db.ranking.update({
          where: { userId },
          data: { points },
        });
      } else {
        await db.ranking.create({
          data: {
            id: uuidv4(),
            userId,
            points,
            wins: 0,
            losses: 0,
          },
        });
      }
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('[Users PUT] Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengupdate user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID diperlukan' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ 
      where: { id: userId },
      include: { 
        rankings: true,
        teamMembers: true,
      }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    if (existingUser.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat menghapus admin' },
        { status: 403 }
      );
    }

    if (existingUser.rankings) {
      await db.ranking.deleteMany({ where: { userId } });
    }
    
    await db.teamMember.deleteMany({ where: { userId } });
    await db.registration.deleteMany({ where: { userId } });
    await db.match.updateMany({
      where: { mvpId: userId },
      data: { mvpId: null },
    });
    await db.playerMatchStat.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ 
      success: true, 
      message: `User "${existingUser.name}" berhasil dihapus` 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus user' },
      { status: 500 }
    );
  }
}
