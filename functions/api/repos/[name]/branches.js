/**
 * Repository Branches Handler
 * Fetches branch list for a repository
 * Enhanced with better error handling
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, GitHubApiError, handleError } from "../../../_shared/errors.js";

const CACHE_DURATION = 60 * 1000; // 1 minute cache
const branchesCache = new Map();

/**
 * Process branch data
 * @param {Object} branch - Branch data from GitHub
 * @returns {Object} Processed branch
 */
function processBranch(branch) {
    const commit = branch.commit.commit;
    const author = commit.author || commit.committer || {};
    
    return {
        name: branch.name,
        sha: branch.commit.sha,
        shortSha: branch.commit.sha.substring(0, 7),
        message: commit.message,
        messageTitle: commit.message.split('\n')[0],
        author: {
            name: author.name || 'Unknown',
            email: author.email || '',
            date: author.date || ''
        },
        date: commit.author?.date || commit.committer?.date || '',
        isDefault: branch.name === 'main' || branch.name === 'master',
        protected: branch.protected || false
    };
}

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params } = context;
        const repoName = params.name;
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        const cacheKey = `branches_${repoName}`;
        
        // Check cache
        const cached = branchesCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            return jsonResponse({
                ...cached.data,
                cached: true
            });
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/branches`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new GitHubApiError(`Error al obtener ramas: ${res.status}`);
        }
        
        const branches = await res.json();
        
        // Process branches
        const processedBranches = branches.map(processBranch);
        
        const result = {
            repo: repoName,
            branches: processedBranches,
            defaultBranch: processedBranches.find(b => b.isDefault)?.name || 'main'
        };
        
        // Cache the result
        branchesCache.set(cacheKey, {
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
