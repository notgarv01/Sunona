// SunoNa Landing Page Service Worker for PWA Installation
const CACHE_NAME = 'sunona-landing-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network first for landing page assets
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

