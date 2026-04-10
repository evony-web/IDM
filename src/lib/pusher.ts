/**
 * Server-side Pusher client
 *
 * Uses Pusher Cloud for real-time communication.
 * Requires environment variables: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
 */

import Pusher from 'pusher';

// Pusher configuration
const pusherConfig = {
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'ap1',
  useTLS: true,
};

// Check if Pusher is configured
const isConfigured = pusherConfig.appId && pusherConfig.key && pusherConfig.secret;

// Create Pusher instance
const pusher = isConfigured
  ? new Pusher(pusherConfig)
  : null;

if (pusher) {
  console.log('[Pusher] Connected to Pusher Cloud');
} else {
  console.log('[Pusher] Not configured - set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET');
}

export default pusher;

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Private channel for a specific tournament */
export const tournamentChannel = (tournamentId: string) =>
  `private-tournament-${tournamentId}`;

/** Public channel for a division (male/female) */
export const divisionChannel = (division: string) =>
  `division-${division}`;

/** Global public channel for cross-division updates */
export const globalChannel = 'global-updates';

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function triggerMatchScore(
  tournamentId: string,
  data: { matchId: string; scoreA: number; scoreB: number; tournamentId: string }
) {
  if (!pusher) return Promise.resolve();
  return pusher.trigger(tournamentChannel(tournamentId), 'match-score', data);
}

export function triggerMatchResult(
  tournamentId: string,
  data: { matchId: string; winnerId: string; tournamentId: string }
) {
  if (!pusher) return Promise.resolve();
  return pusher.trigger(tournamentChannel(tournamentId), 'match-result', data);
}

export function triggerAnnouncement(
  tournamentId: string,
  data: { message: string; type: string; tournamentId: string }
) {
  if (!pusher) return Promise.resolve();
  return pusher.trigger(tournamentChannel(tournamentId), 'announcement', data);
}

export function triggerNewDonation(
  tournamentId: string | undefined,
  data: { amount: number; userName: string; message?: string; tournamentId?: string }
) {
  if (!pusher) return Promise.resolve();
  const channel = tournamentId ? tournamentChannel(tournamentId) : globalChannel;
  return pusher.trigger(channel, 'new-donation', data);
}

export function triggerPrizePoolUpdate(data: { totalPrizePool: number }) {
  if (!pusher) return Promise.resolve();
  return pusher.trigger(globalChannel, 'prize-pool-update', data);
}

export function triggerNewSawer(
  tournamentId: string | undefined,
  data: Record<string, unknown>
) {
  if (!pusher) return Promise.resolve();
  const channel = tournamentId ? tournamentChannel(tournamentId) : globalChannel;
  return pusher.trigger(channel, 'new-sawer', data);
}

export function triggerTournamentUpdate(
  division: string,
  data: { action: string; tournamentId: string; division: string }
) {
  if (!pusher) return Promise.resolve();
  return pusher.trigger(divisionChannel(division), 'tournament-update', data);
}

export function triggerRegistrationUpdate(
  tournamentId: string,
  data: { userId: string; userName: string; status: string; tournamentId: string }
) {
  if (!pusher) return Promise.resolve();
  return pusher.trigger(tournamentChannel(tournamentId), 'registration-update', data);
}

export function triggerAchievementAwarded(
  tournamentId: string,
  data: {
    userId: string;
    userName: string;
    achievements: Array<{ type: string; name: string; icon: string; description: string }>;
  }
) {
  if (!pusher) return Promise.resolve();
  return pusher.trigger(tournamentChannel(tournamentId), 'achievement-awarded', data);
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION HELPER — Create DB notification + Pusher event
// ═══════════════════════════════════════════════════════════════════════════

export async function triggerNotification(data: {
  type: string;
  title: string;
  message: string;
  icon?: string;
  data?: Record<string, unknown>;
  userId?: string;
}) {
  try {
    // Create notification in DB via internal API
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: data.type,
        title: data.title,
        message: data.message,
        icon: data.icon || '📢',
        data: data.data || null,
        userId: data.userId || null,
      }),
    });

    if (!res.ok) {
      console.error('[Notification] Failed to create notification:', await res.text());
    }
  } catch (err) {
    console.error('[Notification] Error creating notification:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH HELPER
// ═══════════════════════════════════════════════════════════════════════════

export function authenticatePusher(
  socketId: string,
  channelName: string,
  userId?: string,
  userInfo?: Record<string, unknown>
): { auth: string; channel_data?: string } | null {
  if (!pusher) return null;

  const presenceData = userId
    ? { user_id: userId, user_info: userInfo || {} }
    : undefined;

  const auth = pusher.authorizeChannel(socketId, channelName, presenceData);
  return auth as { auth: string; channel_data?: string };
}
