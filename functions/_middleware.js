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
    
    return newResponse;
}
