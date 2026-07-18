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

// Limpiar el hash de cualquier basura que Cloudflare pueda haber inyectado
function cleanHashString(raw) {
    // Eliminar TODOS los caracteres de espacio, salto de línea, retorno de carro, tabulaciones, comillas
    return raw.replace(/[\s\r\n\t"']/g, '');
}

// Verificar contraseña usando PBKDF2 nativo compatible con el generador
async function verifyPassword(password, storedHashString) {
    try {
        // Limpiar el hash agresivamente
        const cleaned = cleanHashString(storedHashString);
        
        const parts = cleaned.split(":");
        if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") {
            return { valid: false, debug: `parts=${parts.length}, p0=${parts[0]}, p1=${parts[1]}, cleaned_len=${cleaned.length}` };
        }
        
        const iterations = parseInt(parts[2], 10);
        const saltHex = parts[3];
        const storedHashHex = parts[4];
        
        // Validar que sal y hash son hexadecimales válidos
        if (!/^[0-9a-fA-F]+$/.test(saltHex) || !/^[0-9a-fA-F]+$/.test(storedHashHex)) {
            return { valid: false, debug: `invalid_hex salt_len=${saltHex.length} hash_len=${storedHashHex.length}` };
        }
        
        const saltBytes = hexToBytes(saltHex);
        
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
        const matches = constantTimeCompare(derivedHex, storedHashHex);
        
        return { valid: matches, debug: `iter=${iterations} salt_len=${saltHex.length} stored_len=${storedHashHex.length} derived_len=${derivedHex.length} match=${matches}` };
    } catch (e) {
        return { valid: false, debug: `exception: ${e.message}` };
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    // Verificar configuración
    if (!env.PASSWORD_HASH || !env.JWT_SECRET || !env.GITHUB_USERNAME) {
        const missing = [];
        if (!env.PASSWORD_HASH) missing.push("PASSWORD_HASH");
        if (!env.JWT_SECRET) missing.push("JWT_SECRET");
        if (!env.GITHUB_USERNAME) missing.push("GITHUB_USERNAME");
        return new Response(JSON.stringify({ error: `Servidor desconfigurado: faltan ${missing.join(", ")}` }), {
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
        
        // Verificar contraseña con diagnóstico
        const result = await verifyPassword(password, env.PASSWORD_HASH);
        
        if (!result.valid) {
            // Incluir info de diagnóstico (sin revelar datos sensibles)
            const rawLen = env.PASSWORD_HASH.length;
            const cleanedLen = cleanHashString(env.PASSWORD_HASH).length;
            const hasNewlines = env.PASSWORD_HASH.includes('\n') || env.PASSWORD_HASH.includes('\r');
            const hasQuotes = env.PASSWORD_HASH.includes('"') || env.PASSWORD_HASH.includes("'");
            
            return new Response(JSON.stringify({ 
                error: "Contraseña incorrecta",
                _diag: {
                    raw_len: rawLen,
                    clean_len: cleanedLen,
                    has_newlines: hasNewlines,
                    has_quotes: hasQuotes,
                    verify_debug: result.debug,
                    hash_preview: cleanHashString(env.PASSWORD_HASH).substring(0, 30) + "..."
                }
            }), {
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
