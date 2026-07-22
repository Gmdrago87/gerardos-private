/**
 * Repository Commits Handler
 * Fetches commit history for a repository
 * Enhanced with better error handling and pagination
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName, validateGitRef } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, GitHubApiError, handleError } from "../../../_shared/errors.js";

const CACHE_DURATION = 60 * 1000; // 1 minute cache
const commitsCache = new Map();

/**
 * Process commit data
 * @param {Object} commit - Commit data from GitHub
 * @returns {Object} Processed commit
 */
function processCommit(commit) {
    const commitData = commit.commit;
    const author = commitData.author || commitData.committer || {};
    const committer = commitData.committer || author;
    
    return {
        sha: commit.sha,
        shortSha: commit.sha.substring(0, 7),
        message: commitData.message,
        messageTitle: commitData.message.split('\n')[0],
        author: {
            name: author.name || 'Unknown',
            email: author.email || '',
            date: author.date || ''
        },
        committer: {
            name: committer.name || 'Unknown',
            email: committer.email || '',
            date: committer.date || ''
        },
        url: commit.html_url,
        avatar: commit.author?.avatar_url || commit.committer?.avatar_url || null,
        parents: commit.parents?.map(p => p.sha) || [],
        stats: commit.stats || null
    };
}

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const branch = url.searchParams.get('branch') || 'main';
        const perPage = Math.min(parseInt(url.searchParams.get('per_page')) || 30, 100); // Max 100 per page
        const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inv\u00e1lida');
        }
        
        if (isNaN(perPage) || isNaN(page)) {
            throw new ValidationError('Par\u00e1metros de paginaci\u00f3n inv\u00e1lidos');
        }
        
        const cacheKey = `commits_${repoName}_${branch}_${page}_${perPage}`;
        
        // Check cache
        const cached = commitsCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            return jsonResponse({
                ...cached.data,
                cached: true
            });
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}&page=${page}`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new GitHubApiError(`Error al obtener commits: ${res.status}`);
        }
        
        const commits = await res.json();
        
        // Process commits
        const processedCommits = commits.map(processCommit);
        
        const result = {
            repo: repoName,
            branch,
            commits: processedCommits,
            page,
            perPage,
            totalCount: res.headers.get('X-Total-Count') ? parseInt(res.headers.get('X-Total-Count')) : processedCommits.length
        };
        
        // Cache the result
        commitsCache.set(cacheKey, {
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
