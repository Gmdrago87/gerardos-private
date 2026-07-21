/**
 * State management for GerardOS Private Dashboard
 * Handles application state and caching
 */

import { CACHE_KEY_USER, CACHE_KEY_REPOS, CACHE_KEY_TIME } from './utils.js';

// Application state
const state = {
    user: null,
    repos: [],
    currentRepo: null,
    currentBranch: 'main',
    currentPath: '',
    searchQuery: '',
    selectedLanguage: 'all',
    selectedSort: 'updated',
    isLoading: false,
    error: null,
    lastUpdated: null
};

// Tree cache for file browser
const treeCache = new Map();

// File content cache
const fileCache = new Map();

/**
 * Get application state
 * @returns {Object} Current state
 */
export function getState() {
    return { ...state };
}

/**
 * Set application state
 * @param {Object} newState - New state to merge
 */
export function setState(newState) {
    Object.assign(state, newState);
}

/**
 * Reset application state
 */
export function resetState() {
    Object.assign(state, {
        user: null,
        repos: [],
        currentRepo: null,
        currentBranch: 'main',
        currentPath: '',
        searchQuery: '',
        selectedLanguage: 'all',
        selectedSort: 'updated',
        isLoading: false,
        error: null,
        lastUpdated: null
    });
    
    // Clear caches
    treeCache.clear();
    fileCache.clear();
}

/**
 * Get cached tree for a repository
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {string} path - Path in repository
 * @returns {Object|null} Cached tree or null
 */
export function getCachedTree(repoName, branch, path) {
    const key = `${repoName}:${branch}:${path}`;
    return treeCache.get(key) || null;
}

/**
 * Set cached tree for a repository
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {string} path - Path in repository
 * @param {Object} tree - Tree data
 */
export function setCachedTree(repoName, branch, path, tree) {
    const key = `${repoName}:${branch}:${path}`;
    treeCache.set(key, tree);
}

/**
 * Clear tree cache for a repository
 * @param {string} repoName - Repository name
 */
export function clearTreeCache(repoName) {
    for (const [key] of treeCache) {
        if (key.startsWith(`${repoName}:`)) {
            treeCache.delete(key);
        }
    }
}

/**
 * Get cached file content
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {string} filePath - File path
 * @returns {string|null} Cached file content or null
 */
export function getCachedFile(repoName, branch, filePath) {
    const key = `${repoName}:${branch}:${filePath}`;
    return fileCache.get(key) || null;
}

/**
 * Set cached file content
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @param {string} filePath - File path
 * @param {string} content - File content
 */
export function setCachedFile(repoName, branch, filePath, content) {
    const key = `${repoName}:${branch}:${filePath}`;
    fileCache.set(key, content);
}

/**
 * Clear file cache for a repository
 * @param {string} repoName - Repository name
 */
export function clearFileCache(repoName) {
    for (const [key] of fileCache) {
        if (key.startsWith(`${repoName}:`)) {
            fileCache.delete(key);
        }
    }
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
    treeCache.clear();
    fileCache.clear();
}

/**
 * Get repository by name
 * @param {string} repoName - Repository name
 * @returns {Object|null} Repository or null
 */
export function getRepoByName(repoName) {
    return state.repos.find(r => r.name === repoName) || null;
}

/**
 * Get repositories by language
 * @param {string} language - Language filter
 * @returns {Array} Filtered repositories
 */
export function getReposByLanguage(language) {
    if (language === 'all') return state.repos;
    return state.repos.filter(r => r.language === language);
}

/**
 * Search repositories
 * @param {string} query - Search query
 * @returns {Array} Filtered repositories
 */
export function searchRepos(query) {
    if (!query) return state.repos;
    
    const lowerQuery = query.toLowerCase();
    return state.repos.filter(r => 
        r.name.toLowerCase().includes(lowerQuery) ||
        (r.description && r.description.toLowerCase().includes(lowerQuery)) ||
        (r.language && r.language.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Sort repositories
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted repositories
 */
export function sortRepos(sortBy = 'updated') {
    const repos = [...state.repos];
    
    switch (sortBy) {
        case 'name':
            return repos.sort((a, b) => a.name.localeCompare(b.name));
        case 'stars':
            return repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
        case 'forks':
            return repos.sort((a, b) => (b.forks_count || 0) - (a.forks_count || 0));
        case 'size':
            return repos.sort((a, b) => (b.size || 0) - (a.size || 0));
        case 'created':
            return repos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'updated':
        default:
            return repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
}

/**
 * Filter and sort repositories
 * @param {Object} filters - Filter options
 * @returns {Array} Filtered and sorted repositories
 */
export function filterAndSortRepos(filters = {}) {
    const { language = 'all', sort = 'updated', search = '' } = filters;
    
    let repos = [...state.repos];
    
    // Filter by language
    if (language !== 'all') {
        repos = repos.filter(r => r.language === language);
    }
    
    // Filter by search
    if (search) {
        const lowerSearch = search.toLowerCase();
        repos = repos.filter(r => 
            r.name.toLowerCase().includes(lowerSearch) ||
            (r.description && r.description.toLowerCase().includes(lowerSearch))
        );
    }
    
    // Sort
    return sortRepos(repos, sort);
}

/**
 * Set current repository
 * @param {string} repoName - Repository name
 */
export function setCurrentRepo(repoName) {
    state.currentRepo = repoName;
    state.currentPath = '';
    state.currentBranch = 'main';
}

/**
 * Set current branch
 * @param {string} branch - Branch name
 */
export function setCurrentBranch(branch) {
    state.currentBranch = branch;
    // Clear tree cache when branch changes
    if (state.currentRepo) {
        clearTreeCache(state.currentRepo);
        clearFileCache(state.currentRepo);
    }
}

/**
 * Set current path
 * @param {string} path - Path in repository
 */
export function setCurrentPath(path) {
    state.currentPath = path;
}

/**
 * Set search query
 * @param {string} query - Search query
 */
export function setSearchQuery(query) {
    state.searchQuery = query;
}

/**
 * Set selected language filter
 * @param {string} language - Language to filter by
 */
export function setSelectedLanguage(language) {
    state.selectedLanguage = language;
}

/**
 * Set sort order
 * @param {string} sort - Sort criteria
 */
export function setSelectedSort(sort) {
    state.selectedSort = sort;
}

/**
 * Set loading state
 * @param {boolean} isLoading - Loading state
 */
export function setLoading(isLoading) {
    state.isLoading = isLoading;
}

/**
 * Set error state
 * @param {Error|null} error - Error or null
 */
export function setError(error) {
    state.error = error;
}

/**
 * Set last updated timestamp
 */
export function setLastUpdated() {
    state.lastUpdated = new Date();
}

/**
 * Get statistics for the dashboard
 * @returns {Object} Dashboard statistics
 */
export function getStats() {
    const totalRepos = state.repos.length;
    const privateRepos = state.repos.filter(r => r.private).length;
    const publicRepos = totalRepos - privateRepos;
    const totalStars = state.repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
    const totalForks = state.repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);
    const totalSize = state.repos.reduce((sum, r) => sum + (r.size || 0), 0);
    
    // Get unique languages
    const languages = new Set(state.repos.map(r => r.language).filter(Boolean));
    
    return {
        totalRepos,
        privateRepos,
        publicRepos,
        totalStars,
        totalForks,
        totalSize,
        languages: Array.from(languages),
        mostUsedLanguage: getMostUsedLanguage()
    };
}

/**
 * Get most used language
 * @returns {string} Most used language
 */
function getMostUsedLanguage() {
    const languageCounts = {};
    state.repos.forEach(r => {
        if (r.language) {
            languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
        }
    });
    
    return Object.entries(languageCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([lang]) => lang)[0] || 'Unknown';
}

/**
 * Get repository statistics
 * @param {string} repoName - Repository name
 * @returns {Object} Repository statistics
 */
export function getRepoStats(repoName) {
    const repo = getRepoByName(repoName);
    if (!repo) return {};
    
    return {
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        size: repo.size || 0,
        language: repo.language,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        private: repo.private || false,
        htmlUrl: repo.html_url
    };
}
