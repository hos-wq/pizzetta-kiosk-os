const CACHE_NAME = 'pizzetta-kiosk-shell-v1';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME)));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
