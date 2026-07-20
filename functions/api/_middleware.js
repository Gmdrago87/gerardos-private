import { verifyJwt } from "../_shared/jwt.js";

// Extraer cookies de una petición
function getCookie(request, name) {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(";");
    for (let cookie of cookies) {
        const trimmed = cookie.trim();
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx);
            const val = trimmed.substring(eqIdx + 1);
            if (key === name) {
                return decodeURIComponent(val);
            }
        }
    }
    return null;
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    console.log(`[API Middleware] Interceptando petición a: ${url.pathname}`);
    
    // Rutas públicas que no requieren autenticación
    const publicPaths = ["/api/session", "/api/logout", "/api/oauth/login", "/api/oauth/callback", "/api/version"];
    if (publicPaths.includes(url.pathname)) {
        console.log(`[API Middleware] Ruta pública permitida: ${url.pathname}`);
        return await context.next();
    }
    
    // Verificar JWT_SECRET en las variables de entorno
    if (!env.JWT_SECRET) {
        console.error(`[API Middleware] Error: JWT_SECRET no configurado`);
        return new Response(JSON.stringify({ error: "Servidor desconfigurado: falta JWT_SECRET" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    // Obtener la cookie de sesión
    const token = getCookie(request, "session");
    if (!token) {
        console.log(`[API Middleware] Denegado en ${url.pathname}: No hay cookie de sesión`);
        return new Response(JSON.stringify({ error: "No autorizado: sesión no iniciada" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    // Verificar el token
    const payload = await verifyJwt(token, env.JWT_SECRET);
    // IMPORTANTE: Exigir que exista github_token para invalidar sesiones antiguas de contraseña
    if (!payload || !payload.github_token) {
        console.log(`[API Middleware] Denegado en ${url.pathname}: Token inválido o sin github_token`);
        return new Response(JSON.stringify({ error: "Sesión expirada o inválida (falta token de OAuth)" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    console.log(`[API Middleware] Acceso autenticado concedido para: ${payload.sub} en ${url.pathname}`);
    // Guardar el payload en los datos del contexto para que las rutas hijas lo usen
    context.data.session = payload;
    
    return await context.next();
}
