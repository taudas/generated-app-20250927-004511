const CACHE_NAME = 'wcbn-pwa-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event - cache the static skeleton shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale While Revalidate / Cache Fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Skip cross-origin API and streaming requests from being cached by default
  if (
    url.origin !== self.location.origin || 
    url.pathname.startsWith('/api/') || 
    url.pathname.endsWith('.mp3')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network errors offline */});
        
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache newly requested local assets dynamically
        if (networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});