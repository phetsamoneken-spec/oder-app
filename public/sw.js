// LBC Order / Beerlao POS Service Worker
const CACHE_NAME = 'LBC-Order-v10-flat-app-icon';

// Core Application Shell assets to cache for offline availability
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './fonts/material-symbols-outlined.ttf'
];

// Domains/URLs that MUST NEVER be cached (private data, Google Sheets, Drive, APIs, WhatsApp)
const EXCLUDED_HOSTS = [
  'script.google.com',
  'script.googleusercontent.com',
  'docs.google.com',
  'drive.google.com',
  'lh3.googleusercontent.com',
  'api.qrserver.com',
  'wa.me',
  'api.whatsapp.com',
  'nominatim.openstreetmap.org'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching App Shell assets with solid golden icons');
      return cache.addAll(APP_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Strictly exclude private APIs, Google Apps Script, Google Sheets, Drive, and external APIs
  if (EXCLUDED_HOSTS.some(host => url.hostname.includes(host))) {
    return; // Let browser perform direct network fetch without caching
  }

  // Navigation requests (HTML document): Network-First with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Static Assets & App Shell: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline and not in cache
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
