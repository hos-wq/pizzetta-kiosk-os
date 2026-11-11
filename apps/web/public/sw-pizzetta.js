const CACHE_NAME = 'pizzetta-kiosk-shell-v3';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['/client', '/restaurant', '/manifest-client.webmanifest', '/manifest-restaurant.webmanifest', '/icons/pizzetta-app-icon.png'])).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: 'Pizzetta update', body: event.data?.text() || 'Your order has changed.' }; }
  event.waitUntil(self.registration.showNotification(payload.title || 'Pizzetta update', { body: payload.body || 'Your order has changed.', icon: '/icons/pizzetta-app-icon.png', badge: '/icons/pizzetta-app-icon.png', tag: payload.tag || 'pizzetta-order-update', data: { url: payload.url || '/client' } }));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { const target = event.notification.data?.url || '/client'; const existing = list.find(client => 'focus' in client); return existing ? existing.focus() : clients.openWindow(target); })); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  event.respondWith(fetch(request).then(response => { if (response.ok && new URL(request.url).origin === self.location.origin) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); } return response; }).catch(() => caches.match(request).then(cached => cached || caches.match('/client'))));
});
