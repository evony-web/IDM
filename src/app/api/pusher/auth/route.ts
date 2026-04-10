import { NextRequest, NextResponse } from 'next/server';
import { authenticatePusher } from '@/lib/pusher';

/**
 * POST /api/pusher/auth
 *
 * Authenticates Pusher private/presence channel subscriptions.
 * Pusher-js sends form-urlencoded data, not JSON.
 */
export async function POST(request: NextRequest) {
  try {
    // Pusher-js sends form-urlencoded data
    const formData = await request.formData();
    const socket_id = formData.get('socket_id') as string;
    const channel_name = formData.get('channel_name') as string;

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    // Authenticate with Pusher
    const auth = authenticatePusher(socket_id, channel_name, 'demo-user', {
      name: 'User',
    });

    if (!auth) {
      return NextResponse.json(
        { error: 'Pusher not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json(auth);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json(
      { error: 'Auth failed' },
      { status: 500 }
    );
  }
}
