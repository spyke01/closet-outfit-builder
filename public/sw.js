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
  // Only proxy same-origin requests. Cross-origin requests (e.g. Google avatars)
  // should bypass the service worker so they follow normal browser loading rules.
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
  }
});
