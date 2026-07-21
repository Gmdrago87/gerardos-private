/**
 * Session Handler
 * Returns current session information
 */

import { jsonResponse } from "../_shared/http.js";
import { getCookie } from "../_shared/cookies.js";
import { verifyJwt } from "../_shared/jwt.js";
import { isAllowedUser } from "../_shared/github.js";

export async function onRequestGet(context) {
    const { request, env } = context;
    
    // Get session cookie
    const token = getCookie(request, "session");
    
    if (!token) {
        return jsonResponse({
            authenticated: false,
            error: "No session"
        });
    }

    if (!env.JWT_SECRET) {
        return jsonResponse({
            authenticated: false,
            error: "Server misconfigured"
        }, 500);
    }

    try {
        const payload = await verifyJwt(token, env.JWT_SECRET);
        
        if (!payload || !payload.github_token || typeof payload.sub !== "string") {
            return jsonResponse({
                authenticated: false,
                error: "Invalid session"
            });
        }

        // Check if user is allowed
        if (!isAllowedUser(payload.sub, env)) {
            return jsonResponse({
                authenticated: false,
                error: "User not allowed"
            }, 403);
        }

        return jsonResponse({
            authenticated: true,
            user: {
                username: payload.sub,
                expiresAt: payload.exp * 1000 // Convert to milliseconds
            }
        });

    } catch (e) {
        console.error('Session verification error:', e.message);
        return jsonResponse({
            authenticated: false,
            error: "Session verification failed"
        }, 401);
    }
}
