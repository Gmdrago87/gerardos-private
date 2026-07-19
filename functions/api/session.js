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
            if (key === name) {
                return decodeURIComponent(val);
            }
        }
    }
    return null;
}

export async function onRequestGet(context) {
    const { request, env } = context;
    console.log("[API] Verificando sesión actual en /api/session");
    
    if (!env.JWT_SECRET) {
        return new Response(JSON.stringify({ authenticated: false, error: "JWT_SECRET no configurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    const token = getCookie(request, "session");
    if (!token) {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload || !payload.github_token) {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    return new Response(JSON.stringify({
        authenticated: true,
        username: payload.sub
    }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
}
