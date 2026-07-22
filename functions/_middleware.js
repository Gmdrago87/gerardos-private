// Cabeceras estáticas congeladas para evitar recreación de objetos en memory hot paths
const SECURITY_HEADERS = Object.freeze({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), notifications=(), midi=(), sync-xhr=(), usb=()",
    "Access-Control-Allow-Origin": "https://gerardos-private.pages.dev",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://d3js.org https://static.cloudflareinsights.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://avatars.githubusercontent.com https://raw.githubusercontent.com https://img.shields.io https://images.unsplash.com; connect-src 'self' https://api.github.com https://avatars.githubusercontent.com https://raw.githubusercontent.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://images.unsplash.com ws: wss: https://cloudflareinsights.com; frame-ancestors 'none'; upgrade-insecure-requests;"
});

export async function onRequest(context) {
    const urlStr = context.request.url;
    const url = new URL(urlStr);
    const path = url.pathname;
    
    // Rate limiting
    if (context.env.RATE_LIMIT_KV) {
        const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";
        const rateLimitedPaths = ["/api/oauth/login", "/api/oauth/callback", "/api/repos"];
        
        if (rateLimitedPaths.some(p => path.startsWith(p))) {
            const key = `rate_limit:${ip}:${path}`;
            const limit = 10;
            const window = 60;
            
            const currentStr = await context.env.RATE_LIMIT_KV.get(key);
            let current = { count: 0 };
            if (currentStr) {
                try { current = JSON.parse(currentStr); } catch (e) {}
            }
            
            if (current.count >= limit) {
                return new Response("Too many requests", { status: 429 });
            }
            
            await context.env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: current.count + 1 }), {
                expirationTtl: window
            });
        }
    }

    const response = await context.next();
    const newResponse = new Response(response.body, response);
    const { headers } = newResponse;

    // Chequeo de extensión optimizado sin instanciar new URL()
    if (urlStr.endsWith(".css")) {
        headers.set("Content-Type", "text/css; charset=utf-8");
    } else if (urlStr.endsWith(".js")) {
        headers.set("Content-Type", "application/javascript; charset=utf-8");
    }

    // Inyectar cabeceras de seguridad optimizadas
    for (const key in SECURITY_HEADERS) {
        headers.set(key, SECURITY_HEADERS[key]);
    }

    return newResponse;
}

