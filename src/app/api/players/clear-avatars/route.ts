import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE - Clear all player avatars (set to null)
export async function DELETE() {
  try {
    // First, count how many players currently have avatars
    const playersWithAvatar = await db.user.count({
      where: {
        avatar: { not: null },
      },
    });

    if (playersWithAvatar === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada pemain yang memiliki avatar',
        cleared: 0,
      });
    }

    // Get list of players with avatars for logging
    const playersBefore = await db.user.findMany({
      where: {
        avatar: { not: null },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    console.log(`[ClearAvatars] Found ${playersWithAvatar} players with avatars`);
    playersBefore.forEach(p => {
      console.log(`  - ${p.name}: ${p.avatar}`);
    });

    // Clear all avatars (set to null)
    const result = await db.user.updateMany({
      where: {
        avatar: { not: null },
      },
      data: {
        avatar: null,
      },
    });

    console.log(`[ClearAvatars] Cleared ${result.count} player avatars`);

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${result.count} avatar pemain`,
      cleared: result.count,
      playersCleared: playersBefore.map(p => ({
        name: p.name,
        oldAvatar: p.avatar,
      })),
    });
  } catch (error) {
    console.error('[ClearAvatars] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus avatar' },
      { status: 500 },
    );
  }
}
