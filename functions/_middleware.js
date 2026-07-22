/**
 * Global Middleware for security headers and content type handling
 * Enhanced with stricter CSP and security best practices
 */

// Frozen security headers for performance
const SECURITY_HEADERS = Object.freeze({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Content-Security-Policy": 
        "default-src 'self'; " +
        "base-uri 'self'; " +
        "object-src 'none'; " +
        "form-action 'self'; " +
        "script-src 'self' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://d3js.org https://static.cloudflareinsights.com; " +
        "script-src-elem 'self' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://d3js.org https://static.cloudflareinsights.com; " +
        "worker-src 'self' blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com; " +
        "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
        "img-src 'self' data: blob: https://avatars.githubusercontent.com https://raw.githubusercontent.com https://img.shields.io https://images.unsplash.com; " +
        "connect-src 'self' https://api.github.com https://avatars.githubusercontent.com https://raw.githubusercontent.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://images.unsplash.com https://fonts.googleapis.com https://fonts.gstatic.com https://d3js.org https://static.cloudflareinsights.com https://cloudflareinsights.com ws: wss:; " +
        "frame-ancestors 'none'; " +
        "upgrade-insecure-requests; " +
        "block-all-mixed-content; " +
        "require-sri-for script style;"
});

// Content types for static files
const CONTENT_TYPES = Object.freeze({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
});

export async function onRequest(context) {
    const response = await context.next();
    const { headers } = new Response(response.body, response);
    const urlStr = context.request.url;

    // Set content type based on file extension
    const url = new URL(urlStr);
    const path = url.pathname;
    
    for (const [ext, contentType] of Object.entries(CONTENT_TYPES)) {
        if (path.endsWith(ext)) {
            headers.set("Content-Type", contentType);
            break;
        }
    }

    // Inject security headers
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        // Don't override existing headers
        if (!headers.has(key)) {
            headers.set(key, value);
        }
    }

    // Add cache control for static assets
    if (path.startsWith('/') && !path.startsWith('/api/')) {
        const isHtml = path.endsWith('.html') || path === '/';
        const isBundle = path.includes('bundle.js') || path.includes('bundle.js.map') || path.includes('style.min.css');
        const cacheDuration = isHtml ? 300 : (isBundle ? 31536000 : 86400); // 5 min for HTML, 1 year for bundles, 1 day for others
        headers.set("Cache-Control", `public, max-age=${cacheDuration}, immutable`);
    }

    // Remove server information
    headers.delete("Server");
    headers.delete("X-Powered-By");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}
