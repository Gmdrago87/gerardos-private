const CACHE_NAME = 'gerardos-v1.2.0-pagespeed';
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
    '/modules/futuristic.js'
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
        )).then(() => self.clients.claim())
    );
});

// Estrategia Stale-While-Revalidate para rendimiento inmediato (0ms de latencia) en PageSpeed
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http') || !isCacheableStaticRequest(event.request)) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse.ok && !networkResponse.redirected) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            });
        })
    );
});
