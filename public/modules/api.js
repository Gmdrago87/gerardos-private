/**
 * API Client for GerardOS Private Dashboard
 * Handles all API requests to the backend
 * Enhanced with better error handling and retry logic
 */

import { USERNAME, CACHE_KEY_USER, CACHE_KEY_REPOS, CACHE_KEY_TIME, CACHE_DURATION, ERROR_MESSAGES } from './utils.js';

// API base URL (can be configured for different environments)
const API_BASE = '';

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    retryableStatuses: [429, 502, 503, 504]
};

/**
 * Get cached data from localStorage
 * @returns {Object|null} Cached data or null
 */
export function getCachedData() {
    try {
        const timestamp = localStorage.getItem(CACHE_KEY_TIME);
        const user = localStorage.getItem(CACHE_KEY_USER);
        const repos = localStorage.getItem(CACHE_KEY_REPOS);
        
        if (!timestamp || !user || !repos) return null;
        
        const now = Date.now();
        if (now - parseInt(timestamp) < CACHE_DURATION) {
            return { user: JSON.parse(user), repos: JSON.parse(repos) };
        }
    } catch (e) {
        console.warn('Error reading cache:', e);
        clearCache();
    }
    return null;
}

/**
 * Save data to cache
 * @param {Object} user - User data
 * @param {Array} repos - Repositories data
 */
export function saveToCache(user, repos) {
    try {
        localStorage.setItem(CACHE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(CACHE_KEY_REPOS, JSON.stringify(repos));
        localStorage.setItem(CACHE_KEY_TIME, Date.now().toString());
    } catch (e) {
        console.warn('Storage full or quota exceeded:', e);
    }
}

/**
 * Get expired cache data
 * @returns {Object|null} Expired cache data or null
 */
export function getExpiredCache() {
    try {
        const user = localStorage.getItem(CACHE_KEY_USER);
        const repos = localStorage.getItem(CACHE_KEY_REPOS);
        if (user && repos) {
            return { user: JSON.parse(user), repos: JSON.parse(repos) };
        }
    } catch (e) {
        clearCache();
    }
    return null;
}

/**
 * Clear cache
 */
export function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY_USER);
        localStorage.removeItem(CACHE_KEY_REPOS);
        localStorage.removeItem(CACHE_KEY_TIME);
    } catch (e) {
        console.warn('Error clearing cache:', e);
    }
}

/**
 * Clear all localStorage
 */
export function clearAllStorage() {
    try {
        localStorage.clear();
    } catch (e) {
        console.warn('Error clearing storage:', e);
    }
}

/**
 * Encode repository name for API requests
 * @param {string} repoName - Repository name
 * @returns {string} Encoded repository name
 */
function repoPath(repoName) {
    return encodeURIComponent(repoName);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retryCount - Current retry count
 * @returns {Promise<Response>} Response
 */
async function fetchWithRetry(url, options = {}, retryCount = 0) {
    try {
        const res = await fetch(url, { credentials: 'include', ...options });
        
        // Check if we should retry
        if (RETRY_CONFIG.retryableStatuses.includes(res.status) && retryCount < RETRY_CONFIG.maxRetries) {
            const retryAfter = res.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_CONFIG.retryDelay * Math.pow(2, retryCount);
            
            console.warn(`[API] Request failed with status ${res.status}, retrying in ${delay}ms (attempt ${retryCount + 1})`);
            await sleep(delay);
            return fetchWithRetry(url, options, retryCount + 1);
        }
        
        return res;
    } catch (error) {
        if (retryCount < RETRY_CONFIG.maxRetries) {
            const delay = RETRY_CONFIG.retryDelay * Math.pow(2, retryCount);
            console.warn(`[API] Network error, retrying in ${delay}ms (attempt ${retryCount + 1})`);
            await sleep(delay);
            return fetchWithRetry(url, options, retryCount + 1);
        }
        throw error;
    }
}

/**
 * Fetch data from API with error handling
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function fetchWithErrorHandling(url, options = {}) {
    try {
        const res = await fetchWithRetry(url, options);
        
        if (res.status === 401) {
            // Clear cache on unauthorized
            clearCache();
            throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
        }
        
        if (res.status === 429) {
            const retryAfter = res.headers.get('Retry-After');
            throw new Error(ERROR_MESSAGES.RATE_LIMIT + (retryAfter ? ` (${retryAfter}s)` : ''));
        }
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMessage = errorData.error || errorData.message || ERROR_MESSAGES.API;
            const errorCode = errorData.code || 'UNKNOWN_ERROR';
            
            // Handle specific error codes
            if (errorCode === 'NO_SESSION' || errorCode === 'INVALID_SESSION') {
                clearCache();
                throw new Error(ERROR_MESSAGES.SESSION_EXPIRED);
            }
            
            throw new Error(errorMessage);
        }
        
        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Fetch API data (user and repos)
 * @returns {Promise<Object>} User and repositories data
 */
export async function fetchApiData() {
    const res = await fetchWithErrorHandling('/api/repos');
    return res; // Returns { user, repos }
}

/**
 * Fetch fallback data from local database
 * @returns {Promise<Object>} User and repositories data
 */
export async function fetchFallbackData() {
    try {
        const res = await fetch('./database.json');
        if (!res.ok) throw new Error('No local database');
        const data = await res.json();
        return { user: data.user, repos: data.repos };
    } catch (e) {
        throw new Error(ERROR_MESSAGES.NETWORK);
    }
}

/**
 * Fetch repository tree
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @returns {Promise<Object>} Tree data
 */
export async function fetchRepoTree(repoName, branch) {
    const url = `/api/repos/${repoPath(repoName)}/tree?branch=${encodeURIComponent(branch)}`;
    const res = await fetchWithErrorHandling(url);
    return res;
}

/**
 * Fetch file content
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {string} filePath - File path
 * @returns {Promise<string>} File content
 */
export async function fetchFileContent(repoName, branch, filePath) {
    const url = `/api/repos/${repoPath(repoName)}/file?path=${encodeURIComponent(filePath)}&branch=${encodeURIComponent(branch)}`;
    const res = await fetchWithErrorHandling(url);
    return res.content || res.text || '';
}

/**
 * Create a new repository
 * @param {string} name - Repository name
 * @param {string} description - Repository description
 * @param {boolean} isPrivate - Whether repository is private
 * @returns {Promise<Object>} New repository data
 */
export async function createRepo(name, description = '', isPrivate = false, autoInit = true) {
    const res = await fetchWithErrorHandling('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isPrivate, autoInit })
    });
    return res;
}

/**
 * Delete a repository
 * @param {string} name - Repository name
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteRepo(name) {
    const res = await fetchWithErrorHandling(`/api/repos/${repoPath(name)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
    });
    return res;
}

/**
 * Update repository
 * @param {string} name - Repository name
 * @param {Object} updates - Repository updates
 * @returns {Promise<Object>} Update result
 */
export async function updateRepo(name, updates) {
    const res = await fetchWithErrorHandling(`/api/repos/${repoPath(name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    return res;
}

/**
 * Update repository visibility
 * @param {string} name - Repository name
 * @param {boolean} isPrivate - Whether to make private
 * @returns {Promise<Object>} Update result
 */
export async function updateRepoVisibility(name, isPrivate) {
    return updateRepo(name, { private: isPrivate });
}

/**
 * Fetch commits for a repository
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {number} page - Page number
 * @param {number} perPage - Items per page
 * @returns {Promise<Object>} Commits data
 */
export async function fetchCommits(repoName, branch, page = 1, perPage = 30) {
    const url = `/api/repos/${repoPath(repoName)}/commits?branch=${encodeURIComponent(branch)}&page=${page}&per_page=${perPage}`;
    const res = await fetchWithErrorHandling(url);
    return res;
}

/**
 * Fetch branches for a repository
 * @param {string} repoName - Repository name
 * @returns {Promise<Object>} Branches data
 */
export async function fetchBranches(repoName) {
    const url = `/api/repos/${repoPath(repoName)}/branches`;
    const res = await fetchWithErrorHandling(url);
    return res;
}

/**
 * Save file content
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @param {string} message - Commit message
 * @returns {Promise<Object>} Save result
 */
export async function saveFileContent(repoName, branch, filePath, content, message = 'Update file') {
    const url = `/api/repos/${repoPath(repoName)}/actions?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(filePath)}`;
    const res = await fetchWithErrorHandling(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, message })
    });
    return res;
}

/**
 * Delete a file
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {string} filePath - File path
 * @param {string} message - Commit message
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFile(repoName, branch, filePath, message = 'Delete file') {
    const url = `/api/repos/${repoPath(repoName)}/actions?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(filePath)}`;
    const res = await fetchWithErrorHandling(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, confirm: true })
    });
    return res;
}

/**
 * Fetch issues for a repository
 * @param {string} repoName - Repository name
 * @param {string} state - Issue state (open, closed, all)
 * @param {number} page - Page number
 * @param {number} perPage - Items per page
 * @returns {Promise<Object>} Issues data
 */
export async function fetchIssues(repoName, state = 'all', page = 1, perPage = 30) {
    const url = `/api/repos/${repoPath(repoName)}/issues?state=${state}&page=${page}&per_page=${perPage}`;
    const res = await fetchWithErrorHandling(url);
    return res;
}

/**
 * Create a new issue
 * @param {string} repoName - Repository name
 * @param {string} title - Issue title
 * @param {string} body - Issue body
 * @param {Array} labels - Issue labels
 * @param {Array} assignees - Issue assignees
 * @returns {Promise<Object>} New issue data
 */
export async function createIssue(repoName, title, body = '', labels = [], assignees = []) {
    const url = `/api/repos/${repoPath(repoName)}/issues`;
    const res = await fetchWithErrorHandling(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, labels, assignees })
    });
    return res;
}

/**
 * Update an issue
 * @param {string} repoName - Repository name
 * @param {number} issueNumber - Issue number
 * @param {Object} updates - Issue updates
 * @returns {Promise<Object>} Update result
 */
export async function updateIssue(repoName, issueNumber, updates) {
    const url = `/api/repos/${repoPath(repoName)}/issues/${issueNumber}`;
    const res = await fetchWithErrorHandling(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    return res;
}

/**
 * Fetch actions/workflow runs for a repository
 * @param {string} repoName - Repository name
 * @returns {Promise<Object>} Actions data
 */
export async function fetchActions(repoName) {
    const url = `/api/repos/${repoPath(repoName)}/actions`;
    const res = await fetchWithErrorHandling(url);
    return res;
}

/**
 * Check session status
 * @returns {Promise<Object>} Session status
 */
export async function checkSession() {
    try {
        const res = await fetch('/api/session', { credentials: 'include' });
        if (!res.ok) {
            return { authenticated: false };
        }
        return await res.json();
    } catch (e) {
        console.error('Session check error:', e);
        return { authenticated: false, error: e.message };
    }
}

/**
 * Login - redirect to OAuth
 * @returns {void}
 */
export function login() {
    window.location.href = '/api/oauth/login';
}

/**
 * Logout - clear session and redirect
 * @returns {Promise<void>}
 */
export async function logout() {
    try {
        await fetch('/api/logout', { method: 'GET', credentials: 'include' });
    } catch (e) {
        console.error('Logout error:', e);
    }
    window.location.href = '/';
}

/**
 * Get version information
 * @returns {Promise<Object>} Version info
 */
export async function getVersion() {
    try {
        const res = await fetch('/api/version');
        if (!res.ok) return {};
        return await res.json();
    } catch (e) {
        return {};
    }
}

/**
 * Call AI endpoint
 * @param {Object} data - AI request data
 * @returns {Promise<Object>} AI response
 */
export async function callAI(data) {
    const res = await fetchWithErrorHandling('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res;
}

/**
 * Get AI configuration
 * @returns {Promise<Object>} AI configuration
 */
export async function getAIConfig() {
    try {
        const res = await fetch('/api/ai', { credentials: 'include' });
        if (!res.ok) return { configured: false };
        return await res.json();
    } catch (e) {
        return { configured: false, error: e.message };
    }
}
