const CACHE_NAME = 'gerardos-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/modules/api.js',
    '/modules/auth.js',
    '/modules/shortcuts.js',
    '/modules/state.js',
    '/modules/ui.js',
    '/modules/utils.js',
    '/modules/ai_ui.js'
];

// Instalación del Service Worker: precachear recursos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-cacheando recursos estáticos');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activación: limpiar cachés obsoletos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Eliminando caché antiguo:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Estrategia de Fetch: Network-first para la API, Cache-first para estáticos
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // No cachear peticiones a la API o llamadas a GitHub
    if (url.pathname.startsWith('/api/') || url.hostname.includes('github.com')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: "Sin conexión de red" }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // Cache-first para recursos estáticos del sitio
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Actualizar en segundo plano (stale-while-revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse.status === 200 && event.request.method === 'GET') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            });
        })
    );
});
