import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import pusher from '@/lib/pusher';

// ═══════════════════════════════════════════════════════════════════════
// GET /api/notifications — Fetch notifications
// Query params: userId, unreadOnly, limit, type
// ═══════════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  try {
    // Guard: check if Notification model is available in Prisma client
    if (!(db as Record<string, unknown>).notification) {
      return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const type = searchParams.get('type');

    // Build where clause: user-specific + broadcast (userId=null)
    const where: Record<string, unknown> = {};

    if (userId) {
      where.OR = [
        { userId: userId },
        { userId: null },
      ];
    } else {
      where.userId = null; // only broadcast
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      // Unread count always based on user context
      db.notification.count({
        where: {
          ...(userId ? { OR: [{ userId }, { userId: null }] } : { userId: null }),
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('[Notifications API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat notifikasi' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// POST /api/notifications — Create notification
// Body: { type, title, message, icon?, data?, userId? }
// ═══════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // Guard: check if Notification model is available
    if (!(db as Record<string, unknown>).notification) {
      return NextResponse.json(
        { success: false, error: 'Notification model not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type, title, message, icon, data, userId } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'type, title, dan message wajib diisi' },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        type,
        title: String(title).slice(0, 100),
        message: String(message).slice(0, 500),
        icon: icon ? String(icon).slice(0, 10) : '📢',
        data: data ? JSON.stringify(data) : null,
        userId: userId || null,
      },
    });

    // Trigger Pusher event for real-time updates
    try {
      await pusher?.trigger('notifications', 'notification-new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
        data: notification.data,
        userId: notification.userId,
        createdAt: notification.createdAt,
      });
    } catch (pusherErr) {
      console.error('[Notifications API] Pusher error:', pusherErr);
    }

    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (error) {
    console.error('[Notifications API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat notifikasi' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PUT /api/notifications — Mark notification(s) as read
// Body: { ids: string[] } OR { markAllRead: true, userId? }
// ═══════════════════════════════════════════════════════════════════════
export async function PUT(request: NextRequest) {
  try {
    // Guard: check if Notification model is available
    if (!(db as Record<string, unknown>).notification) {
      return NextResponse.json(
        { success: false, error: 'Notification model not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { ids, markAllRead, userId } = body;

    if (markAllRead) {
      // Mark all as read for a user (user-specific + broadcast)
      const where: Record<string, unknown> = { isRead: false };
      if (userId) {
        where.OR = [
          { userId: userId },
          { userId: null },
        ];
      } else {
        where.userId = null;
      }

      const result = await db.notification.updateMany({
        where,
        data: { isRead: true },
      });

      return NextResponse.json({
        success: true,
        markedRead: result.count,
      });
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const result = await db.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true },
      });

      return NextResponse.json({
        success: true,
        markedRead: result.count,
      });
    }

    return NextResponse.json(
      { success: false, error: 'ids atau markAllRead diperlukan' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Notifications API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal update notifikasi' },
      { status: 500 }
    );
  }
}
