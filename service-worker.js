const CACHE_NAME = 'the-stacks-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=2',
  './app.js',
  './manifest.json',
  './icon_small.png',
  './logo.png',
  './focus.gif',
  './loading.mp4',
  './uplifting-bells.wav',
  './light-bells.wav',
  './quick-ring.wav',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap',
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Service Worker Install lifecycle
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] Pre-caching offline assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Service Worker Activation lifecycle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[PWA] Cleaning up old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Service Worker Fetch interception (Stale-While-Revalidate pattern for cached assets)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip caching for Supabase DB requests (API requests) or hot-reloading
  if (event.request.method !== 'GET' || requestUrl.host.includes('supabase.co')) {
    return;
  }

  // Handle Cover Art Images from Open Library / Google Books
  if (requestUrl.host.includes('covers.openlibrary.org') || requestUrl.host.includes('books.google.com') || requestUrl.host.includes('googleusercontent.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse); // Offline fallback

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // General Stale-While-Revalidate logic for local app shell assets
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return cachedResponse;
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
