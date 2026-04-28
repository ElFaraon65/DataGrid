/* ═══════════════════════════════════════════════════════
   DataGrid — Service Worker
   Estrategia: Cache-first para assets, network-first para el HTML.
   Toda la app funciona sin conexión una vez instalada.
═══════════════════════════════════════════════════════ */

const CACHE_NAME  = 'datagrid-v14';
const STATIC_ASSETS = [
  'index.html',
  'manifest.json',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  /* Google Fonts (se cachean en la primera visita) */
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500&display=swap'
];

/* ── INSTALL: pre-cachear assets esenciales ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: limpiar caches antiguas ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: cache-first con fallback a red ── */
self.addEventListener('fetch', event => {
  /* Solo interceptar GET */
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          /* Cachear respuestas válidas (no errores, no extensiones de Chrome) */
          if (
            response &&
            response.status === 200 &&
            response.type !== 'opaque' &&
            !event.request.url.startsWith('chrome-extension://')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          /* Sin red y sin caché: devolver el HTML principal como fallback */
          if (event.request.destination === 'document') {
            return caches.match('index.html');
          }
        });
    })
  );
});
