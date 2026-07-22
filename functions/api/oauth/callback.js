/**
 * OAuth Callback Handler
 * Exchanges GitHub authorization code for access token and creates session
 * Enhanced with better error handling and security
 */

import { signJwt } from "../../_shared/jwt.js";
import { isAllowedUser } from "../../_shared/github.js";
import { getCookie, setCookie, clearCookie } from "../../_shared/cookies.js";
import { ForbiddenError, ValidationError, ServerConfigError, handleError } from "../../_shared/errors.js";

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
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    const storedState = getCookie(request, STATE_COOKIE_NAME);
    
    console.log(`[API] C\u00f3digo extra\u00eddo: ${code ? "S\u00ed (oculto)" : "NO"}`);
    console.log(`[API] Estado: ${state ? "presente" : "ausente"}`);

    // Handle OAuth errors from GitHub
    if (error) {
        console.error(`[API] Error de OAuth de GitHub: ${error}: ${errorDescription}`);
        const errorMessages = {
            'access_denied': 'Acceso denegado. Por favor, autoriza la aplicaci\u00f3n.',
            'unauthorized_client': 'Cliente no autorizado. Configuraci\u00f3n incorrecta.',
            'invalid_request': 'Solicitud inv\u00e1lida. Por favor, int\u00e9ntalo de nuevo.',
            'invalid_scope': 'Alcance inv\u00e1lido.',
            'server_error': 'Error en el servidor de GitHub. Por favor, int\u00e9ntalo m\u00e1s tarde.',
            'temporarily_unavailable': 'Servicio temporalmente no disponible.'
        };
        
        const message = errorMessages[error] || errorDescription || 'Error de autenticaci\u00f3n.';
        return new Response(message, { status: 400 });
    }

    // Validate required parameters
    if (!code) {
        console.error("[API] Error: Falta el c\u00f3digo de autorizaci\u00f3n.");
        return new Response("Falta el c\u00f3digo de autorizaci\u00f3n. Por favor, int\u00e9ntalo de nuevo.", { status: 400 });
    }

    if (!state || state !== storedState) {
        console.error("[API] Error: Token CSRF (state) inv\u00e1lido o expirado.");
        // Clear state cookie to prevent replay attacks
        const responseHeaders = new Headers();
        clearCookie(responseHeaders, STATE_COOKIE_NAME, {
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure: env.NODE_ENV === 'production' || url.protocol === 'https:'
        });
        
        return new Response("Error de seguridad: la sesi\u00f3n de login expir\u00f3 o es inv\u00e1lida.", { 
            status: 403,
            headers: responseHeaders
        });
    }

    // Get configuration from environment (NO DEFAULT VALUES - must be configured)
    const clientId = env.GITHUB_CLIENT_ID;
    const clientSecret = env.GITHUB_CLIENT_SECRET;
    const jwtSecret = env.JWT_SECRET;
    const githubUsername = env.GITHUB_USERNAME;

    const missingVars = [];
    if (!clientId) missingVars.push("GITHUB_CLIENT_ID");
    if (!clientSecret) missingVars.push("GITHUB_CLIENT_SECRET");
    if (!jwtSecret) missingVars.push("JWT_SECRET");
    if (!githubUsername) missingVars.push("GITHUB_USERNAME");

    if (missingVars.length > 0) {
        console.error(`[API] Error: Faltan variables OAuth en env: ${missingVars.join(", ")}`);
        return new Response(`El servidor no est\u00e1 configurado correctamente. Faltan las variables de entorno en Cloudflare Pages: ${missingVars.join(", ")}. Por favor config\u00faralas en el panel de Cloudflare Pages (Settings > Environment variables).`, { status: 500 });
    }

    try {
        // 1. Exchange code for access token
        console.log("[API] Intercambiando c\u00f3digo por token de acceso...");
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "GerardOS-Private-Dashboard"
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code
            })
        });

        const tokenData = await tokenRes.json();
        
        if (!tokenRes.ok) {
            console.error(`[API] Error de GitHub OAuth: ${tokenData.error_description || tokenRes.status}`);
            const errorMessages = {
                'incorrect_client_credentials': 'Credenciales de cliente incorrectas.',
                'invalid_request': 'Solicitud inv\u00e1lida.',
                'invalid_client': 'Cliente no v\u00e1lido.',
                'invalid_grant': 'C\u00f3digo de autorizaci\u00f3n inv\u00e1lido o expirado.'
            };
            const message = errorMessages[tokenData.error] || tokenData.error_description || 'Error al autenticar con GitHub.';
            return new Response(message, { status: 400 });
        }

        if (!tokenData.access_token || tokenData.token_type !== "bearer") {
            console.error(`[API] Respuesta inv\u00e1lida de GitHub: ${JSON.stringify(tokenData)}`);
            return new Response("Respuesta inv\u00e1lida del servidor de autenticaci\u00f3n.", { status: 400 });
        }

        const accessToken = tokenData.access_token;
        console.log("[API] Access token recibido correctamente.");

        // 2. Verify user identity
        console.log("[API] Verificando identidad del usuario en GitHub...");
        const userRes = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "User-Agent": "GerardOS-Private-Dashboard",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });

        const userData = await userRes.json();
        if (!userRes.ok) {
            console.error(`[API] Error verificando usuario en GitHub: ${userRes.status} - ${userData.message || 'Unknown error'}`);
            return new Response("No se pudo verificar la identidad en GitHub.", { status: 502 });
        }
        
        if (typeof userData.login !== "string") {
            console.error(`[API] Respuesta inv\u00e1lida al verificar usuario: ${JSON.stringify(userData)}`);
            return new Response("Respuesta inv\u00e1lida del servidor de GitHub.", { status: 502 });
        }
        
        console.log(`[API] Usuario de GitHub detectado: ${userData.login}`);

        // 3. Access control - only allowed users can access
        if (!isAllowedUser(userData.login, env)) {
            console.error(`[API] Acceso Denegado. Esperado: ${env.GITHUB_USERNAME}, Recibido: ${userData.login}`);
            return new Response(`Acceso Denegado. Este panel es privado y no est\u00e1s autorizado.`, { status: 403 });
        }

        // 4. Generate JWT session
        const payload = {
            sub: userData.login,
            github_token: accessToken,
            avatar_url: userData.avatar_url,
            name: userData.name,
            iat: Math.floor(Date.now() / 1000)
        };
        
        const jwt = await signJwt(payload, jwtSecret, SESSION_DURATION);
        console.log("[API] Sesi\u00f3n generada correctamente. Redirigiendo al inicio.");

        // 5. Set cookies and redirect
        const isProduction = env.NODE_ENV === "production";
        const responseHeaders = new Headers();
        
        // Set session cookie with enhanced security
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
        console.error(`[API] Excepci\u00f3n procesando el login con GitHub: ${e.message}`);
        console.error(e.stack);
        return new Response("Error interno del servidor durante el login.", { status: 500 });
    }
}
