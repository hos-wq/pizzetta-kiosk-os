/* global self, caches, fetch */
const CACHE = 'br-os-theme-v3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const networkFirst = event.request.mode === 'navigate';
  event.respondWith((networkFirst ? fetch(event.request).catch(() => caches.match(event.request)) : caches.match(event.request).then((cached) => cached || fetch(event.request))).then((response) => {
    if (!response) throw new Error('Offline page unavailable');
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }));
});
