// Minimal service worker - no caching to avoid cache API errors
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests without caching
  event.respondWith(fetch(event.request));
});