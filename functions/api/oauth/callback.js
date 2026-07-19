import { signJwt } from "../../_shared/jwt.js";

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    console.log(`[API] OAuth Callback recibido en: ${url.pathname}`);
    
    // Función auxiliar para obtener cookies
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

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const storedState = getCookie(request, "oauth_state");
    console.log(`[API] Código extraído: ${code ? "SÍ (oculto)" : "NO"}`);

    if (!code) {
        console.error("[API] Error: Falta el código de autorización.");
        return new Response("Falta el código de autorización.", { status: 400 });
    }

    if (!state || state !== storedState) {
        console.error("[API] Error: Token CSRF (state) inválido o expirado.");
        return new Response("Error de seguridad: la sesión de login expiró o es inválida.", { status: 403 });
    }

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.JWT_SECRET || !env.GITHUB_USERNAME) {
        console.error("[API] Error: Faltan variables OAuth en env.");
        return new Response("El servidor no está configurado correctamente (faltan variables OAuth).", { status: 500 });
    }

    try {
        console.log("[API] Intercambiando 'code' por 'access_token' en GitHub...");
        // 1. Intercambiar el 'code' por un 'access_token'
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code: code
            })
        });

        const tokenData = await tokenRes.json();
        
        if (tokenData.error) {
            console.error(`[API] Error de GitHub OAuth: ${tokenData.error_description}`);
            return new Response(`Error al autenticar con GitHub. Por favor, inténtalo de nuevo.`, { status: 400 });
        }

        const accessToken = tokenData.access_token;
        console.log("[API] Access token recibido correctamente.");

        console.log("[API] Verificando identidad del usuario en GitHub...");
        // 2. Verificar la identidad del usuario en GitHub
        const userRes = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "User-Agent": "GerardOS-Private-Dashboard"
            }
        });

        const userData = await userRes.json();
        console.log(`[API] Usuario de GitHub detectado: ${userData.login}`);

        // 3. Control de acceso estricto
        // Solo el dueño configurado en las variables de entorno puede acceder
        if (userData.login.toLowerCase() !== env.GITHUB_USERNAME.toLowerCase()) {
            console.error(`[API] Acceso Denegado. Esperado: ${env.GITHUB_USERNAME}, Recibido: ${userData.login}`);
            return new Response(`Acceso Denegado. Este panel es privado y no estás autorizado.`, { status: 403 });
        }

        console.log("[API] Generando sesión local JWT...");

        // 4. Generar la sesión local JWT inyectando el access_token de GitHub
        const payload = {
            sub: userData.login,
            github_token: accessToken,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 horas de sesión
        };
        
        const jwt = await signJwt(payload, env.JWT_SECRET);
        console.log("[API] Sesión generada correctamente. Redirigiendo al inicio.");

        // 5. Establecer la cookie y redirigir al inicio, además de limpiar oauth_state
        const isProduction = env.NODE_ENV === "production";
        let cookieString = `session=${encodeURIComponent(jwt)}; Path=/; HttpOnly; SameSite=Strict`;
        let clearStateCookie = `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
        
        if (isProduction || request.url.startsWith("https://")) {
            cookieString += "; Secure";
            clearStateCookie += "; Secure";
        }

        const responseHeaders = new Headers();
        responseHeaders.set("Location", "/");
        responseHeaders.append("Set-Cookie", cookieString);
        responseHeaders.append("Set-Cookie", clearStateCookie);

        return new Response(null, {
            status: 302,
            headers: responseHeaders
        });

    } catch (e) {
        console.error(`[API] Excepción procesando el login con GitHub: ${e.message}`);
        return new Response("Error interno del servidor durante el login.", { status: 500 });
    }
}
