import { verifyJwt } from "./_middleware.js";

function getCookie(request, name) {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(";");
    for (let cookie of cookies) {
        const [key, val] = cookie.trim().split("=");
        if (key === name) {
            return decodeURIComponent(val);
        }
    }
    return null;
}

export async function onRequestGet(context) {
    const { request, env } = context;
    
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
    if (!payload) {
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
