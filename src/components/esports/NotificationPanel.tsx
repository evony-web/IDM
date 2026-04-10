'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, CheckCheck } from 'lucide-react';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  data: string | null;
  isRead: boolean;
  userId: string | null;
  createdAt: string;
}

interface NotificationPanelProps {
  division?: 'male' | 'female';
}

/* ────────────────────────────────────────────
   Time Ago Helper (Indonesian)
   ──────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ════════════════════════════════════════════
   NotificationPanel Component
   ════════════════════════════════════════════ */

export function NotificationPanel({ division = 'male' }: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accentColor = division === 'male' ? '#73FF00' : '#38BDF8';
  const accentRGB = division === 'male' ? '115,255,0' : '56,189,248';

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Mark single notification as read ──
  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }, []);

  // ── Mark all as read ──
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  }, []);

  // ── Auto-refresh when open ──
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
      refreshTimerRef.current = setInterval(() => fetchNotifications(false), 30000);
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isOpen, fetchNotifications]);

  // ── Close panel on outside click ──
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell Button ── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer outline-none"
        style={{
          background: isOpen
            ? `linear-gradient(180deg, rgba(${accentRGB},0.15) 0%, rgba(${accentRGB},0.05) 100%)`
            : 'rgba(255,255,255,0.04)',
          border: isOpen
            ? `1px solid rgba(${accentRGB},0.30)`
            : '1px solid rgba(255,255,255,0.08)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        aria-label="Notifikasi"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="bell-ring"
              initial={{ rotate: -15, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 15, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <BellRing
                className="w-4 h-4"
                style={{ color: accentColor }}
                strokeWidth={2}
              />
            </motion.div>
          ) : (
            <motion.div
              key="bell"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Bell
                className="w-4 h-4"
                style={{ color: unreadCount > 0 ? accentColor : 'rgba(255,255,255,0.50)' }}
                strokeWidth={unreadCount > 0 ? 2.2 : 1.8}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.div
            className="absolute flex items-center justify-center text-[8px] font-bold"
            style={{
              top: -5,
              right: -5,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: '#EF4444',
              color: '#FFFFFF',
              boxShadow: '0 0 8px rgba(239,68,68,0.5)',
              padding: '0 4px',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* ── Dropdown Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute z-[200] w-[340px] sm:w-[380px]"
            style={{
              top: 'calc(100% + 8px)',
              right: 0,
            }}
          >
            {/* Panel Container */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(18,18,22,0.95)',
                backdropFilter: 'blur(64px) saturate(200%)',
                WebkitBackdropFilter: 'blur(64px) saturate(200%)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.03)',
              }}
            >
              {/* ── Header ── */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Bell
                    className="w-4 h-4"
                    style={{ color: accentColor }}
                    strokeWidth={2}
                  />
                  <span className="text-[13px] font-bold text-white/85">
                    Notifikasi
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `rgba(${accentRGB},0.15)`,
                        color: accentColor,
                        border: `0.5px solid rgba(${accentRGB},0.20)`,
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <motion.button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer outline-none"
                      style={{
                        color: accentColor,
                        background: `rgba(${accentRGB},0.08)`,
                        border: `0.5px solid rgba(${accentRGB},0.15)`,
                      }}
                      whileHover={{
                        background: `rgba(${accentRGB},0.14)`,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CheckCheck className="w-3 h-3" strokeWidth={2} />
                      Tandai semua dibaca
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer outline-none"
                    style={{
                      color: 'rgba(255,255,255,0.40)',
                      background: 'rgba(255,255,255,0.04)',
                    }}
                    whileHover={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.70)',
                    }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                  </motion.button>
                </div>
              </div>

              {/* ── Notification List ── */}
              <div
                className="max-h-[420px] overflow-y-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.12) transparent',
                }}
              >
                {isLoading ? (
                  // Loading skeleton
                  <div className="p-4 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex gap-3 p-3 rounded-xl animate-pulse"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '0.5px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-white/5 rounded w-3/4" />
                          <div className="h-2.5 bg-white/5 rounded w-full" />
                          <div className="h-2 bg-white/5 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '0.5px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <Bell
                        className="w-6 h-6"
                        style={{ color: 'rgba(255,255,255,0.25)' }}
                        strokeWidth={1.5}
                      />
                    </motion.div>
                    <p className="text-[12px] font-medium text-white/35">
                      Belum ada notifikasi
                    </p>
                    <p className="text-[10px] text-white/20 mt-1">
                      Notifikasi akan muncul di sini
                    </p>
                  </div>
                ) : (
                  // Notification items
                  <div className="p-2 space-y-1">
                    {notifications.map((notif, index) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.03,
                          ease: 'easeOut',
                        }}
                        onClick={() => {
                          if (!notif.isRead) markAsRead(notif.id);
                        }}
                        className="relative flex gap-3 p-3 rounded-xl cursor-pointer group transition-all duration-150"
                        style={{
                          background: notif.isRead
                            ? 'transparent'
                            : 'rgba(255,255,255,0.03)',
                          border: notif.isRead
                            ? '0.5px solid transparent'
                            : '0.5px solid rgba(255,255,255,0.05)',
                        }}
                        whileHover={{
                          background: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        {/* Unread indicator — left border accent */}
                        {!notif.isRead && (
                          <motion.div
                            className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full"
                            style={{ background: accentColor }}
                            layoutId={`notif-unread-${notif.id}`}
                            initial={{ opacity: 0, scaleY: 0 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        )}

                        {/* Icon */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                          style={{
                            background: notif.isRead
                              ? 'rgba(255,255,255,0.04)'
                              : `rgba(${accentRGB},0.10)`,
                            border: notif.isRead
                              ? '0.5px solid rgba(255,255,255,0.04)'
                              : `0.5px solid rgba(${accentRGB},0.15)`,
                          }}
                        >
                          {notif.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[12px] leading-snug ${
                              notif.isRead
                                ? 'font-medium text-white/55'
                                : 'font-bold text-white/85'
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[9px] text-white/20 mt-1.5">
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!notif.isRead && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                            style={{
                              background: accentColor,
                              boxShadow: `0 0 4px rgba(${accentRGB},0.5)`,
                            }}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              {notifications.length > 0 && (
                <div
                  className="px-4 py-2.5 text-center"
                  style={{
                    borderTop: '0.5px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-[10px] text-white/25">
                    Menampilkan {notifications.length} notifikasi terbaru
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationPanel;
