'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Pusher from 'pusher-js';

/**
 * usePusher - Client-side Pusher Cloud real-time hook
 *
 * Connects to Pusher Cloud (managed WebSocket service) via pusher-js.
 * Works in both local development and production (Vercel).
 *
 * Requires NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER env vars.
 */

// ── Types ───────────────────────────────────────────────────────────────

interface PusherEventMap {
  'match-score': { matchId: string; scoreA: number; scoreB: number; tournamentId: string };
  'match-result': { matchId: string; winnerId: string; tournamentId: string };
  'announcement': { message: string; type: string; tournamentId?: string };
  'new-donation': { amount: number; userName: string; message?: string; tournamentId?: string };
  'prize-pool-update': { totalPrizePool: number };
  'tournament-update': { action: string; tournamentId: string; division?: string };
  'registration-update': { userId: string; userName: string; status: string; tournamentId: string };
  'new-sawer': { amount: number; senderName: string; tournamentId?: string };
  'achievement-awarded': { userId: string; userName: string; achievements: Array<{ type: string; name: string; icon: string; description: string }> };
}

type EventName = keyof PusherEventMap;
type EventHandler<T extends EventName> = (data: PusherEventMap[T]) => void;

interface UsePusherConfig {
  onMatchScore?: EventHandler<'match-score'>;
  onMatchResult?: EventHandler<'match-result'>;
  onAnnouncement?: EventHandler<'announcement'>;
  onNewDonation?: EventHandler<'new-donation'>;
  onPrizePoolUpdate?: EventHandler<'prize-pool-update'>;
  onTournamentUpdate?: EventHandler<'tournament-update'>;
  onRegistrationUpdate?: EventHandler<'registration-update'>;
  onNewSawer?: EventHandler<'new-sawer'>;
  onAchievementAwarded?: EventHandler<'achievement-awarded'>;
}

interface UsePusherReturn {
  isConnected: boolean;
  joinTournament: (tournamentId: string) => void;
  leaveTournament: () => void;
  sendMatchUpdate: (tournamentId: string, matchId: string, scoreA: number, scoreB: number) => void;
  sendMatchComplete: (tournamentId: string, matchId: string, winnerId: string, mvpId?: string) => void;
  sendAnnouncement: (tournamentId: string, message: string, type: 'info' | 'warning' | 'success') => void;
  sendDonation: (tournamentId: string | undefined, amount: number, userName: string, message?: string) => void;
}

// ── Pusher instance (singleton) ─────────────────────────────────────────

const APP_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
const CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1';

let pusherInstance: Pusher | null = null;
let pusherInitAttempted = false;

function getPusher(): Pusher | null {
  if (pusherInstance) return pusherInstance;
  if (pusherInitAttempted) return null;
  if (!APP_KEY) {
    console.warn('[Pusher] NEXT_PUBLIC_PUSHER_KEY not set');
    pusherInitAttempted = true;
    return null;
  }

  try {
    pusherInstance = new Pusher(APP_KEY, {
      cluster: CLUSTER,
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
      },
    });

    pusherInstance.connection.bind('connected', () => {
      console.log('[Pusher] Connected to Pusher Cloud');
    });

    pusherInstance.connection.bind('disconnected', () => {
      console.log('[Pusher] Disconnected from Pusher Cloud');
    });

    pusherInstance.connection.bind('error', (err: any) => {
      console.error('[Pusher] Connection error:', err);
    });

    console.log(`[Pusher] Initialized with key=${APP_KEY.slice(0, 8)}... cluster=${CLUSTER}`);
  } catch (e) {
    console.error('[Pusher] Failed to initialize:', e);
  }

  pusherInitAttempted = true;
  return pusherInstance;
}

// ── Event name to config key mapping ───────────────────────────────────

const EVENT_TO_HANDLER: Record<string, keyof UsePusherConfig> = {
  'match-score': 'onMatchScore',
  'match-result': 'onMatchResult',
  'announcement': 'onAnnouncement',
  'new-donation': 'onNewDonation',
  'prize-pool-update': 'onPrizePoolUpdate',
  'tournament-update': 'onTournamentUpdate',
  'registration-update': 'onRegistrationUpdate',
  'new-sawer': 'onNewSawer',
  'achievement-awarded': 'onAchievementAwarded',
};

// ── Hook ────────────────────────────────────────────────────────────────

export function usePusher(config: UsePusherConfig = {}): UsePusherReturn {
  const [isConnected, setIsConnected] = useState(false);
  const configRef = useRef(config);
  const currentTournamentRef = useRef<string | null>(null);
  const subscribedChannelsRef = useRef<string[]>([]);
  const mountedRef = useRef(true);

  // Keep config ref up to date without triggering reconnect
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    mountedRef.current = true;
    const pusher = getPusher();

    if (!pusher) {
      // Pusher not available — connection state stays false (initial value)
      return;
    }

    // Connection state — updated only via event callbacks (never synchronously in effect body)
    const onConnected = () => {
      if (mountedRef.current) setIsConnected(true);
    };
    const onDisconnected = () => {
      if (mountedRef.current) setIsConnected(false);
    };

    pusher.connection.bind('connected', onConnected);
    pusher.connection.bind('disconnected', onDisconnected);
    pusher.connection.bind('unavailable', onDisconnected);

    return () => {
      mountedRef.current = false;
      pusher.connection.unbind('connected', onConnected);
      pusher.connection.unbind('disconnected', onDisconnected);
      pusher.connection.unbind('unavailable', onDisconnected);

      // Unsubscribe from all channels we subscribed to
      subscribedChannelsRef.current.forEach((ch) => {
        try {
          pusher.unsubscribe(ch);
        } catch (_e) {
          // Channel may not exist
        }
      });
      subscribedChannelsRef.current = [];
    };
  }, []);

  // ── Subscribe to a channel and bind events ──
  const subscribeChannel = useCallback((channelName: string) => {
    const pusher = getPusher();
    if (!pusher) return;

    // Avoid duplicate subscriptions
    if (subscribedChannelsRef.current.includes(channelName)) return;

    const channel = pusher.subscribe(channelName);
    subscribedChannelsRef.current.push(channelName);

    console.log(`[Pusher] Subscribing to: ${channelName}`);

    // Bind all known events
    Object.entries(EVENT_TO_HANDLER).forEach(([eventName, configKey]) => {
      channel.bind(eventName, (data: unknown) => {
        const handler = configRef.current[configKey];
        if (handler) {
          handler(data as never);
        }
      });
    });

    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`[Pusher] Subscribed to: ${channelName}`);
    });
  }, []);

  // ── Unsubscribe from a channel ──
  const unsubscribeChannel = useCallback((channelName: string) => {
    const pusher = getPusher();
    if (!pusher) return;

    pusher.unsubscribe(channelName);
    subscribedChannelsRef.current = subscribedChannelsRef.current.filter(
      (ch) => ch !== channelName
    );
    console.log(`[Pusher] Unsubscribed from: ${channelName}`);
  }, []);

  // ── joinTournament ──
  const joinTournament = useCallback((tournamentId: string) => {
    const prevId = currentTournamentRef.current;
    currentTournamentRef.current = tournamentId;

    // Leave previous tournament channels
    if (prevId) {
      unsubscribeChannel(`private-tournament-${prevId}`);
    }

    // Subscribe to new tournament channels
    subscribeChannel(`private-tournament-${tournamentId}`);
  }, [subscribeChannel, unsubscribeChannel]);

  // ── leaveTournament ──
  const leaveTournament = useCallback(() => {
    const id = currentTournamentRef.current;
    if (id) {
      unsubscribeChannel(`private-tournament-${id}`);
    }
    currentTournamentRef.current = null;
  }, [unsubscribeChannel]);

  // ── Legacy socket.io compatible methods ──
  const sendMatchUpdate = useCallback(
    (tournamentId: string, matchId: string, scoreA: number, scoreB: number) => {
      fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, scoreA, scoreB, tournamentId }),
      }).catch(() => {});
    },
    []
  );

  const sendMatchComplete = useCallback(
    (tournamentId: string, matchId: string, winnerId: string, mvpId?: string) => {
      fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, winnerId, mvpId, tournamentId, status: 'completed' }),
      }).catch(() => {});
    },
    []
  );

  const sendAnnouncement = useCallback(
    (tournamentId: string, message: string, type: 'info' | 'warning' | 'success') => {
      fetch('/api/tournaments/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, message, type }),
      }).catch(() => {});
    },
    []
  );

  const sendDonation = useCallback(
    (tournamentId: string | undefined, amount: number, userName: string, message?: string) => {
      fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, message, anonymous: false, tournamentId }),
      }).catch(() => {});
    },
    []
  );

  return {
    isConnected,
    joinTournament,
    leaveTournament,
    sendMatchUpdate,
    sendMatchComplete,
    sendAnnouncement,
    sendDonation,
  };
}
