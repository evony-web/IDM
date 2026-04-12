import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerNewSawer } from '@/lib/pusher';
import { verifyAdmin } from '@/lib/admin-guard';
import { uploadBase64ToCloudinary } from '@/lib/server-utils';

// GET /api/sawer — fetch recent confirmed sawer feed
export async function GET() {
  try {
    const sawerList = await db.sawer.findMany({
      where: {
        paymentStatus: 'confirmed',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Only sum confirmed sawer amounts
    const totalSawer = await db.sawer.aggregate({
      where: {
        paymentStatus: 'confirmed',
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      sawerList,
      totalSawer: totalSawer._sum.amount || 0,
    });
  } catch (error) {
    console.error('[SAWER GET]', error);
    return NextResponse.json({ error: 'Gagal memuat sawer' }, { status: 500 });
  }
}

// POST /api/sawer — create a new sawer (tip) — prize pool updated on payment confirmation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderName, senderAvatar, targetPlayerId, targetPlayerName, amount, message, tournamentId, division, paymentMethod, proofImageUrl } = body;

    if (!senderName || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Nama pengirim dan nominal wajib diisi' },
        { status: 400 },
      );
    }

    const sawerAmount = Number(amount);

    // ── Upload proof image to Cloudinary CDN ──
    let cdnProofUrl: string | null = null;
    if (proofImageUrl) {
      if (proofImageUrl.startsWith('https://res.cloudinary.com')) {
        // Already on Cloudinary — use as-is
        cdnProofUrl = proofImageUrl;
      } else if (proofImageUrl.startsWith('data:image/')) {
        // Base64 image — upload to Cloudinary
        const result = await uploadBase64ToCloudinary(proofImageUrl, 'idm/proof/sawer', {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 'auto:good',
        });
        if (result) {
          cdnProofUrl = result.url;
        } else {
          console.warn('[Sawer] Cloudinary upload failed for proof image — storing null');
        }
      } else if (proofImageUrl.startsWith('http')) {
        // External URL — store as-is
        cdnProofUrl = proofImageUrl;
      }
    }

    // ── Upload sender avatar to Cloudinary if it's base64 ──
    let cdnSenderAvatar: string | null = null;
    if (senderAvatar) {
      if (senderAvatar.startsWith('https://res.cloudinary.com') || senderAvatar.startsWith('http')) {
        cdnSenderAvatar = senderAvatar;
      } else if (senderAvatar.startsWith('data:image/')) {
        const result = await uploadBase64ToCloudinary(senderAvatar, 'idm/avatars', {
          maxWidth: 256,
          maxHeight: 256,
          quality: 'auto:good',
        });
        cdnSenderAvatar = result ? result.url : null;
      }
    }

    // Create sawer record with pending status
    const sawer = await db.sawer.create({
      data: {
        tournamentId: tournamentId || null,
        senderName: String(senderName).slice(0, 50),
        senderAvatar: cdnSenderAvatar,
        targetPlayerId: targetPlayerId || null,
        targetPlayerName: targetPlayerName ? String(targetPlayerName).slice(0, 50) : null,
        amount: sawerAmount,
        message: message ? String(message).slice(0, 200) : null,
        paymentMethod: paymentMethod || 'qris',
        paymentStatus: 'pending',
        proofImageUrl: cdnProofUrl,
      },
    });

    // Broadcast via Pusher — fire and forget
    // NOTE: Prize pool is NOT updated here — it updates when payment is confirmed
    try {
      triggerNewSawer(tournamentId, {
        ...sawer,
        amount: sawerAmount,
      }).catch(() => {});
    } catch {}

    // ═══ NOTIFICATION: Fire-and-forget ═══
    try {
      const { triggerNotification } = await import('@/lib/pusher');
      triggerNotification({
        type: 'sawer',
        title: 'Sawer Baru!',
        message: `${sawer.senderName} menyawer Rp${sawerAmount}!`,
        icon: '💝',
        data: { sawerId: sawer.id, tournamentId, amount: sawerAmount },
      }).catch(() => {});
    } catch {}

    return NextResponse.json(sawer, { status: 201 });
  } catch (error) {
    console.error('[SAWER POST]', error);
    return NextResponse.json({ error: 'Gagal menyimpan sawer' }, { status: 500 });
  }
}

// DELETE /api/sawer — delete a sawer entry (admin only)
export async function DELETE(req: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID sawer wajib diisi' }, { status: 400 });
    }

    // Check if sawer exists
    const existingSawer = await db.sawer.findUnique({
      where: { id },
    });

    if (!existingSawer) {
      return NextResponse.json({ error: 'Sawer tidak ditemukan' }, { status: 404 });
    }

    // Delete the sawer
    await db.sawer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Sawer berhasil dihapus' });
  } catch (error) {
    console.error('[SAWER DELETE]', error);
    return NextResponse.json({ error: 'Gagal menghapus sawer' }, { status: 500 });
  }
}
