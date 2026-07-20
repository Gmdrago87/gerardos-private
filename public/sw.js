const CACHE_NAME = 'gerardos-v1.1.0-fixed';
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
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-cacheando recursos estáticos');
            return Promise.all(
                STATIC_ASSETS.map(url => {
                    return fetch(new Request(url, { cache: 'reload' })).then(response => {
                        if (response.ok) {
                            return cache.put(url, response);
                        }
                        throw new Error('Network response was not ok');
                    }).catch(err => console.warn('[Service Worker] Error cacheando', url, err));
                })
            );
        })
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

// Estrategia de Fetch: Network-first (siempre obtiene la versión más reciente, fallback a cache)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // No interceptar peticiones de extensiones de Chrome u otros esquemas no http/https
    if (!url.protocol.startsWith('http')) {
        return;
    }

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

    // Network-first para recursos del sitio (garantiza ver siempre el código más reciente)
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok && event.request.method === 'GET' && !networkResponse.redirected) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
