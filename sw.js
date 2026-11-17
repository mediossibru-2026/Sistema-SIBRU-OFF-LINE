// sw.js
const CACHE_NAME = 'sibru-offline-v3';
const urlsToCache = [
  './',
  './caja.html',
  './admin.html',
  './login.html',
  './css/base.css',
  './css/caja.css',
  './css/admin.css',
  './css/login.css',
  './css/ticket.css',
  './js/config.js',
  './js/db.js',
  './js/auth.js',
  './js/folio.js',
  './js/catalog.js',
  './js/pos.js',
  './js/print.js',
  './js/seed.js',
  './js/sync.js',
  './js/main-caja.js',
  './js/main-admin.js',
  './js/reports.js',
  './js/admin/tickets.js',
  './js/admin/products.js',
  './js/admin/cashiers.js',
  './js/admin/settings.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando v2...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.error('[SW] Error al cachear:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((name) => {
        if (name !== CACHE_NAME) {
          console.log('[SW] Eliminando cache viejo:', name);
          return caches.delete(name);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./caja.html');
        }
      });
    })
  );
});
