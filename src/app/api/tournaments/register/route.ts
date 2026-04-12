import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { triggerRegistrationUpdate } from '@/lib/pusher';
import { requireAdmin } from '@/lib/admin-guard';

// POST - Register user for tournament
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tournamentId } = body;

    // Check if already registered
    const existing = await db.registration.findUnique({
      where: {
        userId_tournamentId: { userId, tournamentId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Already registered for this tournament' },
        { status: 400 }
      );
    }

    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ═══ Auto-create wallet if not exists ═══
    // Every player registering for a tournament gets a wallet automatically
    // so they can receive prize points without needing a separate wallet signup
    const existingWallet = await db.wallet.findUnique({ where: { userId } });
    if (!existingWallet) {
      const initialBalance = user.points || 0;
      const newWallet = await db.wallet.create({
        data: {
          userId,
          balance: initialBalance,
          totalIn: initialBalance,
          totalOut: 0,
        },
      });
      // Create sync transaction if player already has points
      if (initialBalance > 0) {
        await db.walletTransaction.create({
          data: {
            walletId: newWallet.id,
            type: 'credit',
            amount: initialBalance,
            category: 'prize',
            description: 'Sinkronisasi poin leaderboard ke wallet',
          },
        });
      }
      console.log(`[Tournament Register] Auto-created wallet for user ${user.name} (${userId})`);
    }

    // Create registration
    const registration = await db.registration.create({
      data: {
        id: uuidv4(),
        userId,
        tournamentId,
        status: 'pending',
        tierAssigned: user.tier,
      },
    });

    triggerRegistrationUpdate(tournamentId, { userId, userName: user.name, status: 'pending', tournamentId }).catch(() => {});

    return NextResponse.json({ success: true, registration });
  } catch (error) {
    console.error('Error registering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register' },
      { status: 500 }
    );
  }
}

// PUT - Approve/Reject registration (admin only)
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { registrationId, status, tierAssigned } = body;

    // First get the registration to check user's current tier
    const existingReg = await db.registration.findUnique({
      where: { id: registrationId },
      include: { user: true },
    });

    if (!existingReg) {
      return NextResponse.json(
        { success: false, error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Determine the new tier to assign
    const newTier = tierAssigned || existingReg.tierAssigned;

    // Always update user's tier if a different tier is being assigned
    if (newTier && existingReg.user.tier !== newTier) {
      await db.user.update({
        where: { id: existingReg.userId },
        data: { tier: newTier },
      });
    }

    // Always update registration's tierAssigned if it's different
    const tierChanged = newTier && existingReg.tierAssigned !== newTier;

    // Update registration status and tierAssigned
    const registration = await db.registration.update({
      where: { id: registrationId },
      data: {
        status,
        tierAssigned: newTier,
      },
      include: { user: true },
    });

    console.log('[Registration PUT] Updated:', {
      registrationId,
      oldUserTier: existingReg.user.tier,
      oldRegTier: existingReg.tierAssigned,
      newTier,
      tierChanged,
      status,
    });

    triggerRegistrationUpdate(registration.tournamentId, { userId: registration.userId, userName: registration.user.name, status, tournamentId: registration.tournamentId }).catch(() => {});

    return NextResponse.json({ success: true, registration });
  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update registration' },
      { status: 500 }
    );
  }
}

// DELETE - Remove registration permanently (admin only, for rejected/spam)
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('id');
    const deleteAllRejected = searchParams.get('deleteAllRejected');

    // Delete all rejected registrations for a tournament
    if (deleteAllRejected === 'true') {
      const tournamentId = searchParams.get('tournamentId');
      if (!tournamentId) {
        return NextResponse.json(
          { success: false, error: 'tournamentId required' },
          { status: 400 }
        );
      }

      const result = await db.registration.deleteMany({
        where: {
          tournamentId,
          status: 'rejected',
        },
      });

      return NextResponse.json({
        success: true,
        message: `${result.count} pendaftaran ditolak telah dihapus`,
        count: result.count,
      });
    }

    // Delete single registration
    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'Registration ID required' },
        { status: 400 }
      );
    }

    const registration = await db.registration.findUnique({
      where: { id: registrationId },
      include: { user: true },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Pendaftaran tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.registration.delete({
      where: { id: registrationId },
    });

    return NextResponse.json({
      success: true,
      message: `Pendaftaran ${registration.user.name} telah dihapus`,
    });
  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete registration' },
      { status: 500 }
    );
  }
}
