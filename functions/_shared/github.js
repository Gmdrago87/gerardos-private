/**
 * GitHub API utilities and validations
 */

import { jsonResponse } from './http.js';
import { AuthError, ValidationError } from './errors.js';

// Regex patterns for validation
const REPO_NAME_REGEX = /^(?!\.)(?!.*\.git$)[A-Za-z0-9._-]{1,100}$/;
const GIT_REF_REGEX = /^(?!\/)(?!.*\.\.)(?!.*@\{)(?!.*\\)(?!.*\/\/)(?!.*\.$)[A-Za-z0-9._\/-]{1,255}$/;
const SHA_REGEX = /^[a-f0-9]{40}$/i;
const USERNAME_REGEX = /^[a-zA-Z0-9-]{1,39}$/;

// Frozen headers object for performance
const BASE_GITHUB_HEADERS = Object.freeze({
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GerardOS-Private-Dashboard"
});

/**
 * Get GitHub API headers with authentication
 * @param {Object} context - Request context with session
 * @param {boolean} [withContentType=false] - Include Content-Type header
 * @returns {Object} Headers object
 */
export function getGitHubHeaders(context, withContentType = false) {
    const token = context.data?.session?.github_token;
    if (!token) {
        throw new AuthError('No GitHub token available');
    }
    
    return {
        ...BASE_GITHUB_HEADERS,
        "Authorization": `Bearer ${token}`,
        ...(withContentType ? { "Content-Type": "application/json" } : {})
    };
}

/**
 * Validate repository name
 * @param {string} name - Repository name to validate
 * @returns {boolean} True if valid
 */
export function validateRepoName(name) {
    return typeof name === "string" && 
           REPO_NAME_REGEX.test(name) && 
           !name.endsWith(".");
}

/**
 * Validate Git reference (branch/tag)
 * @param {string} ref - Git reference to validate
 * @returns {boolean} True if valid
 */
export function validateGitRef(ref) {
    return typeof ref === "string" && GIT_REF_REGEX.test(ref);
}

/**
 * Validate SHA hash
 * @param {string} sha - SHA hash to validate
 * @returns {boolean} True if valid
 */
export function validateSha(sha) {
    return typeof sha === "string" && SHA_REGEX.test(sha);
}

/**
 * Validate file path
 * @param {string} path - File path to validate
 * @returns {boolean} True if valid
 */
export function validateFilePath(path) {
    if (typeof path !== "string" || path.length < 1 || path.length > 4096) return false;
    if (path.includes("\0") || path.includes("\\") || 
        path.startsWith("/") || path.endsWith("/") || 
        path.includes("//") || path.includes("/./") || 
        path.includes("/../")) return false;
    return true;
}

/**
 * Validate GitHub username
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid
 */
export function validateUsername(username) {
    return typeof username === "string" && USERNAME_REGEX.test(username);
}

/**
 * Encode GitHub path for API requests
 * @param {string} path - Path to encode
 * @returns {string} Encoded path
 */
export function encodeGitHubPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
}

/**
 * Get repository owner from context
 * @param {Object} context - Request context
 * @returns {string} Repository owner
 */
export function getRepoOwner(context) {
    return context.data?.session?.sub || 
           (context.env.GITHUB_USERNAME?.split(",")[0]?.trim()) || 
           "Gmdrago87";
}

/**
 * Check if user is allowed to access the dashboard
 * @param {string} username - Username to check
 * @param {Object} env - Environment variables
 * @returns {boolean} True if allowed
 */
export function isAllowedUser(username, env) {
    if (typeof username !== "string" || !username) return false;
    
    const allowed = (env.GITHUB_USERNAME || "Gmdrago87,GerardMaestre")
        .split(",")
        .map(u => u.trim().toLowerCase());
    
    return allowed.includes(username.toLowerCase());
}

/**
 * Require authentication middleware
 * @param {Object} context - Request context
 * @returns {Response|null} Error response or null if authenticated
 */
export function requireAuth(context) {
    if (!context.data?.session?.github_token) {
        throw new AuthError('Sesión no válida');
    }
    return null;
}

/**
 * Require specific user
 * @param {Object} context - Request context
 * @param {string} username - Required username
 * @returns {Response|null} Error response or null if authorized
 */
export function requireUser(context, username) {
    const sessionUser = context.data?.session?.sub;
    if (!sessionUser || sessionUser.toLowerCase() !== username.toLowerCase()) {
        throw new ForbiddenError('No tienes permiso para acceder a este recurso');
    }
    return null;
}

/**
 * Make a request to GitHub API
 * @param {Object} context - Request context
 * @param {string} endpoint - API endpoint (relative to api.github.com)
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} Response data
 */
export async function githubRequest(context, endpoint, options = {}) {
    const url = new URL(`https://api.github.com${endpoint}`);
    
    const headers = {
        ...getGitHubHeaders(context),
        ...options.headers
    };
    
    const response = await fetch(url.toString(), {
        ...options,
        headers
    });
    
    // Handle rate limiting
    if (response.status === 403) {
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        if (rateLimitReset) {
            throw new RateLimitError('Límite de peticiones excedido', {
                resetAt: new Date(parseInt(rateLimitReset) * 1000).toISOString()
            });
        }
    }
    
    // Handle errors
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            errorData.message || 'Error en la API de GitHub',
            response.status,
            errorData
        );
    }
    
    return response.json();
}

// Import for type checking
import { ForbiddenError } from './errors.js';
