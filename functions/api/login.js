import { signJwt } from "./_middleware.js";

// Comparación en tiempo constante para evitar ataques de temporización
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// Convertir cadena hexadecimal a Uint8Array
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

// Convertir ArrayBuffer a cadena hexadecimal
function bytesToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// Limpiar el hash de cualquier carácter extraño
function cleanHashString(raw) {
    return raw.replace(/[\s\r\n\t"']/g, '');
}

// Verificar contraseña usando PBKDF2 nativo (máximo 100,000 iteraciones por límite de Cloudflare Workers)
async function verifyPassword(password, storedHashString) {
    try {
        const cleaned = cleanHashString(storedHashString);
        const parts = cleaned.split(":");
        if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") {
            return false;
        }
        
        const iterations = parseInt(parts[2], 10);
        const saltBytes = hexToBytes(parts[3]);
        const storedHashHex = parts[4];
        
        // Importar la contraseña recibida
        const baseKey = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );
        
        // Derivar bits usando la misma sal e iteraciones
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: saltBytes,
                iterations: iterations,
                hash: "SHA-256"
            },
            baseKey,
            256 // 32 bytes * 8 bits
        );
        
        const derivedHex = bytesToHex(derivedBits);
        return constantTimeCompare(derivedHex, storedHashHex);
    } catch (e) {
        console.error("Error verificando contraseña:", e);
        return false;
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    // Verificar configuración
    if (!env.PASSWORD_HASH || !env.JWT_SECRET || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado: faltan variables de entorno básicas" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    try {
        const body = await request.json();
        const { password } = body;
        
        if (!password) {
            return new Response(JSON.stringify({ error: "Se requiere la contraseña" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // Verificar contraseña
        const isValid = await verifyPassword(password, env.PASSWORD_HASH);
        if (!isValid) {
            return new Response(JSON.stringify({ error: "Contraseña incorrecta" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        // Generar JWT
        const payload = {
            sub: env.GITHUB_USERNAME,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
        };
        
        const token = await signJwt(payload, env.JWT_SECRET);
        
        // Configurar cookie httpOnly + Secure + SameSite
        const isProduction = env.NODE_ENV === "production";
        let cookieString = `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
        if (isProduction || request.url.startsWith("https://")) {
            cookieString += "; Secure";
        }
        
        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": cookieString
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: "Formato de petición inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }
}
