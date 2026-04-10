/// <reference lib="webworker" />

const CACHE_NAME = 'idm-meta-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Install — pre-cache shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function() {
        // Silently fail for assets that aren't available yet
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — Stale-while-revalidate for pages, network-first for API, cache-only for static
self.addEventListener('fetch', function(event) {
  var request = event.request;

  // Skip non-GET
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  // Skip external API/CDN requests for the main caching strategy
  // (Cloudinary images and Pusher are handled separately)
  if (url.hostname !== self.location.hostname) {
    // For Cloudinary images: cache-first with short expiry
    if (url.hostname.includes('cloudinary.com') || url.hostname.includes('res.cloudinary.com')) {
      event.respondWith(
        caches.open(CACHE_NAME + '-images').then(function(cache) {
          return cache.match(request).then(function(cached) {
            if (cached) return cached;
            return fetch(request).then(function(response) {
              if (response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            }).catch(function() {
              return new Response('', { status: 404 });
            });
          });
        })
      );
      return;
    }
    // Skip Pusher/WebSocket requests
    if (url.hostname.includes('pusher') || url.hostname.includes('sock')) return;
    // Skip all other external requests
    return;
  }

  // API routes: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          return response;
        })
        .catch(function() {
          // Offline fallback for API
          return new Response(
            JSON.stringify({ success: false, error: 'Offline - Anda sedang offline', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // HTML pages: stale-while-revalidate (show cached, update in background)
  if (request.mode === 'navigate' || 
      url.pathname === '/' || 
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(request).then(function(cached) {
          var fetchPromise = fetch(request).then(function(response) {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(function() {
            // Network failed, return cached or offline page
            return cached || caches.match('/offline.html');
          });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Static assets (_next/static, fonts, etc.): cache-first
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/fonts/') ||
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.ico')) {
    event.respondWith(
      caches.match(request).then(function(cached) {
        if (cached) return cached;
        return fetch(request).then(function(response) {
          if (response.ok) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then(function(response) {
        if (response.ok) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, responseClone).catch(function() {});
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(request).then(function(cached) {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
