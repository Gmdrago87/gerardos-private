/**
 * Repository Tree Handler
 * Fetches repository file tree
 * Enhanced with better error handling and pagination
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName, validateGitRef, encodeGitHubPath } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, GitHubApiError, handleError } from "../../../_shared/errors.js";

const CACHE_DURATION = 60 * 1000; // 1 minute cache
const treeCache = new Map();

/**
 * Process tree item
 * @param {Object} item - Tree item from GitHub
 * @returns {Object} Processed item
 */
function processTreeItem(item) {
    if (item.type === 'dir') {
        return {
            name: item.name,
            path: item.path,
            type: item.type,
            sha: item.sha,
            url: item.url || item.html_url,
            isDir: true,
            size: item.size || 0
        };
    }
    
    return {
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size || 0,
        sha: item.sha,
        url: item.download_url || item.git_url || item.html_url,
        isDir: false,
        extension: item.name.includes('.') ? item.name.split('.').pop().toLowerCase() : null
    };
}

/**
 * Process tree array
 * @param {Array} tree - Tree array from GitHub
 * @returns {Array} Processed tree
 */
function processTree(tree) {
    if (!Array.isArray(tree)) {
        return [processTreeItem(tree)];
    }
    
    return tree.map(processTreeItem);
}

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const branch = url.searchParams.get('branch') || 'main';
        let path = url.searchParams.get('path') || '';
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inv\u00e1lida');
        }
        
        // Normalize path
        path = path.trim().replace(/^\/+|\/+$/g, '');
        
        const cacheKey = `tree_${repoName}_${branch}_${path}`;
        
        // Check cache
        const cached = treeCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            return jsonResponse({
                ...cached.data,
                cached: true
            });
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Build the API URL
        let apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/contents`;
        
        if (path) {
            apiUrl += `/${encodeGitHubPath(path)}`;
        }
        
        apiUrl += `?ref=${encodeURIComponent(branch)}`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Ruta no encontrada');
            }
            throw new GitHubApiError(`Error al obtener el \u00e1rbol: ${res.status}`);
        }
        
        let tree = await res.json();
        
        // If it's a single file, wrap it in an array
        if (tree.type !== 'dir' && !Array.isArray(tree)) {
            tree = [tree];
        }
        
        // Process tree
        const processedTree = processTree(tree);
        
        const result = {
            repo: repoName,
            branch,
            path,
            tree: processedTree
        };
        
        // Cache the result
        treeCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
        
        return jsonResponse({
            ...result,
            cached: false
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
