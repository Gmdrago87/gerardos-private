/**
 * Session Handler
 * Returns current session information
 * Enhanced with better error handling and security
 */

import { jsonResponse } from "../_shared/http.js";
import { getCookie } from "../_shared/cookies.js";
import { verifyJwt } from "../_shared/jwt.js";
import { isAllowedUser } from "../_shared/github.js";
import { AuthError, ServerConfigError, handleError } from "../_shared/errors.js";

export async function onRequestGet(context) {
    const { request, env } = context;
    
    console.log('[Backend API /session] Checking session cookie...');
    // Get session cookie
    const token = getCookie(request, "session");
    
    if (!token) {
        console.log('[Backend API /session] No session cookie found.');
        return jsonResponse({
            authenticated: false,
            error: "No session",
            errorCode: "NO_SESSION"
        });
    }

    if (!env.JWT_SECRET) {
        console.error('[Backend API /session] Error: JWT_SECRET missing in server env.');
        return jsonResponse({
            authenticated: false,
            error: "Server misconfigured",
            errorCode: "SERVER_MISCONFIGURED"
        }, 500);
    }

    try {
        const payload = await verifyJwt(token, env.JWT_SECRET);
        
        if (!payload) {
            return jsonResponse({
                authenticated: false,
                error: "Invalid session",
                errorCode: "INVALID_SESSION"
            });
        }

        // Check for required fields
        if (!payload.github_token || typeof payload.sub !== "string") {
            return jsonResponse({
                authenticated: false,
                error: "Invalid session data",
                errorCode: "INVALID_SESSION_DATA"
            });
        }

        // Check if user is allowed
        if (!isAllowedUser(payload.sub, env)) {
            return jsonResponse({
                authenticated: false,
                error: "User not allowed",
                errorCode: "USER_NOT_ALLOWED"
            }, 403);
        }

        // Check if token is about to expire
        const now = Math.floor(Date.now() / 1000);
        const expiresSoon = payload.exp && payload.exp - now < 300; // 5 minutes
        
        return jsonResponse({
            authenticated: true,
            user: {
                username: payload.sub,
                name: payload.name || payload.sub,
                avatarUrl: payload.avatar_url,
                expiresAt: payload.exp * 1000, // Convert to milliseconds
                expiresSoon: expiresSoon
            },
            session: {
                createdAt: payload.iat * 1000,
                expiresAt: payload.exp * 1000
            }
        });

    } catch (e) {
        console.error('[Session] Verification error:', {
            message: e.message,
            stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
        });
        
        return jsonResponse({
            authenticated: false,
            error: "Session verification failed",
            errorCode: "SESSION_VERIFICATION_FAILED"
        }, 401);
    }
}
