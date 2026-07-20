import { jsonResponse } from "../_shared/http.js";
import { verifyJwt } from "../_shared/jwt.js";

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
            if (key === name) return decodeURIComponent(val);
        }
    }
    return null;
}

function isMutatingMethod(method) {
    return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function isSameOriginRequest(request, url) {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return false;

    const secFetchSite = request.headers.get("Sec-Fetch-Site");
    if (secFetchSite && !["same-origin", "same-site", "none"].includes(secFetchSite)) return false;

    return true;
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    console.log(`[API Middleware] Interceptando petición a: ${url.pathname}`);

    const publicPaths = ["/api/session", "/api/logout", "/api/oauth/login", "/api/oauth/callback", "/api/version"];
    if (publicPaths.includes(url.pathname)) {
        console.log(`[API Middleware] Ruta pública permitida: ${url.pathname}`);
        return await context.next();
    }

    if (!env.JWT_SECRET) {
        console.error("[API Middleware] Error: JWT_SECRET no configurado");
        return jsonResponse({ error: "Servidor desconfigurado" }, 500);
    }

    if (isMutatingMethod(request.method) && !isSameOriginRequest(request, url)) {
        console.warn(`[API Middleware] Mutación bloqueada por origen no confiable: ${url.pathname}`);
        return jsonResponse({ error: "Origen no permitido" }, 403);
    }

    const token = getCookie(request, "session");
    if (!token) {
        console.log(`[API Middleware] Denegado en ${url.pathname}: No hay cookie de sesión`);
        return jsonResponse({ error: "No autorizado: sesión no iniciada" }, 401);
    }

    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload || !payload.github_token || typeof payload.sub !== "string" || payload.sub.toLowerCase() !== env.GITHUB_USERNAME?.toLowerCase()) {
        console.log(`[API Middleware] Denegado en ${url.pathname}: Token inválido o usuario no autorizado`);
        return jsonResponse({ error: "Sesión expirada o inválida" }, 401);
    }

    console.log(`[API Middleware] Acceso autenticado concedido para: ${payload.sub} en ${url.pathname}`);
    context.data.session = payload;

    return await context.next();
}
