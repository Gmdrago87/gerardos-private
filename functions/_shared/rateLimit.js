/**
 * Rate limiting utilities for API endpoints
 * Uses in-memory storage for development (use KV in production)
 */

// Rate limit configuration
const DEFAULT_LIMIT = 60; // requests
const DEFAULT_WINDOW = 60 * 1000; // 1 minute in ms

// In-memory storage for rate limiting (use KV in production)
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
}

/**
 * Get rate limit key for an IP
 * @param {string} ip - IP address
 * @param {string} endpoint - API endpoint
 * @returns {string} Rate limit key
 */
function getRateLimitKey(ip, endpoint) {
    return `${ip}:${endpoint}`;
}

/**
 * Check rate limit for a request
 * @param {Request} request - The incoming request
 * @param {string} endpoint - The API endpoint
 * @param {Object} options - Rate limit options
 * @param {number} [options.limit] - Max requests per window
 * @param {number} [options.window] - Window size in ms
 * @returns {Object} Rate limit info
 */
export function checkRateLimit(request, endpoint, options = {}) {
    const limit = options.limit || DEFAULT_LIMIT;
    const window = options.window || DEFAULT_WINDOW;
    
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For')?.split(',')[0] || 
               'unknown';
    
    const key = getRateLimitKey(ip, endpoint);
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    if (!entry) {
        entry = new RateLimitEntry(limit, window);
        rateLimitStore.set(key, entry);
    }
    
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
 * @returns {Response|null} Error response if rate limited, null otherwise
 */
export function applyRateLimit(request, endpoint, options = {}) {
    const rateLimit = checkRateLimit(request, endpoint, options);
    
    if (!rateLimit.isAllowed) {
        const retryAfter = rateLimit.retryAfter;
        
        return new Response(JSON.stringify({
            error: 'Demasiadas peticiones',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter
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
               request.headers.get('X-Forwarded-For')?.split(',')[0] || 
               'unknown';
    const key = getRateLimitKey(ip, endpoint);
    const entry = rateLimitStore.get(key);
    if (entry) {
        entry.addRequest(Date.now());
    }
    
    return null;
}

/**
 * Get rate limit headers for a response
 * @param {Request} request - The incoming request
 * @param {string} endpoint - The API endpoint
 * @returns {Object} Headers object
 */
export function getRateLimitHeaders(request, endpoint) {
    const rateLimit = checkRateLimit(request, endpoint);
    
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
