/**
 * Rate limiting utilities for API endpoints
 * Uses KV storage when available, falls back to in-memory for development
 */

// Rate limit configuration
const DEFAULT_LIMIT = 60; // requests
const DEFAULT_WINDOW = 60 * 1000; // 1 minute in ms

// In-memory storage for rate limiting (fallback when KV not available)
const rateLimitStore = new Map();

/**
 * Rate limit entry
 */
class RateLimitEntry {
    constructor(limit, window) {
        this.limit = limit;
        this.window = window;
        this.requests = [];
    }

    addRequest(timestamp) {
        // Remove old requests
        this.requests = this.requests.filter(req => timestamp - req < this.window);
        this.requests.push(timestamp);
    }

    getRemaining(timestamp) {
        this.requests = this.requests.filter(req => timestamp - req < this.window);
        return Math.max(0, this.limit - this.requests.length);
    }

    isAllowed(timestamp) {
        this.requests = this.requests.filter(req => timestamp - req < this.window);
        return this.requests.length < this.limit;
    }

    getResetTime(timestamp) {
        if (this.requests.length === 0) return timestamp;
        
        const oldest = this.requests[0];
        return oldest + this.window;
    }

    toJSON() {
        return {
            limit: this.limit,
            window: this.window,
            requests: this.requests
        };
    }

    static fromJSON(data) {
        const entry = new RateLimitEntry(data.limit, data.window);
        entry.requests = data.requests || [];
        return entry;
    }
}

/**
 * Get rate limit key for an IP and endpoint
 * @param {string} ip - IP address
 * @param {string} endpoint - API endpoint
 * @returns {string} Rate limit key
 */
function getRateLimitKey(ip, endpoint) {
    return `ratelimit:${ip}:${endpoint}`;
}

/**
 * Get or create rate limit entry from KV or memory
 * @param {Object} env - Environment with KV binding
 * @param {string} ip - IP address
 * @param {string} endpoint - API endpoint
 * @param {number} limit - Max requests per window
 * @param {number} window - Window size in ms
 * @returns {Promise<RateLimitEntry>} Rate limit entry
 */
async function getRateLimitEntry(env, ip, endpoint, limit, window) {
    const key = getRateLimitKey(ip, endpoint);
    
    // Try KV storage first
    if (env.CACHE_KV) {
        try {
            const data = await env.CACHE_KV.get(key, { type: 'json' });
            if (data) {
                const entry = RateLimitEntry.fromJSON(data);
                // Clean up old requests
                const now = Date.now();
                entry.requests = entry.requests.filter(req => now - req < entry.window);
                return entry;
            }
        } catch (e) {
            console.warn('[RateLimit] KV storage error, falling back to memory:', e.message);
        }
    }
    
    // Fallback to in-memory
    let entry = rateLimitStore.get(key);
    if (!entry) {
        entry = new RateLimitEntry(limit, window);
        rateLimitStore.set(key, entry);
    }
    
    return entry;
}

/**
 * Save rate limit entry to KV or memory
 * @param {Object} env - Environment with KV binding
 * @param {string} ip - IP address
 * @param {string} endpoint - API endpoint
 * @param {RateLimitEntry} entry - Rate limit entry
 */
async function saveRateLimitEntry(env, ip, endpoint, entry) {
    const key = getRateLimitKey(ip, endpoint);
    
    // Try KV storage first
    if (env.CACHE_KV) {
        try {
            await env.CACHE_KV.put(key, JSON.stringify(entry.toJSON()), {
                expirationTtl: Math.ceil(entry.window / 1000) + 60 // Add 1 minute buffer
            });
        } catch (e) {
            console.warn('[RateLimit] KV storage error, using memory:', e.message);
        }
    }
    
    // Always update in-memory
    rateLimitStore.set(key, entry);
}

/**
 * Check rate limit for a request
 * @param {Request} request - The incoming request
 * @param {string} endpoint - The API endpoint
 * @param {Object} options - Rate limit options
 * @param {number} [options.limit] - Max requests per window
 * @param {number} [options.window] - Window size in ms
 * @param {Object} [options.env] - Environment with KV binding
 * @returns {Promise<Object>} Rate limit info
 */
export async function checkRateLimit(request, endpoint, options = {}) {
    const limit = options.limit || DEFAULT_LIMIT;
    const window = options.window || DEFAULT_WINDOW;
    const env = options.env || {};
    
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
               request.headers.get('X-Real-IP') || 
               'unknown';
    
    const key = getRateLimitKey(ip, endpoint);
    const now = Date.now();
    
    const entry = await getRateLimitEntry(env, ip, endpoint, limit, window);
    
    const isAllowed = entry.isAllowed(now);
    const remaining = entry.getRemaining(now);
    const resetTime = entry.getResetTime(now);
    
    return {
        isAllowed,
        remaining,
        limit,
        resetTime,
        retryAfter: isAllowed ? 0 : Math.ceil((resetTime - now) / 1000)
    };
}

/**
 * Apply rate limiting to a request
 * @param {Request} request - The incoming request
 * @param {string} endpoint - The API endpoint
 * @param {Object} options - Rate limit options
 * @param {Object} [options.env] - Environment with KV binding
 * @returns {Promise<Response|null>} Error response if rate limited, null otherwise
 */
export async function applyRateLimit(request, endpoint, options = {}) {
    const rateLimit = await checkRateLimit(request, endpoint, options);
    
    if (!rateLimit.isAllowed) {
        const retryAfter = rateLimit.retryAfter;
        
        return new Response(JSON.stringify({
            error: 'Demasiadas peticiones',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter,
            limit: rateLimit.limit,
            resetAt: new Date(rateLimit.resetTime).toISOString()
        }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfter),
                'X-RateLimit-Limit': String(rateLimit.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000))
            }
        });
    }
    
    // Record the request
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
               request.headers.get('X-Real-IP') || 
               'unknown';
    const key = getRateLimitKey(ip, endpoint);
    const env = options.env || {};
    const entry = await getRateLimitEntry(env, ip, endpoint, rateLimit.limit, rateLimit.window);
    entry.addRequest(Date.now());
    await saveRateLimitEntry(env, ip, endpoint, entry);
    
    return null;
}

/**
 * Get rate limit headers for a response
 * @param {Request} request - The incoming request
 * @param {string} endpoint - The API endpoint
 * @param {Object} options - Rate limit options
 * @returns {Promise<Object>} Headers object
 */
export async function getRateLimitHeaders(request, endpoint, options = {}) {
    const rateLimit = await checkRateLimit(request, endpoint, options);
    
    return {
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000))
    };
}

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore() {
    rateLimitStore.clear();
}
