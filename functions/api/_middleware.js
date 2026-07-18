// Funciones auxiliares para JWT usando Web Crypto API nativa (compatible con Cloudflare Workers)
function base64UrlEncode(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) {
        str += "=";
    }
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function getCryptoKey(secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

export async function signJwt(payload, secret) {
    const header = { alg: "HS256", typ: "JWT" };
    const encoder = new TextEncoder();
    
    const part1 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const part2 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
    
    const key = await getCryptoKey(secret);
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(`${part1}.${part2}`)
    );
    
    const part3 = base64UrlEncode(signature);
    return `${part1}.${part2}.${part3}`;
}

export async function verifyJwt(token, secret) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        
        const [part1, part2, part3] = parts;
        const encoder = new TextEncoder();
        
        const key = await getCryptoKey(secret);
        const signatureBytes = base64UrlDecode(part3);
        
        const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            signatureBytes,
            encoder.encode(`${part1}.${part2}`)
        );
        
        if (!isValid) return null;
        
        const payloadJson = new TextDecoder().decode(base64UrlDecode(part2));
        const payload = JSON.parse(payloadJson);
        
        // Comprobar expiración
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null;
        }
        
        return payload;
    } catch (e) {
        return null;
    }
}

// Extraer cookies de una petición
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

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // Rutas públicas que no requieren autenticación
    const publicPaths = ["/api/login", "/api/session", "/api/logout"];
    if (publicPaths.includes(url.pathname)) {
        return await context.next();
    }
    
    // Verificar JWT_SECRET en las variables de entorno
    if (!env.JWT_SECRET) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado: falta JWT_SECRET" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    // Obtener la cookie de sesión
    const token = getCookie(request, "session");
    if (!token) {
        return new Response(JSON.stringify({ error: "No autorizado: sesión no iniciada" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    // Verificar el token
    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload) {
        return new Response(JSON.stringify({ error: "Sesión expirada o inválida" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    // Guardar el payload en los datos del contexto para que las rutas hijas lo usen
    context.data.session = payload;
    
    return await context.next();
}
