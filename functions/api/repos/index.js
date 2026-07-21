/**
 * Repositories Handler
 * Fetches user repositories from GitHub API
 */

import { jsonResponse } from "../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner } from "../../_shared/github.js";
import { requireAuth } from "../../_shared/github.js";
import { AuthError, handleError } from "../../_shared/errors.js";

const CACHE_DURATION = 60 * 5; // 5 minutes cache in memory

// In-memory cache (use KV in production)
const repoCache = new Map();

export async function onRequestGet(context) {
    try {
        // Require authentication
        requireAuth(context);
        
        const { env, data } = context;
        const owner = getRepoOwner(context);
        const cacheKey = `repos_${owner}`;
        
        // Check cache
        const cached = repoCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION * 1000)) {
            return jsonResponse({
                user: cached.user,
                repos: cached.repos,
                cached: true
            });
        }
        
        // Fetch from GitHub API
        const headers = getGitHubHeaders(context);
        
        // Fetch user info
        const userRes = await fetch(`https://api.github.com/users/${owner}`, {
            headers
        });
        
        if (!userRes.ok) {
            throw new Error(`Failed to fetch user: ${userRes.status}`);
        }
        
        const user = await userRes.json();
        
        // Fetch repositories (including private ones)
        const reposRes = await fetch(`https://api.github.com/user/repos?visibility=all&affiliation=owner&sort=updated&direction=desc&per_page=100`, {
            headers
        });
        
        if (!reposRes.ok) {
            throw new Error(`Failed to fetch repos: ${reposRes.status}`);
        }
        
        let repos = await reposRes.json();
        
        // Filter out forks if desired (optional)
        // repos = repos.filter(r => !r.fork);
        
        // Sort by updated_at descending
        repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        // Cache the result
        repoCache.set(cacheKey, {
            user,
            repos,
            timestamp: Date.now()
        });
        
        return jsonResponse({
            user,
            repos,
            cached: false
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}

export async function onRequestPost(context) {
    try {
        requireAuth(context);
        
        const { request, env } = context;
        const { name, description = '', isPrivate = false } = await request.json();
        
        if (!name) {
            throw new ValidationError('El nombre del repositorio es obligatorio');
        }
        
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const body = JSON.stringify({
            name,
            description,
            private: isPrivate
        });
        
        const res = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers,
            body
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear repositorio');
        }
        
        const newRepo = await res.json();
        
        // Clear cache
        const owner = getRepoOwner(context);
        repoCache.delete(`repos_${owner}`);
        
        return jsonResponse(newRepo, 201);
        
    } catch (error) {
        return handleError(error, context);
    }
}
