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
        
        const htmlError = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Configuración Incompleta</title>
                <style>
                    body { font-family: system-ui, sans-serif; background: #131315; color: #e4e2e4; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #1f1f21; padding: 2rem; border-radius: 12px; max-width: 500px; border: 1px solid #ffb4ab; }
                    h1 { color: #ffb4ab; margin-top: 0; }
                    a { color: #adc6ff; text-decoration: none; display: inline-block; margin-top: 1rem; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>⚠️ Configuración Faltante</h1>
                    <p>La aplicación no puede autenticarse con GitHub porque faltan las siguientes variables de entorno en el servidor de <strong>Producción</strong> de Cloudflare Pages:</p>
                    <ul style="color: #ffb4ab; font-family: monospace; background: rgba(255,180,171,0.1); padding: 1rem; border-radius: 6px;">
                        ${missingVars.map(v => `<li>${v}</li>`).join('')}
                    </ul>
                    <p>Por favor, ve a tu panel de Cloudflare Pages, selecciona este proyecto, ve a <strong>Settings &gt; Environment variables</strong> y asegúrate de que las variables estén definidas en la pestaña <strong>Production</strong>.</p>
                    <a href="/">&larr; Volver al inicio</a>
                </div>
            </body>
            </html>
        `;
        
        return new Response(htmlError, {
            status: 500,
            headers: { "Content-Type": "text/html;charset=UTF-8" }
        });
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
