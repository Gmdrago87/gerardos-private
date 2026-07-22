/**
 * Repositories Handler
 * Fetches user repositories from GitHub API
 * Enhanced with better caching and error handling
 */

import { jsonResponse } from "../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner } from "../../_shared/github.js";
import { requireAuth } from "../../_shared/github.js";
import { AuthError, NotFoundError, GitHubApiError, handleError } from "../../_shared/errors.js";

const CACHE_DURATION = 60 * 5; // 5 minutes cache in memory

// In-memory cache (use KV in production)
const repoCache = new Map();

/**
 * Fetch repositories from GitHub API
 * @param {Object} context - Request context
 * @param {string} owner - Repository owner
 * @returns {Promise<Object>} User and repositories data
 */
async function fetchGitHubRepos(context, owner) {
    const headers = getGitHubHeaders(context);
    
    // Fetch user info
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}`, {
        headers
    });
    
    if (!userRes.ok) {
        if (userRes.status === 404) {
            throw new NotFoundError(`Usuario ${owner} no encontrado`);
        }
        throw new GitHubApiError(`Error al obtener usuario: ${userRes.status}`);
    }
    
    const user = await userRes.json();
    
    // Fetch repositories (including private ones)
    const reposRes = await fetch(`https://api.github.com/user/repos?visibility=all&affiliation=owner&sort=updated&direction=desc&per_page=100`, {
        headers
    });
    
    if (!reposRes.ok) {
        if (reposRes.status === 404) {
            throw new NotFoundError('Repositorios no encontrados');
        }
        
        // Check for rate limiting
        const rateLimitReset = reposRes.headers.get('X-RateLimit-Reset');
        if (reposRes.status === 403 && rateLimitReset) {
            throw new GitHubApiError('L\u00edmite de peticiones a GitHub excedido', {
                resetAt: new Date(parseInt(rateLimitReset) * 1000).toISOString()
            });
        }
        
        throw new GitHubApiError(`Error al obtener repositorios: ${reposRes.status}`);
    }
    
    let repos = await reposRes.json();
    
    // Sort by updated_at descending
    repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    
    return { user, repos };
}

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
                cached: true,
                cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000)
            });
        }
        
        // Fetch from GitHub API
        const { user, repos } = await fetchGitHubRepos(context, owner);
        
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
        const body = await request.json();
        const { name, description = '', isPrivate = false, autoInit = true } = body;
        
        if (!name || typeof name !== 'string') {
            throw new ValidationError('El nombre del repositorio es obligatorio');
        }
        
        // Validate repository name
        if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido. Solo se permiten letras, n\u00fameros, puntos, guiones y guiones bajos.');
        }
        
        if (name.length > 100) {
            throw new ValidationError('El nombre del repositorio no puede exceder 100 caracteres');
        }
        
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const repoBody = {
            name,
            description,
            private: isPrivate
        };
        
        if (autoInit !== undefined) {
            repoBody.auto_init = autoInit;
        }
        
        const res = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers,
            body: JSON.stringify(repoBody)
        });
        
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            const errorMessages = {
                'name already exists on this account': 'Ya existe un repositorio con ese nombre.',
                'Validation Failed': error.message || 'Error de validaci\u00f3n'
            };
            throw new GitHubApiError(errorMessages[error.message] || error.message || 'Error al crear repositorio');
        }
        
        const newRepo = await res.json();
        
        // Clear cache
        const owner = getRepoOwner(context);
        repoCache.delete(`repos_${owner}`);
        
        return jsonResponse({
            success: true,
            message: 'Repositorio creado correctamente',
            repo: newRepo
        }, 201);
        
    } catch (error) {
        return handleError(error, context);
    }
}

// Import ValidationError for type checking
import { ValidationError } from "../../_shared/errors.js";
