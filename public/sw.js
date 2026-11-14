// SunoNa Service Worker for PWA Installation and Caching
const CACHE_NAME = 'sunona-cache-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept dev server modules, HMR, localhost, or audio streaming
  if (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('/@') ||
    url.includes('/src/') ||
    url.includes('/api/') ||
    url.includes('node_modules') ||
    url.includes('vite') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
