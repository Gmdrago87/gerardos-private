/**
 * API Middleware for authentication and authorization
 * Enhanced with better security checks and error handling
 */

import { jsonResponse } from "../_shared/http.js";
import { verifyJwt } from "../_shared/jwt.js";
import { isAllowedUser, getRepoOwner } from "../_shared/github.js";
import { getCookie, clearCookie } from "../_shared/cookies.js";
import { AuthError, ForbiddenError, ServerConfigError, handleError } from "../_shared/errors.js";
import { applyRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.js";

// Public paths that don't require authentication
const PUBLIC_PATHS = new Set([
    "/api/session",
    "/api/logout",
    "/api/oauth/login",
    "/api/oauth/callback",
    "/api/version"
]);

// Safe HTTP methods
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Allowed Sec-Fetch-Site values
const ALLOWED_SEC_FETCH_SITE = new Set(["same-origin", "same-site", "none"]);

// Rate limit configuration for different endpoints
const RATE_LIMITS = {
    "/api/oauth/login": { limit: 5, window: 60 * 1000 }, // 5 requests per minute
    "/api/oauth/callback": { limit: 5, window: 60 * 1000 },
    "/api/repos": { limit: 30, window: 60 * 1000 },
    "/api/repos/*": { limit: 60, window: 60 * 1000 },
    "/api/session": { limit: 10, window: 60 * 1000 },
    "default": { limit: 100, window: 60 * 1000 }
};

/**
 * Get rate limit config for a path
 * @param {string} path - Request path
 * @returns {Object} Rate limit config
 */
function getRateLimitConfig(path) {
    for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
        if (pattern === path) return config;
        if (pattern.endsWith('*') && path.startsWith(pattern.slice(0, -1))) {
            return config;
        }
    }
    return RATE_LIMITS.default;
}

/**
 * Check if request is same origin
 * @param {Request} request - The request
 * @param {string} origin - Expected origin
 * @returns {boolean} True if same origin
 */
function isSameOriginRequest(request, origin) {
    const reqOrigin = request.headers.get("Origin");
    if (reqOrigin && reqOrigin !== origin) return false;

    const secFetchSite = request.headers.get("Sec-Fetch-Site");
    if (secFetchSite && !ALLOWED_SEC_FETCH_SITE.has(secFetchSite)) return false;

    return true;
}

/**
 * Get endpoint from path for rate limiting
 * @param {string} path - Request path
 * @returns {string} Endpoint identifier
 */
function getEndpointForRateLimit(path) {
    if (path.startsWith('/api/repos/')) {
        return '/api/repos/*';
    }
    return path;
}

/**
 * Validate request origin and headers
 * @param {Request} request - The request
 * @param {URL} url - Parsed URL
 * @returns {boolean} True if valid
 */
function validateRequestHeaders(request, url) {
    // Check for suspicious headers
    const suspiciousHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'cf-connecting-ip'
    ];
    
    for (const header of suspiciousHeaders) {
        const value = request.headers.get(header);
        if (value && value.includes('localhost') && url.hostname !== 'localhost') {
            return false;
        }
    }
    
    return true;
}

/**
 * API Middleware
 */
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // Apply rate limiting first
    const endpoint = getEndpointForRateLimit(path);
    const rateLimitConfig = getRateLimitConfig(endpoint);
    const rateLimitResponse = await applyRateLimit(request, endpoint, { ...rateLimitConfig, env });
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    console.log(`[Backend Middleware] Request ${request.method} ${path}`);

    // Fast path for public routes
    if (PUBLIC_PATHS.has(path)) {
        console.log(`[Backend Middleware] Public path accessed: ${path}`);
        const response = await context.next();
        
        // Add rate limit headers to response
        const rateLimitHeaders = await getRateLimitHeaders(request, endpoint, { ...rateLimitConfig, env });
        const newResponse = new Response(response.body, response);
        for (const [key, value] of Object.entries(rateLimitHeaders)) {
            newResponse.headers.set(key, value);
        }
        
        return newResponse;
    }

    // Check for JWT secret
    if (!env.JWT_SECRET) {
        console.error('[Backend Middleware] Error: JWT_SECRET is missing in env!');
        return jsonResponse({
            error: "Servidor desconfigurado: falta JWT_SECRET",
            code: "SERVER_MISCONFIGURED",
            documentation: "https://github.com/Gmdrago87/gerardos-private#configuraci\u00f3n"
        }, 500);
    }

    // Validate request headers
    if (!validateRequestHeaders(request, url)) {
        return jsonResponse({
            error: "Solicitud sospechosa detectada",
            code: "SUSPICIOUS_REQUEST"
        }, 403);
    }

    // Validate CSRF/Origin for mutable methods
    if (!SAFE_METHODS.has(request.method) && !isSameOriginRequest(request, url.origin)) {
        return jsonResponse({
            error: "Origen no permitido",
            code: "CSRF_INVALID"
        }, 403);
    }

    // Get session cookie
    const token = getCookie(request, "session");
    if (!token) {
        return jsonResponse({
            error: "No autorizado: sesi\u00f3n no iniciada",
            code: "NO_SESSION"
        }, 401);
    }

    // Verify JWT
    let payload;
    try {
        payload = await verifyJwt(token, env.JWT_SECRET);
    } catch (e) {
        // Clear invalid session cookie
        const responseHeaders = new Headers();
        clearCookie(responseHeaders, "session", {
            path: '/',
            secure: url.protocol === 'https:',
            sameSite: 'Strict'
        });
        
        return new Response(JSON.stringify({
            error: "Sesi\u00f3n inv\u00e1lida o expirada",
            code: "INVALID_SESSION"
        }), {
            status: 401,
            headers: responseHeaders
        });
    }

    if (!payload || !payload.github_token || typeof payload.sub !== "string" || !isAllowedUser(payload.sub, env)) {
        // Clear invalid session cookie
        const responseHeaders = new Headers();
        clearCookie(responseHeaders, "session", {
            path: '/',
            secure: url.protocol === 'https:',
            sameSite: 'Strict'
        });
        
        return jsonResponse({
            error: payload ? "Usuario no autorizado" : "Sesi\u00f3n expirada o inv\u00e1lida",
            code: payload ? "FORBIDDEN" : "INVALID_SESSION"
        }, 401);
    }

    // Check if token is about to expire (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp - now < 300) { // 5 minutes
        // Token is about to expire, but we still allow the request
        // The frontend should handle refresh
        console.warn(`[API] Token expiring soon for user: ${payload.sub}`);
    }

    // Attach session to context
    context.data = {
        ...context.data,
        session: payload,
        repoOwner: getRepoOwner({ ...context, data: { session: payload } })
    };

    // Process request
    const response = await context.next();
    
    // Add rate limit headers to response
    const rateLimitHeaders = await getRateLimitHeaders(request, endpoint, { ...rateLimitConfig, env });
    const newResponse = new Response(response.body, response);
    for (const [key, value] of Object.entries(rateLimitHeaders)) {
        newResponse.headers.set(key, value);
    }
    
    return newResponse;
}
