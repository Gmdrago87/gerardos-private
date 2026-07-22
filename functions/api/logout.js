/**
 * Logout Handler
 * Clears the session cookie and any related cookies
 * Enhanced with better security
 */

import { jsonResponse } from "../_shared/http.js";
import { clearCookie } from "../_shared/cookies.js";

export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    const isProduction = context.env.NODE_ENV === "production";
    const responseHeaders = new Headers();
    
    // Clear all session-related cookies
    const cookiesToClear = [
        { name: "session", options: { path: '/', httpOnly: true, sameSite: 'Strict' } },
        { name: "oauth_state", options: { path: '/', httpOnly: true, sameSite: 'Lax' } },
        { name: "session_token", options: { path: '/', httpOnly: true, sameSite: 'Strict' } }
    ];
    
    for (const cookie of cookiesToClear) {
        clearCookie(responseHeaders, cookie.name, {
            ...cookie.options,
            secure: isProduction || url.protocol === 'https:'
        });
    }
    
    // Add security headers
    responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    responseHeaders.set("Pragma", "no-cache");
    responseHeaders.set("Expires", "0");
    
    responseHeaders.set("Location", "/");
    
    return new Response(null, {
        status: 302,
        headers: responseHeaders
    });
}

export async function onRequestPost(context) {
    // Also handle POST requests for logout
    return onRequestGet(context);
}
