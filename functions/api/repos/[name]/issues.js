/**
 * Repository Issues Handler
 * Fetches issues for a repository
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, handleError } from "../../../_shared/errors.js";

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const state = url.searchParams.get('state') || 'all';
        const perPage = parseInt(url.searchParams.get('per_page')) || 30;
        const page = parseInt(url.searchParams.get('page')) || 1;
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/issues?state=${state}&per_page=${perPage}&page=${page}`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new Error(`Error al obtener issues: ${res.status}`);
        }
        
        const issues = await res.json();
        
        // Process issues
        const processedIssues = issues.map(issue => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            body: issue.body,
            state: issue.state,
            labels: issue.labels.map(l => l.name),
            author: issue.user?.login || 'Unknown',
            authorAvatar: issue.user?.avatar_url || null,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            comments: issue.comments,
            htmlUrl: issue.html_url,
            isPullRequest: !!issue.pull_request
        }));
        
        return jsonResponse({
            repo: repoName,
            issues: processedIssues,
            page,
            perPage
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
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const { title, body, labels = [], assignees = [] } = await request.json();
        
        if (!title) {
            throw new ValidationError('El título es obligatorio');
        }
        
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/issues`;
        
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title,
                body,
                labels,
                assignees
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear issue');
        }
        
        const newIssue = await res.json();
        
        return jsonResponse({
            success: true,
            issue: {
                id: newIssue.id,
                number: newIssue.number,
                title: newIssue.title,
                htmlUrl: newIssue.html_url
            }
        }, 201);
        
    } catch (error) {
        return handleError(error, context);
    }
}
