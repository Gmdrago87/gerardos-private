/**
 * Utilities for handling cookies in Cloudflare Workers
 */

/**
 * Get a cookie value by name from the request
 * @param {Request} request - The incoming request
 * @param {string} name - The cookie name to retrieve
 * @returns {string|null} The cookie value or null if not found
 */
export function getCookie(request, name) {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;

    return cookieHeader
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(`${name}=`))
        ?.split('=')[1] || null;
}

/**
 * Set a cookie in the response headers
 * @param {Headers} headers - Response headers to modify
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} options - Cookie options
 * @param {number} [options.maxAge] - Max age in seconds
 * @param {string} [options.path] - Cookie path
 * @param {boolean} [options.secure] - Secure flag
 * @param {boolean} [options.httpOnly] - HttpOnly flag
 * @param {'Strict'|'Lax'|'None'} [options.sameSite] - SameSite policy
 */
export function setCookie(headers, name, value, options = {}) {
    const {
        maxAge = 0,
        path = '/',
        secure = false,
        httpOnly = true,
        sameSite = 'Strict'
    } = options;

    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    cookie += `; Path=${path}`;
    cookie += `; HttpOnly=${httpOnly}`;
    cookie += `; SameSite=${sameSite}`;
    
    if (maxAge > 0) {
        cookie += `; Max-Age=${maxAge}`;
    }
    
    if (secure) {
        cookie += '; Secure';
    }

    headers.append('Set-Cookie', cookie);
}

/**
 * Clear a cookie by setting it to empty with Max-Age=0
 * @param {Headers} headers - Response headers to modify
 * @param {string} name - Cookie name to clear
 * @param {Object} options - Cookie options (path, secure, sameSite)
 */
export function clearCookie(headers, name, options = {}) {
    const {
        path = '/',
        secure = false,
        sameSite = 'Lax'
    } = options;

    const cookie = `${encodeURIComponent(name)}=; Path=${path}; SameSite=${sameSite}; Max-Age=0`;
    if (secure) {
        cookie += '; Secure';
    }
    headers.append('Set-Cookie', cookie);
}

/**
 * Parse all cookies from request into an object
 * @param {Request} request - The incoming request
 * @returns {Object} Object with cookie names as keys
 */
export function parseCookies(request) {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return {};

    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) {
            cookies[name] = rest.join('=');
        }
    });
    return cookies;
}
