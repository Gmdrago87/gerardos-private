import { signJwt } from "../../_shared/jwt.js";

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    console.log(`[API] OAuth Callback recibido en: ${url.pathname}`);
    
    const code = url.searchParams.get("code");
    console.log(`[API] Código extraído: ${code ? "SÍ (oculto)" : "NO"}`);

    if (!code) {
        console.error("[API] Error: Falta el código de autorización.");
        return new Response("Falta el código de autorización.", { status: 400 });
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
            return new Response(`Error de OAuth: ${tokenData.error_description}`, { status: 400 });
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
            return new Response(`Acceso Denegado. Este panel pertenece a ${env.GITHUB_USERNAME}. Tú has iniciado sesión como ${userData.login}.`, { status: 403 });
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

        // 5. Establecer la cookie y redirigir al inicio
        const isProduction = env.NODE_ENV === "production";
        let cookieString = `session=${encodeURIComponent(jwt)}; Path=/; HttpOnly; SameSite=Lax`;
        if (isProduction || request.url.startsWith("https://")) {
            cookieString += "; Secure";
        }

        return new Response("", {
            status: 302,
            headers: {
                "Location": "/",
                "Set-Cookie": cookieString
            }
        });

    } catch (e) {
        console.error(`[API] Excepción procesando el login con GitHub: ${e.message}`);
        return new Response("Error procesando el login con GitHub: " + e.message, { status: 500 });
    }
}
