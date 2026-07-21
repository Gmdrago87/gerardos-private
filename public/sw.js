/**
 * Service Worker for GerardOS Private
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'gerardos-private-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/modules/utils.js',
    '/modules/state.js',
    '/modules/api.js',
    '/modules/ui.js',
    '/modules/auth.js',
    '/modules/shortcuts.js',
    '/modules/ai_ui.js',
    '/modules/futuristic.js'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/lucide/1.0.0/lucide.min.js',
    'https://cdn.jsdelivr.net/npm/lucide@1.0.0/dist/lucide.min.js'
];

// API cache configuration
const API_CACHE_NAME = 'gerardos-api-v1';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] Static assets cached successfully');
                return self.skipWaiting(); // Force the waiting service worker to become active
            })
            .catch((error) => {
                console.error('[SW] Error caching assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                    return Promise.resolve();
                })
            );
        })
        .then(() => {
            console.log('[SW] Service worker activated');
            return self.clients.claim(); // Take control of all clients
        })
    );
});

// Fetch event - serve cached assets when offline
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const requestPath = url.pathname;
    
    // Skip API requests (handle separately)
    if (requestPath.startsWith('/api/')) {
        event.respondWith(handleApiRequest(event));
        return;
    }
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Try to serve from cache first
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    console.log(`[SW] Serving from cache: ${requestPath}`);
                    return response;
                }
                
                // If not in cache, fetch from network and cache it
                console.log(`[SW] Fetching from network: ${requestPath}`);
                return fetch(event.request)
                    .then((response) => {
                        // Clone the response to cache it
                        const responseClone = response.clone();
                        
                        // Cache only successful responses for static assets
                        if (response.ok && isCacheable(requestPath)) {
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        
                        return response;
                    })
                    .catch((error) => {
                        console.error(`[SW] Network error for ${requestPath}:`, error);
                        // Return a fallback response for HTML files
                        if (requestPath.endsWith('.html') || requestPath === '/') {
                            return caches.match('/index.html');
                        }
                        throw error;
                    });
            })
    );
});

// Handle API requests with caching
async function handleApiRequest(event) {
    const url = new URL(event.request.url);
    const requestPath = url.pathname;
    
    // Don't cache mutable requests
    if (event.request.method !== 'GET') {
        return fetch(event.request);
    }
    
    // Check if we have a cached response
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
        // Check if cached response is still valid
        const cachedTime = cachedResponse.headers.get('X-Cache-Time');
        if (cachedTime && (Date.now() - parseInt(cachedTime) < API_CACHE_DURATION)) {
            console.log(`[SW] Serving API from cache: ${requestPath}`);
            return cachedResponse;
        }
    }
    
    // Fetch from network
    try {
        const response = await fetch(event.request);
        
        // Cache successful responses
        if (response.ok) {
            const responseClone = response.clone();
            const newHeaders = new Headers(response.headers);
            newHeaders.set('X-Cache-Time', Date.now().toString());
            
            const newResponse = new Response(responseClone.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
            
            cache.put(event.request, newResponse);
        }
        
        return response;
    } catch (error) {
        console.error(`[SW] API request failed: ${requestPath}`, error);
        // Return cached response if available (stale-while-revalidate)
        if (cachedResponse) {
            console.log(`[SW] Serving stale API response: ${requestPath}`);
            return cachedResponse;
        }
        throw error;
    }
}

// Check if a path should be cached
function isCacheable(path) {
    const cacheableExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.ico'];
    return cacheableExtensions.some(ext => path.endsWith(ext)) || path === '/';
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data.action === 'clearCache') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                caches.delete(cacheName);
            });
        });
    }
});

// Push notification support (if enabled)
self.addEventListener('push', (event) => {
    const data = event.data?.json();
    if (data) {
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: data.icon || '/favicon.ico',
                data: data.url ? { url: data.url } : undefined
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.notification.data?.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
