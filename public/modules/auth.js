/**
 * Authentication module for GerardOS Private Dashboard
 * Enhanced with better session management and error handling
 */

import { checkSession as apiCheckSession, login as apiLogin, logout as apiLogout, getVersion } from './api.js';
import { clearCache, clearAllStorage } from './api.js';

// Session state
let sessionState = {
    authenticated: false,
    user: null,
    expiration: null,
    isExpiring: false,
    lastChecked: 0
};

// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Session warning threshold (5 minutes before expiration)
const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000;

/**
 * Check if user is authenticated
 * @param {boolean} forceCheck - Force a new check
 * @returns {Promise<boolean>} True if authenticated
 */
export async function checkSession(forceCheck = false) {
    const now = Date.now();
    
    // Use cached state if it's recent and not forced
    if (!forceCheck && now - sessionState.lastChecked < SESSION_CHECK_INTERVAL) {
        return sessionState.authenticated;
    }
    
    try {
        const session = await apiCheckSession();
        const authenticated = session.authenticated === true;
        const user = authenticated ? session.user : null;
        const expiration = authenticated && session.user?.expiresAt ? new Date(session.user.expiresAt) : null;
        const isExpiring = expiration && (expiration - now) < SESSION_WARNING_THRESHOLD;
        
        // Update session state
        sessionState = {
            authenticated,
            user,
            expiration,
            isExpiring,
            lastChecked: now
        };
        
        // If session is about to expire, schedule a check sooner
        if (isExpiring) {
            setTimeout(() => checkSession(true), SESSION_WARNING_THRESHOLD);
        }
        
        return authenticated;
    } catch (e) {
        sessionState = {
            authenticated: false,
            user: null,
            expiration: null,
            isExpiring: false,
            lastChecked: now
        };
        return false;
    }
}

/**
 * Get current user
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser() {
    const authenticated = await checkSession();
    return authenticated ? sessionState.user : null;
}

/**
 * Get session expiration time
 * @returns {Promise<Date|null>} Expiration date or null
 */
export async function getSessionExpiration() {
    await checkSession();
    return sessionState.expiration;
}

/**
 * Check if session is about to expire (within 5 minutes)
 * @returns {Promise<boolean>} True if session is about to expire
 */
export async function isSessionExpiringSoon() {
    await checkSession();
    return sessionState.isExpiring;
}

/**
 * Get session state
 * @returns {Object} Current session state
 */
export function getSessionState() {
    return { ...sessionState };
}

/**
 * Initiate login flow
 * @returns {void}
 */
export function login() {
    apiLogin();
}

/**
 * Logout and clear session
 * @returns {Promise<void>}
 */
export async function logout() {
    // Clear local storage
    clearCache();
    clearAllStorage();
    
    // Clear session state
    sessionState = {
        authenticated: false,
        user: null,
        expiration: null,
        isExpiring: false,
        lastChecked: 0
    };
    
    // Call logout API
    await apiLogout();
}

/**
 * Refresh session (if supported)
 * @returns {Promise<boolean>} True if refresh was successful
 */
export async function refreshSession() {
    try {
        // Force a new session check
        const authenticated = await checkSession(true);
        return authenticated;
    } catch (e) {
        return false;
    }
}

/**
 * Get authentication state
 * @returns {Promise<Object>} Authentication state
 */
export async function getAuthState() {
    await checkSession();
    
    return {
        authenticated: sessionState.authenticated,
        user: sessionState.user,
        expiration: sessionState.expiration,
        isExpiring: sessionState.isExpiring
    };
}

/**
 * Start session monitoring
 * Automatically checks session status periodically
 * @returns {void}
 */
export function startSessionMonitoring() {
    // Check session every 5 minutes
    setInterval(() => {
        checkSession();
    }, SESSION_CHECK_INTERVAL);
    
    // Initial check
    checkSession();
}

/**
 * Stop session monitoring
 * @returns {void}
 */
export function stopSessionMonitoring() {
    // Clear all intervals (simple approach)
    const intervals = window.sessionIntervals || [];
    if (intervals.length > 0) {
        intervals.forEach(interval => clearInterval(interval));
    }
}

/**
 * Handle session expiration warning
 * Shows a warning when session is about to expire
 * @param {Function} onExpiring - Callback when session is expiring
 * @returns {void}
 */
export function onSessionExpiring(onExpiring) {
    setInterval(async () => {
        const isExpiring = await isSessionExpiringSoon();
        if (isExpiring) {
            onExpiring();
        }
    }, 60 * 1000); // Check every minute
}

/**
 * Get CSRF token for forms
 * @returns {string} CSRF token
 */
export function getCsrfToken() {
    // Generate a random token for client-side CSRF protection
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

/**
 * Store CSRF token in session
 * @param {string} token - CSRF token
 * @returns {void}
 */
export function storeCsrfToken(token) {
    sessionStorage.setItem('csrf_token', token);
}

/**
 * Get stored CSRF token
 * @returns {string|null} CSRF token or null
 */
export function getStoredCsrfToken() {
    return sessionStorage.getItem('csrf_token');
}

/**
 * Clear CSRF token
 * @returns {void}
 */
export function clearCsrfToken() {
    sessionStorage.removeItem('csrf_token');
}

// Initialize session monitoring when module is loaded
if (typeof window !== 'undefined') {
    // Store interval for cleanup
    window.sessionIntervals = [];
    
    // Start monitoring after a short delay to allow page to load
    setTimeout(() => {
        startSessionMonitoring();
    }, 1000);
}
