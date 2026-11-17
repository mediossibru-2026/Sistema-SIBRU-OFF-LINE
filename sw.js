// sw.js
const CACHE_NAME = 'sibru-offline-v1';
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

// Instalar: cachear todos los archivos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => console.error('[SW] Error al cachear:', err))
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch: servir desde cache si no hay internet
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }
        // Si no, intentar red
        return fetch(event.request).catch(() => {
          // Si falla red y no está en cache, devolver página offline
          if (event.request.mode === 'navigate') {
            return caches.match('./caja.html');
          }
        });
      })
  );
});
