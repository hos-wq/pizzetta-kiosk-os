const CACHE_NAME = 'pizzetta-kiosk-shell-v2';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['/client', '/restaurant', '/manifest-client.webmanifest', '/manifest-restaurant.webmanifest']))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: 'Pizzetta update', body: event.data?.text() || 'Your order has changed.' }; }
  event.waitUntil(self.registration.showNotification(payload.title || 'Pizzetta update', { body: payload.body || 'Your order has changed.', icon: '/brand/pizzetta-logo-paper-border.svg', badge: '/brand/pizzetta-logo-paper-border.svg', tag: payload.tag || 'pizzetta-order-update', data: { url: payload.url || '/client' } }));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { const target = event.notification.data?.url || '/client'; const existing = list.find(client => 'focus' in client); return existing ? existing.focus() : clients.openWindow(target); })); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
