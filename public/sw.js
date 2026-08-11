const CACHE_VERSION = 'kofc-v2';
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/android-chrome-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/color-scheme-init.js',
];

const shouldBypassCache = (url) => {
  if (url.pathname.startsWith('/api/')) {
    return true;
  }
  if (url.pathname.startsWith('/api/auth') || url.pathname.includes('/auth/')) {
    return true;
  }
  // PayPal callbacks
  if (
    url.pathname.startsWith('/api/dues/ipn') ||
    url.pathname.startsWith('/api/dues/paypal/')
  ) {
    return true;
  }
  return false;
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (shouldBypassCache(url)) {
    return;
  }

  // Navigations: network-first, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_VERSION).then((cache) => {
            void cache.put(event.request, copy);
          });
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached ?? caches.match(OFFLINE_URL)),
        ),
    );
    return;
  }

  // Static assets: stale-while-revalidate
  const isStatic =
    url.pathname.startsWith('/_next/') ||
    /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i.test(url.pathname) ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/color-scheme-init.js';

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(CACHE_VERSION).then((cache) => {
                void cache.put(event.request, copy);
              });
            }
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
    return;
  }

  // Default: network, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached ?? caches.match(OFFLINE_URL)),
    ),
  );
});
