/**
 * Logout Handler
 * Clears the session cookie
 */

import { jsonResponse } from "../_shared/http.js";
import { clearCookie } from "../_shared/cookies.js";

export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    const isProduction = context.env.NODE_ENV === "production";
    const responseHeaders = new Headers();
    
    // Clear session cookie
    clearCookie(responseHeaders, "session", {
        path: '/',
        httpOnly: true,
        sameSite: 'Strict',
        secure: isProduction || url.protocol === 'https:'
    });
    
    // Clear state cookie
    clearCookie(responseHeaders, "oauth_state", {
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
}
