export async function onRequest(context) {
    const response = await context.next();
    const newResponse = new Response(response.body, response);
    
    // Fix para local dev (Wrangler + Windows): Forzar el Content-Type correcto para CSS y JS
    // para que la cabecera nosniff no bloquee los estilos o scripts.
    const url = new URL(context.request.url);
    if (url.pathname.endsWith(".css")) {
        newResponse.headers.set("Content-Type", "text/css; charset=utf-8");
    } else if (url.pathname.endsWith(".js")) {
        newResponse.headers.set("Content-Type", "application/javascript; charset=utf-8");
    }
    
    // Configurar cabeceras de seguridad para todas las respuestas
    newResponse.headers.set("X-Content-Type-Options", "nosniff");
    newResponse.headers.set("X-Frame-Options", "DENY");
    newResponse.headers.set("X-XSS-Protection", "0");
    newResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    newResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    newResponse.headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://d3js.org https://static.cloudflareinsights.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://avatars.githubusercontent.com https://raw.githubusercontent.com https://img.shields.io https://images.unsplash.com; connect-src 'self' https://api.github.com https://avatars.githubusercontent.com https://raw.githubusercontent.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://images.unsplash.com ws: wss: https://cloudflareinsights.com; frame-ancestors 'none'; upgrade-insecure-requests;");
    
    return newResponse;
}
