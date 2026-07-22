/**
 * OAuth Login Handler
 * Initiates GitHub OAuth flow
 */

import { getCookie, setCookie } from "../../_shared/cookies.js";
import { ValidationError } from "../../_shared/errors.js";

const STATE_COOKIE_NAME = "oauth_state";
const STATE_DURATION = 60 * 10; // 10 minutes in seconds

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    console.log(`[API] OAuth Login iniciado desde: ${url.pathname}`);

    // Get configuration from environment
    const clientId = env.GITHUB_CLIENT_ID;
    const githubUsername = env.GITHUB_USERNAME;

    const missingVars = [];
    if (!clientId) missingVars.push("GITHUB_CLIENT_ID");
    if (!githubUsername) missingVars.push("GITHUB_USERNAME");

    if (missingVars.length > 0) {
        console.error(`[API] Error: Faltan variables de configuración para OAuth: ${missingVars.join(", ")}`);
        return new Response(`El servidor no está configurado correctamente. Faltan las variables de entorno en Cloudflare Pages: ${missingVars.join(", ")}. Por favor configúralas en el panel de Cloudflare Pages (Settings > Environment variables).`, { status: 500 });
    }

    try {
        // Generate a secure random state token for CSRF protection
        const state = crypto.randomUUID();
        
        // Get the callback URL
        const callbackUrl = new URL('/api/oauth/callback', url.origin).toString();
        
        // Build GitHub OAuth URL
        const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
        githubAuthUrl.searchParams.set('client_id', clientId);
        githubAuthUrl.searchParams.set('redirect_uri', callbackUrl);
        githubAuthUrl.searchParams.set('state', state);
        githubAuthUrl.searchParams.set('scope', 'repo user');
        
        // Set state cookie
        const isProduction = env.NODE_ENV === "production";
        const responseHeaders = new Headers();
        
        setCookie(responseHeaders, STATE_COOKIE_NAME, state, {
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            maxAge: STATE_DURATION,
            secure: isProduction || url.protocol === 'https:'
        });
        
        responseHeaders.set("Location", githubAuthUrl.toString());
        
        console.log(`[API] Redirigiendo a GitHub OAuth: ${githubAuthUrl.toString()}`);
        
        return new Response(null, {
            status: 302,
            headers: responseHeaders
        });

    } catch (e) {
        console.error(`[API] Error iniciando OAuth: ${e.message}`);
        return new Response("Error al iniciar el proceso de autenticación.", { status: 500 });
    }
}
