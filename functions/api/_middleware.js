import { jsonResponse } from "../_shared/http.js";
import { verifyJwt } from "../_shared/jwt.js";

const PUBLIC_PATHS = new Set([
    "/api/session",
    "/api/logout",
    "/api/oauth/login",
    "/api/oauth/callback",
    "/api/version"
]);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ALLOWED_SEC_FETCH_SITE = new Set(["same-origin", "same-site", "none"]);

function getCookie(request, name) {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;

    let start = 0;
    const len = cookieHeader.length;
    while (start < len) {
        let end = cookieHeader.indexOf(";", start);
        if (end === -1) end = len;
        
        const cookie = cookieHeader.substring(start, end).trim();
        const eqIdx = cookie.indexOf("=");
        if (eqIdx !== -1 && cookie.substring(0, eqIdx) === name) {
            return decodeURIComponent(cookie.substring(eqIdx + 1));
        }
        start = end + 1;
    }
    return null;
}

function isSameOriginRequest(request, origin) {
    const reqOrigin = request.headers.get("Origin");
    if (reqOrigin && reqOrigin !== origin) return false;

    const secFetchSite = request.headers.get("Sec-Fetch-Site");
    if (secFetchSite && !ALLOWED_SEC_FETCH_SITE.has(secFetchSite)) return false;

    return true;
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // O(1) fast path para rutas públicas
    if (PUBLIC_PATHS.has(url.pathname)) {
        return context.next();
    }

    if (!env.JWT_SECRET) {
        return jsonResponse({ error: "Servidor desconfigurado" }, 500);
    }

    // Validación CSRF/Origen si es un método mutable
    if (!SAFE_METHODS.has(request.method) && !isSameOriginRequest(request, url.origin)) {
        return jsonResponse({ error: "Origen no permitido" }, 403);
    }

    const token = getCookie(request, "session");
    if (!token) {
        return jsonResponse({ error: "No autorizado: sesión no iniciada" }, 401);
    }

    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload || !payload.github_token || typeof payload.sub !== "string" || payload.sub.toLowerCase() !== env.GITHUB_USERNAME?.toLowerCase()) {
        return jsonResponse({ error: "Sesión expirada o inválida" }, 401);
    }

    context.data.session = payload;
    return context.next();
}

