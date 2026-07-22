/**
 * Service Worker for GerardOS Private
 * Handles caching and offline functionality
 * Enhanced with better caching strategies and error handling
 */

const CACHE_NAME = 'gerardos-private-v4';
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

// External resources to cache
const EXTERNAL_RESOURCES = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// API cache configuration
const API_CACHE_NAME = 'gerardos-api-v2';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Maximum cache size (in number of entries)
const MAX_CACHE_ENTRIES = 100;

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker v3...');
    
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
    console.log('[SW] Activating service worker v3...');
    
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
    
    // Try to serve from cache first
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
        console.log(`[SW] Serving from cache: ${requestPath}`);
        return cachedResponse;
    }
    
    // Fallback to network
    try {
        const response = await fetch(event.request);
        
        // Cache successful responses
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
 * @param {FetchEvent} event - Fetch event
 * @returns {Promise<Response>} Response
 */
async function handleExternalRequest(event) {
    const url = new URL(event.request.url);
    
    // Check if this is an external resource we want to cache
    const isExternalResource = EXTERNAL_RESOURCES.some(resource => 
        url.href.startsWith(resource) || 
        (resource.includes('fonts.googleapis.com') && url.href.includes('fonts.googleapis.com'))
    );
    
    if (!isExternalResource) {
        return fetch(event.request);
    }
    
    // Try to serve from cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
        console.log(`[SW] Serving external from cache: ${url.href}`);
        return cachedResponse;
    }
    
    // Fetch from network
    try {
        const response = await fetch(event.request);
        
        if (response.ok) {
            const responseClone = response.clone();
            // Cache external resources for 1 day
            await cache.put(event.request, responseClone);
        }
        
        return response;
    } catch (error) {
        console.error(`[SW] Network error for external resource:`, error);
        throw error;
    }
}

// Fetch event - serve cached assets when offline
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const requestPath = url.pathname;
    
    // Skip API requests (handle separately)
    if (requestPath.startsWith('/api/')) {
        event.respondWith(handleApiRequest(event));
        return;
    }
    
    // Skip non-GET requests or non-http(s) schemes
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }
    
    // Handle external resources
    if (!url.origin.includes('gerardos-private') && !url.origin.includes('localhost')) {
        event.respondWith(handleExternalRequest(event));
        return;
    }
    
    // Handle static assets
    event.respondWith(handleStaticRequest(event));
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                caches.delete(cacheName);
            });
        });
    }
});

// Error event - log errors
self.addEventListener('error', (errorEvent) => {
    console.error('[SW] Error:', errorEvent.error);
});
