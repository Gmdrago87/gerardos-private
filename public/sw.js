const CACHE_NAME = 'gerardos-v1.1.1-security';
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

self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http') || !isCacheableStaticRequest(event.request)) {
        return;
    }

    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            const cacheControl = networkResponse.headers.get('Cache-Control') || '';
            if (networkResponse.ok && !networkResponse.redirected && !cacheControl.includes('no-store')) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
        }).catch(() => caches.match(event.request))
    );
});
