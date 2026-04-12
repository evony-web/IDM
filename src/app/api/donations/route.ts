import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { triggerNewDonation, triggerNewSawer } from '@/lib/pusher';
import { uploadBase64ToCloudinary } from '@/lib/server-utils';

// GET - Get donations (only confirmed, for Liga Season 2 funding)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const donations = await db.donation.findMany({
      where: {
        paymentStatus: 'confirmed',
      },
      select: {
        id: true,
        amount: true,
        message: true,
        anonymous: true,
        donorName: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Calculate total donation from confirmed only
    const totalDonation = await db.donation.aggregate({
      where: {
        paymentStatus: 'confirmed',
      },
      _sum: {
        amount: true,
      },
    });

    // Count pending donations for admin display
    const pendingCount = await db.donation.count({
      where: {
        paymentStatus: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      donations,
      totalDonation: totalDonation._sum.amount || 0,
      pendingCount,
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch donations' },
      { status: 500 }
    );
  }
}

// POST - Create donation (for Liga Season 2 funding)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, donorName, amount, message, anonymous, tournamentId, paymentMethod, proofImageUrl } = body;

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // ── Upload proof image to Cloudinary CDN ──
    let cdnProofUrl: string | null = null;
    if (proofImageUrl) {
      if (proofImageUrl.startsWith('https://res.cloudinary.com')) {
        // Already on Cloudinary — use as-is
        cdnProofUrl = proofImageUrl;
      } else if (proofImageUrl.startsWith('data:image/')) {
        // Base64 image — upload to Cloudinary
        const result = await uploadBase64ToCloudinary(proofImageUrl, 'idm/proof/donations', {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 'auto:good',
        });
        if (result) {
          cdnProofUrl = result.url;
        } else {
          // Cloudinary upload failed — store nothing (better than bloated base64)
          console.warn('[Donations] Cloudinary upload failed for proof image — storing null');
        }
      } else if (proofImageUrl.startsWith('http')) {
        // External URL — store as-is (might be from another CDN)
        cdnProofUrl = proofImageUrl;
      }
    }

    const donation = await db.donation.create({
      data: {
        id: uuidv4(),
        userId: anonymous ? null : userId,
        donorName: anonymous ? null : (donorName || null),
        amount: parseFloat(amount),
        message: message || '',
        anonymous: anonymous || false,
        paymentMethod: paymentMethod || 'qris',
        paymentStatus: 'pending',
        proofImageUrl: cdnProofUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Broadcast via Pusher — fire and forget
    triggerNewDonation(tournamentId, {
      amount: donation.amount,
      userName: donation.donorName || donation.user?.name || 'Anonymous',
      message: donation.message || undefined,
      tournamentId,
    }).catch(() => {});

    // Also broadcast as sawer event for live feed
    triggerNewSawer(tournamentId, {
      senderName: donation.donorName || donation.user?.name || 'Anonymous',
      senderAvatar: donation.user?.avatar || null,
      amount: donation.amount,
      message: donation.message,
      tournamentId,
      paymentStatus: 'pending',
      createdAt: donation.createdAt,
    }).catch(() => {});

    return NextResponse.json({ success: true, donation });
  } catch (error) {
    console.error('Error creating donation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create donation' },
      { status: 500 }
    );
  }
}
