/**
 * Service Worker for GerardOS Private
 * Handles caching and offline functionality
 * Fixed: No longer caches external CDNs that have CORS issues
 */

const CACHE_NAME = 'gerardos-private-v6';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/style.min.css',
    '/app.js',
    '/bundle.js',
    '/bundle.js.map',
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

// API cache configuration
const API_CACHE_NAME = 'gerardos-api-v3';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Maximum cache size (in number of entries)
const MAX_CACHE_ENTRIES = 100;

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker v6...');
    
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
    console.log('[SW] Activating service worker v6...');
    
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

/**
 * Handle API request caching
 * @param {FetchEvent} event - Fetch event
 * @returns {Promise<Response>} Response
 */
async function handleApiRequest(event) {
    const url = new URL(event.request.url);
    const requestPath = url.pathname;
    
    // Don't cache POST, PUT, DELETE, PATCH requests
    if (event.request.method !== 'GET') {
        return fetch(event.request);
    }
    
    // Don't cache session or auth endpoints
    const noCacheEndpoints = [
        '/api/session',
        '/api/logout',
        '/api/oauth/login',
        '/api/oauth/callback'
    ];
    
    if (noCacheEndpoints.some(endpoint => requestPath.startsWith(endpoint))) {
        return fetch(event.request);
    }
    
    // Try to serve from API cache
    const apiCache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await apiCache.match(event.request);
    
    if (cachedResponse) {
        console.log(`[SW] Serving API from cache: ${requestPath}`);
        return cachedResponse;
    }
    
    // Fetch from network
    try {
        const response = await fetch(event.request);
        
        // Only cache successful responses
        if (response.ok && response.status === 200) {
            // Clone the response to cache it
            const responseClone = response.clone();
            
            // Enforce cache size limit
            const keys = await apiCache.keys();
            if (keys.length >= MAX_CACHE_ENTRIES) {
                // Delete oldest entry
                const oldestKey = keys[0];
                await apiCache.delete(oldestKey);
            }
            
            await apiCache.put(event.request, responseClone);
            console.log(`[SW] Cached API response: ${requestPath}`);
        }
        
        return response;
    } catch (error) {
        console.error(`[SW] Network error for ${requestPath}:`, error);
        throw error;
    }
}

/**
 * Handle static asset requests
 * @param {FetchEvent} event - Fetch event
 * @returns {Promise<Response>} Response
 */
async function handleStaticRequest(event) {
    const url = new URL(event.request.url);
    const requestPath = url.pathname;
    const cache = await caches.open(CACHE_NAME);

    // Estrategia Network First para HTML y JS para evitar quedarse atascados
    if (requestPath === '/' || requestPath === '/index.html' || requestPath.endsWith('.js')) {
        try {
            const response = await fetch(event.request);
            if (response.ok) {
                const responseClone = response.clone();
                await cache.put(event.request, responseClone);
            }
            console.log(`[SW] Serving from network: ${requestPath}`);
            return response;
        } catch (error) {
            console.log(`[SW] Network failed, falling back to cache: ${requestPath}`);
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) return cachedResponse;
            throw error;
        }
    }

    // Para el resto (CSS, imágenes) usamos Cache First con Stale While Revalidate
    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
        // Fetch new version in background
        fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
        }).catch(() => {});
        
        console.log(`[SW] Serving from cache: ${requestPath}`);
        return cachedResponse;
    }
    
    // Fallback to network
    try {
        const response = await fetch(event.request);
        if (response.ok) {
            const responseClone = response.clone();
            await cache.put(event.request, responseClone);
        }
        return response;
    } catch (error) {
        console.error(`[SW] Network error for ${requestPath}:`, error);
        throw error;
    }
}

/**
 * Handle external resource requests
 * Fixed: No longer caches external CDNs to avoid CORS issues
 * @param {FetchEvent} event - Fetch event
 * @returns {Promise<Response>} Response
 */
async function handleExternalRequest(event) {
    const url = new URL(event.request.url);
    
    // List of allowed external domains for caching
    const allowedDomains = [
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'cdnjs.cloudflare.com',
        'unpkg.com',
        'cdn.jsdelivr.net'
    ];
    
    // Check if this is an external resource from allowed domains
    const isAllowedExternal = allowedDomains.some(domain => url.hostname.includes(domain));
    
    if (!isAllowedExternal) {
        // For all other external resources (like d3js.org), just fetch from network
        // Don't cache them to avoid CORS issues
        return fetch(event.request);
    }
    
    // For allowed domains, try to serve from cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
        console.log(`[SW] Serving external from cache: ${url.href}`);
        return cachedResponse;
    }
    
    // Fetch from network
    try {
        const response = await fetch(event.request);
        
        // Only cache successful responses with CORS headers
        if (response.ok && response.headers.get('access-control-allow-origin')) {
            const responseClone = response.clone();
            await cache.put(event.request, responseClone);
            console.log(`[SW] Cached external resource: ${url.href}`);
        }
        
        return response;
    } catch (error) {
        console.error(`[SW] Network error for external resource ${url.href}:`, error);
        throw error;
    }
}

/**
 * Main fetch event handler
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const requestPath = url.pathname;
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Handle API requests
    if (requestPath.startsWith('/api/')) {
        event.respondWith(handleApiRequest(event));
        return;
    }
    
    // Handle static assets from our origin
    if (url.origin === self.location.origin) {
        event.respondWith(handleStaticRequest(event));
        return;
    }
    
    // Handle external resources
    event.respondWith(handleExternalRequest(event));
});

// Listen for messages from clients (e.g., to skip waiting)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
