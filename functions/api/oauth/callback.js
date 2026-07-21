/**
 * OAuth Callback Handler
 * Exchanges GitHub authorization code for access token and creates session
 */

import { signJwt } from "../../_shared/jwt.js";
import { isAllowedUser } from "../../_shared/github.js";
import { getCookie, setCookie, clearCookie } from "../../_shared/cookies.js";
import { ForbiddenError, ValidationError, handleError } from "../../_shared/errors.js";

const STATE_COOKIE_NAME = "oauth_state";
const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION = 60 * 30; // 30 minutes in seconds

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    console.log(`[API] OAuth Callback recibido en: ${url.pathname}`);

    // Get code and state from query params
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const storedState = getCookie(request, STATE_COOKIE_NAME);
    
    console.log(`[API] Código extraído: ${code ? "Sí (oculto)" : "NO"}`);

    // Validate required parameters
    if (!code) {
        console.error("[API] Error: Falta el código de autorización.");
        return new Response("Falta el código de autorización.", { status: 400 });
    }

    if (!state || state !== storedState) {
        console.error("[API] Error: Token CSRF (state) inválido o expirado.");
        return new Response("Error de seguridad: la sesión de login expiró o es inválida.", { status: 403 });
    }

    // Get configuration from environment (NO DEFAULT VALUES - must be configured)
    const clientId = env.GITHUB_CLIENT_ID;
    const clientSecret = env.GITHUB_CLIENT_SECRET;
    const jwtSecret = env.JWT_SECRET;
    const githubUsername = env.GITHUB_USERNAME;

    if (!clientId || !clientSecret || !jwtSecret || !githubUsername) {
        console.error("[API] Error: Faltan variables OAuth en env.");
        return new Response("El servidor no está configurado correctamente (faltan variables OAuth).", { status: 500 });
    }

    try {
        // 1. Exchange code for access token
        console.log("[API] Intercambiando código por token de acceso...");
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code
            })
        });

        const tokenData = await tokenRes.json();
        
        if (!tokenRes.ok || tokenData.error || !tokenData.access_token || tokenData.token_type !== "bearer") {
            console.error(`[API] Error de GitHub OAuth: ${tokenData.error_description || tokenRes.status}`);
            return new Response(`Error al autenticar con GitHub. Por favor, inténtalo de nuevo.`, { status: 400 });
        }

        const accessToken = tokenData.access_token;
        console.log("[API] Access token recibido correctamente.");

        // 2. Verify user identity
        console.log("[API] Verificando identidad del usuario en GitHub...");
        const userRes = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "User-Agent": "GerardOS-Private-Dashboard"
            }
        });

        const userData = await userRes.json();
        if (!userRes.ok || typeof userData.login !== "string") {
            console.error(`[API] Error verificando usuario en GitHub: ${userRes.status}`);
            return new Response("No se pudo verificar la identidad en GitHub.", { status: 502 });
        }
        console.log(`[API] Usuario de GitHub detectado: ${userData.login}`);

        // 3. Access control - only allowed users can access
        if (!isAllowedUser(userData.login, env)) {
            console.error(`[API] Acceso Denegado. Esperado: ${env.GITHUB_USERNAME}, Recibido: ${userData.login}`);
            return new Response(`Acceso Denegado. Este panel es privado y no estás autorizado.`, { status: 403 });
        }

        // 4. Generate JWT session
        const payload = {
            sub: userData.login,
            github_token: accessToken,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + SESSION_DURATION
        };
        
        const jwt = await signJwt(payload, jwtSecret, SESSION_DURATION);
        console.log("[API] Sesión generada correctamente. Redirigiendo al inicio.");

        // 5. Set cookies and redirect
        const isProduction = env.NODE_ENV === "production";
        const responseHeaders = new Headers();
        
        // Set session cookie
        setCookie(responseHeaders, SESSION_COOKIE_NAME, jwt, {
            path: '/',
            httpOnly: true,
            sameSite: 'Strict',
            maxAge: SESSION_DURATION,
            secure: isProduction || url.protocol === 'https:'
        });
        
        // Clear state cookie
        clearCookie(responseHeaders, STATE_COOKIE_NAME, {
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure: isProduction || url.protocol === 'https:'
        });

        responseHeaders.set("Location", "/");

        return new Response(null, {
            status: 302,
            headers: responseHeaders
        });

    } catch (e) {
        console.error(`[API] Excepción procesando el login con GitHub: ${e.message}`);
        console.error(e.stack);
        return new Response("Error interno del servidor durante el login.", { status: 500 });
    }
}
