'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   OfflineIndicator — Floating banner showing online/offline status
   Detects connectivity changes via navigator.onLine + events
   ═══════════════════════════════════════════════════════════════════ */

type ConnectionStatus = 'online' | 'offline' | 'back-online';

export function OfflineIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>(() => {
    if (typeof window === 'undefined') return 'online';
    return navigator.onLine ? 'online' : 'offline';
  });

  const goOffline = useCallback(() => setStatus('offline'), []);
  const goOnline = useCallback(() => {
    setStatus('back-online');
    // Auto-hide "back online" message after 3 seconds
    setTimeout(() => setStatus('online'), 3000);
  }, []);

  useEffect(() => {
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [goOffline, goOnline]);

  // Don't render anything when fully online (no banner)
  if (status === 'online') return null;

  const isOffline = status === 'offline';
  const isBackOnline = status === 'back-online';

  return (
    <AnimatePresence>
      {(isOffline || isBackOnline) && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[300] flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium backdrop-blur-md select-none"
          style={{
            background: isOffline
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(34,197,94,0.15)',
            borderBottom: isOffline
              ? '1px solid rgba(239,68,68,0.25)'
              : '1px solid rgba(34,197,94,0.25)',
            color: isOffline
              ? 'rgba(252,165,165,0.95)'
              : 'rgba(134,239,172,0.95)',
          }}
        >
          {isOffline && (
            <>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center"
              >
                <WifiOff className="h-4 w-4" />
              </motion.span>
              <span>Anda sedang offline</span>
            </>
          )}
          {isBackOnline && (
            <>
              <Wifi className="h-4 w-4" />
              <span>Koneksi kembali</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
