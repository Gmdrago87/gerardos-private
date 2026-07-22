/**
 * Repository Issues Handler
 * Fetches issues for a repository
 * Enhanced with better error handling and validation
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, GitHubApiError, handleError } from "../../../_shared/errors.js";

const CACHE_DURATION = 60 * 1000; // 1 minute cache
const issuesCache = new Map();

/**
 * Process issue data
 * @param {Object} issue - Issue data from GitHub
 * @returns {Object} Processed issue
 */
function processIssue(issue) {
    return {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        stateReason: issue.state_reason || null,
        labels: issue.labels.map(l => ({
            name: l.name,
            color: l.color || '#000000',
            description: l.description || null
        })),
        author: {
            login: issue.user?.login || 'Unknown',
            avatarUrl: issue.user?.avatar_url || null,
            type: issue.user?.type || 'User'
        },
        assignees: issue.assignees?.map(a => ({
            login: a.login,
            avatarUrl: a.avatar_url
        })) || [],
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at || null,
        comments: issue.comments,
        commentsUrl: issue.comments_url,
        htmlUrl: issue.html_url,
        isPullRequest: !!issue.pull_request,
        locked: issue.locked || false,
        milestone: issue.milestone ? {
            title: issue.milestone.title,
            number: issue.milestone.number
        } : null
    };
}

/**
 * Validate issue creation data
 * @param {Object} data - Issue data to validate
 * @returns {Object} Validation result
 */
function validateIssueData(data) {
    const errors = [];
    
    if (!data.title || typeof data.title !== 'string') {
        errors.push('El t\u00edtulo es obligatorio y debe ser una cadena de texto');
    }
    
    if (data.title && data.title.length > 255) {
        errors.push('El t\u00edtulo no puede exceder 255 caracteres');
    }
    
    if (data.body && typeof data.body !== 'string') {
        errors.push('El cuerpo debe ser una cadena de texto');
    }
    
    if (data.labels && !Array.isArray(data.labels)) {
        errors.push('Las etiquetas deben ser un array');
    }
    
    if (data.assignees && !Array.isArray(data.assignees)) {
        errors.push('Los asignados deben ser un array');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const state = url.searchParams.get('state') || 'all';
        const perPage = Math.min(parseInt(url.searchParams.get('per_page')) || 30, 100); // Max 100 per page
        const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        if (isNaN(perPage) || isNaN(page)) {
            throw new ValidationError('Par\u00e1metros de paginaci\u00f3n inv\u00e1lidos');
        }
        
        const validStates = ['open', 'closed', 'all'];
        if (!validStates.includes(state)) {
            throw new ValidationError(`Estado inv\u00e1lido. Valores v\u00e1lidos: ${validStates.join(', ')}`);
        }
        
        const cacheKey = `issues_${repoName}_${state}_${page}_${perPage}`;
        
        // Check cache
        const cached = issuesCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            return jsonResponse({
                ...cached.data,
                cached: true
            });
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/issues?state=${state}&per_page=${perPage}&page=${page}`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new GitHubApiError(`Error al obtener issues: ${res.status}`);
        }
        
        const issues = await res.json();
        
        // Process issues
        const processedIssues = issues.map(processIssue);
        
        const result = {
            repo: repoName,
            issues: processedIssues,
            page,
            perPage,
            state,
            totalCount: res.headers.get('X-Total-Count') ? parseInt(res.headers.get('X-Total-Count')) : processedIssues.length
        };
        
        // Cache the result
        issuesCache.set(cacheKey, {
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

export async function onRequestPost(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const body = await request.json();
        
        // Validate issue data
        const validation = validateIssueData(body);
        if (!validation.valid) {
            throw new ValidationError(validation.errors.join('; '));
        }
        
        const { title, body: issueBody, labels = [], assignees = [], milestone = null } = body;
        
        const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/issues`;
        
        const requestBody = {
            title,
            body: issueBody,
            labels,
            assignees
        };
        
        if (milestone) {
            requestBody.milestone = milestone;
        }
        
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            const errorMessages = {
                'Validation Failed': 'Error de validaci\u00f3n: ' + (error.message || 'Datos inv\u00e1lidos'),
                'Not Found': 'Repositorio no encontrado'
            };
            throw new GitHubApiError(errorMessages[error.message] || error.message || 'Error al crear issue');
        }
        
        const newIssue = await res.json();
        
        // Clear cache for this repo
        const cacheKeys = Array.from(issuesCache.keys()).filter(key => key.startsWith(`issues_${repoName}`));
        for (const key of cacheKeys) {
            issuesCache.delete(key);
        }
        
        return jsonResponse({
            success: true,
            message: 'Issue creado correctamente',
            issue: processIssue(newIssue)
        }, 201);
        
    } catch (error) {
        return handleError(error, context);
    }
}
