/**
 * State Management for GerardOS Private Dashboard
 * Enhanced with better caching and state persistence
 */

// State storage
const state = {
    user: null,
    repos: [],
    currentRepo: null,
    currentBranch: 'main',
    currentPath: '',
    filters: {
        language: null,
        sort: 'updated',
        search: ''
    },
    ui: {
        theme: 'dark',
        sidebarCollapsed: false,
        modalOpen: false
    }
};

// Tree cache
const treeCache = new Map();

// File cache
const fileCache = new Map();

// CACHE_DURATION from utils
import { CACHE_DURATION } from './utils.js';

/**
 * Get state value
 * @param {string} key - State key
 * @param {*} defaultValue - Default value
 * @returns {*} State value
 */
export function getState(key, defaultValue = null) {
    const keys = key.split('.');
    let value = state;
    
    for (const k of keys) {
        if (value && value.hasOwnProperty(k)) {
            value = value[k];
        } else {
            return defaultValue;
        }
    }
    
    return value !== undefined ? value : defaultValue;
}

/**
 * Set state value
 * @param {string} key - State key
 * @param {*} value - Value to set
 * @returns {void}
 */
export function setState(key, value) {
    const keys = key.split('.');
    let current = state;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) {
            current[k] = {};
        }
        current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
}

/**
 * Update state
 * @param {Object} updates - State updates
 * @returns {void}
 */
export function updateState(updates) {
    Object.assign(state, updates);
}

/**
 * Get cached tree
 * @param {string} key - Cache key
 * @returns {Object|null} Cached tree or null
 */
export function getCachedTree(key) {
    const cached = treeCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }
    return null;
}

/**
 * Set cached tree
 * @param {string} key - Cache key
 * @param {Object} data - Tree data
 * @returns {void}
 */
export function setCachedTree(key, data) {
    treeCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Clear tree cache
 * @returns {void}
 */
export function clearTreeCache() {
    treeCache.clear();
}

/**
 * Get cached file
 * @param {string} key - Cache key
 * @returns {Object|null} Cached file or null
 */
export function getCachedFile(key) {
    const cached = fileCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }
    return null;
}

/**
 * Set cached file
 * @param {string} key - Cache key
 * @param {Object} data - File data
 * @returns {void}
 */
export function setCachedFile(key, data) {
    fileCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Clear file cache
 * @returns {void}
 */
export function clearFileCache() {
    fileCache.clear();
}

/**
 * Clear all caches
 * @returns {void}
 */
export function clearAllCaches() {
    treeCache.clear();
    fileCache.clear();
}

/**
 * Save state to localStorage
 * @returns {void}
 */
export function saveState() {
    try {
        const serializableState = {
            ...state,
            // Remove non-serializable data
            ui: state.ui
        };
        localStorage.setItem('app_state', JSON.stringify(serializableState));
    } catch (e) {
        console.warn('Error saving state:', e);
    }
}

/**
 * Load state from localStorage
 * @returns {void}
 */
export function loadState() {
    try {
        const saved = localStorage.getItem('app_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);
        }
    } catch (e) {
        console.warn('Error loading state:', e);
    }
}

/**
 * Clear state
 * @returns {void}
 */
export function clearState() {
    Object.assign(state, {
        user: null,
        repos: [],
        currentRepo: null,
        currentBranch: 'main',
        currentPath: '',
        filters: {
            language: null,
            sort: 'updated',
            search: ''
        },
        ui: {
            theme: 'dark',
            sidebarCollapsed: false,
            modalOpen: false
        }
    });
    
    clearAllCaches();
    
    try {
        localStorage.removeItem('app_state');
    } catch (e) {
        console.warn('Error clearing state:', e);
    }
}

/**
 * Set current repository
 * @param {Object} repo - Repository object
 * @returns {void}
 */
export function setCurrentRepo(repo) {
    setState('currentRepo', repo);
    saveState();
}

/**
 * Set current branch
 * @param {string} branch - Branch name
 * @returns {void}
 */
export function setCurrentBranch(branch) {
    setState('currentBranch', branch);
    saveState();
}

/**
 * Set current path
 * @param {string} path - File path
 * @returns {void}
 */
export function setCurrentPath(path) {
    setState('currentPath', path);
    saveState();
}

/**
 * Set filters
 * @param {Object} filters - Filter object
 * @returns {void}
 */
export function setFilters(filters) {
    setState('filters', { ...state.filters, ...filters });
    saveState();
}

/**
 * Set UI state
 * @param {Object} ui - UI state
 * @returns {void}
 */
export function setUIState(ui) {
    setState('ui', { ...state.ui, ...ui });
    saveState();
}

/**
 * Get theme
 * @returns {string} Current theme
 */
export function getTheme() {
    return getState('ui.theme', 'dark');
}

/**
 * Set theme
 * @param {string} theme - Theme to set
 * @returns {void}
 */
export function setTheme(theme) {
    setUIState({ theme });
    document.documentElement.className = theme;
}

/**
 * Toggle theme
 * @returns {void}
 */
export function toggleTheme() {
    const current = getTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
}

// Initialize state when module is loaded
if (typeof window !== 'undefined') {
    loadState();
    
    // Apply theme
    const theme = getTheme();
    if (theme) {
        document.documentElement.className = theme;
    }
}
