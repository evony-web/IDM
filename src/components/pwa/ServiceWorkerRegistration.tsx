'use client';

import { useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   Service Worker Registration — PWA offline support
   Registers in both production (https) and development (localhost)
   Listens for controllerchange to auto-reload on new SW activation
   ═══════════════════════════════════════════════════════════════════ */

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    // Listen for new controller (SW update activated) and auto-reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Register the service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered (scope: %s)', registration.scope);

        // Listen for messages from the SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_UPDATED') {
            console.log('[PWA] New content available, reloading...');
            if (!refreshing) {
              refreshing = true;
              window.location.reload();
            }
          }
        });

        // Check for updates periodically (every 30 minutes)
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);

        // Also check immediately after page becomes visible
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });
  }, []);

  return null;
}
