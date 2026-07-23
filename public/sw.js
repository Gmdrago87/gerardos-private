const CACHE_NAME = 'gerardos-v1784805100299';
const STATIC_ASSETS = new Set([
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
    '/modules/ai_ui.js',
    '/modules/futuristic.js',
    '/database.json'
]);

function isCacheableStaticRequest(request) {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    if (request.method !== 'GET') return false;
    if (url.pathname.startsWith('/api/')) return false;
    return STATIC_ASSETS.has(url.pathname);
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => Promise.all(
            [...STATIC_ASSETS].map(url => fetch(new Request(url, { cache: 'reload' }))
                .then(response => response.ok ? cache.put(url, response) : undefined)
                .catch(err => console.warn('[Service Worker] Error cacheando', url, err)))
        ))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : undefined)
        )).then(() => {
            return self.clients.claim();
        })
    );
});

// Network First para TODOS los assets estáticos para que los cambios visuales se vean de inmediato
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http')) return;

    if (!isCacheableStaticRequest(event.request)) return;

    event.respondWith(
        fetch(event.request).then(networkResponse => {
            // Se clona la respuesta exitosa para guardarla en el caché
            if (networkResponse.ok && !networkResponse.redirected) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
        }).catch(() => {
            // Si la red falla (offline), intentar obtener del caché
            return caches.match(event.request);
        })
    );
});
