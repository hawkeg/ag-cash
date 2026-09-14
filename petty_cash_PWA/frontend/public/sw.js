/* AG-Cash service worker: offline app shell + push notifications */
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Precache build assets (injected by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback so the app shell loads offline
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Runtime cache for API GETs (IndexedDB is the primary cache; this is a
// belt-and-suspenders fallback for the service-worker layer)
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'agcash-api', networkTimeoutSeconds: 5 })
);

self.addEventListener('push', (event) => {
  let data = { title: 'AG-Cash', body: '', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      dir: 'rtl',
      lang: 'ar',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(self.location.origin)) {
          w.navigate(url);
          return w.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
