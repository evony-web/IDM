import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const MVP_BONUS_POINTS = 0; // MVP gets no standalone bonus — points only from tournament finalization

// GET - Get current MVP info (one per gender)
export async function GET() {
  try {
    const mvps = await db.user.findMany({
      where: { isMVP: true },
      select: { id: true, name: true, gender: true, points: true, avatar: true, isMVP: true, mvpScore: true },
    });

    const maleMvp = mvps.find(m => m.gender === 'male') || null;
    const femaleMvp = mvps.find(m => m.gender === 'female') || null;

    console.log('[MVP GET] Male MVP:', maleMvp ? `${maleMvp.name}` : 'None', '| Female MVP:', femaleMvp ? `${femaleMvp.name}` : 'None');

    return NextResponse.json({ success: true, mvp: { male: maleMvp, female: femaleMvp } });
  } catch (error) {
    console.error('Error fetching MVP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MVP' },
      { status: 500 }
    );
  }
}

// POST - Set MVP (admin only) — enforces 1 MVP per gender
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { userId, mvpScore, tournamentId } = body;

    if (!userId || !tournamentId) {
      return NextResponse.json(
        { success: false, error: 'userId and tournamentId required' },
        { status: 400 }
      );
    }

    const score = Math.max(0, Math.floor(mvpScore || 0));

    // Check if user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if this user is already MVP — if so, just update the score
    if (user.isMVP) {
      await db.user.update({
        where: { id: userId },
        data: { mvpScore: score },
      });

      return NextResponse.json({
        success: true,
        message: `Skor MVP ${user.name} diperbarui ke ${score.toLocaleString('id-ID')}`,
      });
    }

    // Find ALL existing MVPs of the SAME gender — remove them (only 1 MVP per gender)
    const existingGenderMvps = await db.user.findMany({
      where: { isMVP: true, gender: user.gender, id: { not: userId } },
    });

    // Remove previous same-gender MVP flags (no point deduction since MVP bonus is 0)
    for (const existingMvp of existingGenderMvps) {
      await db.user.update({
        where: { id: existingMvp.id },
        data: {
          isMVP: false,
          mvpScore: 0,
        },
      });
    }

    // Set new MVP — no point bonus, MVP points only from tournament finalization
    await db.user.update({
      where: { id: userId },
      data: {
        isMVP: true,
        mvpScore: score,
      },
    });

    const genderLabel = user.gender === 'male' ? 'Male' : 'Female';

    if (existingGenderMvps.length > 0) {
      console.log(
        `[MVP] ${existingGenderMvps.length} ${genderLabel} MVP(s) removed, ${user.name} set as new ${genderLabel} MVP | Skor: ${score.toLocaleString('id-ID')} | (points from finalization only)`
      );
    } else {
      console.log(
        `[MVP] ${user.name} set as ${genderLabel} MVP | Skor: ${score.toLocaleString('id-ID')} | (points from finalization only)`
      );
    }

    return NextResponse.json({
      success: true,
      message: `${user.name} ditetapkan sebagai ${genderLabel} MVP! Skor: ${score.toLocaleString('id-ID')} (poin MVP dari finalisasi turnamen)`,
    });
  } catch (error) {
    console.error('Error setting MVP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set MVP' },
      { status: 500 }
    );
  }
}

// DELETE - Remove MVP (admin only)
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isMVP) {
      return NextResponse.json(
        { success: false, error: 'User is not MVP' },
        { status: 400 }
      );
    }

    // Remove MVP flag (no point deduction since MVP bonus is 0)
    await db.user.update({
      where: { id: userId },
      data: {
        isMVP: false,
        mvpScore: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${user.name} dikeluarkan dari MVP`,
    });
  } catch (error) {
    console.error('Error removing MVP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove MVP' },
      { status: 500 }
    );
  }
}
