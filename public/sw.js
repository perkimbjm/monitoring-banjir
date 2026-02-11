const CACHE_NAME = 'monitoring-banjir-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Core app shell files to precache
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// Install event - precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - network-first for API/data, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin API requests (Google APIs, Apps Script, etc.)
  // These should always go to the network
  if (
    url.origin !== self.location.origin &&
    (url.hostname.includes('googleapis.com') ||
     url.hostname.includes('google.com') ||
     url.hostname.includes('script.google.com') ||
     url.hostname.includes('generativelanguage.googleapis.com'))
  ) {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // For API calls on our origin - network first, no cache fallback
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Map tiles - cache first with network fallback (tiles are immutable)
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('tiles.') ||
    url.hostname.includes('mt0.google.com') ||
    url.hostname.includes('mt1.google.com') ||
    url.hostname.includes('server.arcgisonline.com')
  ) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return nothing if tile fetch fails - MapLibre handles missing tiles
            return new Response('', { status: 408 });
          });
        });
      })
    );
    return;
  }

  // MapLibre CSS from CDN - stale while revalidate
  if (url.hostname === 'unpkg.com' && url.pathname.includes('maplibre-gl')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Google Fonts - cache first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // App shell and static assets - stale while revalidate
  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // If we're offline and have no cache, return a basic offline page for navigation
          if (request.mode === 'navigate' && !cachedResponse) {
            return caches.match('/');
          }
          return cachedResponse;
        });
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
