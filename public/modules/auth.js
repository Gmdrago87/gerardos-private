/**
 * Authentication module for GerardOS Private Dashboard
 */

import { checkSession as apiCheckSession, login as apiLogin, logout as apiLogout } from './api.js';
import { clearCache, clearAllStorage } from './api.js';

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
export async function checkSession() {
    try {
        const session = await apiCheckSession();
        return session.authenticated === true;
    } catch (e) {
        return false;
    }
}

/**
 * Get current user
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser() {
    try {
        const session = await apiCheckSession();
        return session.authenticated ? session.user : null;
    } catch (e) {
        return null;
    }
}

/**
 * Get session expiration time
 * @returns {Promise<Date|null>} Expiration date or null
 */
export async function getSessionExpiration() {
    try {
        const session = await apiCheckSession();
        if (session.authenticated && session.user?.expiresAt) {
            return new Date(session.user.expiresAt);
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Check if session is about to expire (within 5 minutes)
 * @returns {Promise<boolean>} True if session is about to expire
 */
export async function isSessionExpiringSoon() {
    const expiration = await getSessionExpiration();
    if (!expiration) return false;
    
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return (expiration - now) < fiveMinutes;
}

/**
 * Initiate login flow
 */
export function login() {
    apiLogin();
}

/**
 * Logout and clear session
 */
export async function logout() {
    // Clear local storage
    clearCache();
    clearAllStorage();
    
    // Call logout API
    await apiLogout();
}

/**
 * Refresh session (if supported)
 * @returns {Promise<boolean>} True if refresh was successful
 */
export async function refreshSession() {
    try {
        // For now, just check session - in future, could implement refresh token
        const session = await apiCheckSession();
        return session.authenticated === true;
    } catch (e) {
        return false;
    }
}

/**
 * Get authentication state
 * @returns {Promise<Object>} Authentication state
 */
export async function getAuthState() {
    try {
        const session = await apiCheckSession();
        const expiration = session.authenticated ? new Date(session.user?.expiresAt) : null;
        const isExpiring = expiration && (expiration - new Date()) < (5 * 60 * 1000);
        
        return {
            authenticated: session.authenticated,
            user: session.user,
            expiration,
            isExpiring
        };
    } catch (e) {
        return {
            authenticated: false,
            user: null,
            expiration: null,
            isExpiring: false
        };
    }
}

/**
 * Store session token (if needed for client-side auth)
 * @param {string} token - Session token
 */
export function storeSessionToken(token) {
    // Note: In this implementation, we don't store the token client-side
    // as we use HttpOnly cookies for security
    // This is just a placeholder for future use
}

/**
 * Clear session token
 */
export function clearSessionToken() {
    // Clear any client-side session storage
    sessionStorage.removeItem('session_token');
    localStorage.removeItem('session_token');
}
