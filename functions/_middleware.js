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
    newResponse.headers.set("X-XSS-Protection", "1; mode=block");
    newResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    newResponse.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://avatars.githubusercontent.com https://img.shields.io https://images.unsplash.com; connect-src 'self' https://api.github.com ws: wss: https://cloudflareinsights.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com https://avatars.githubusercontent.com https://img.shields.io https://images.unsplash.com; frame-ancestors 'none';");
    
    return newResponse;
}
