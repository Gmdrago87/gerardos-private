/**
 * Repository Commits Handler
 * Fetches commit history for a repository
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName, validateGitRef } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, handleError } from "../../../_shared/errors.js";

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const branch = url.searchParams.get('branch') || 'main';
        const perPage = parseInt(url.searchParams.get('per_page')) || 30;
        const page = parseInt(url.searchParams.get('page')) || 1;
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inválida');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}&page=${page}`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new Error(`Error al obtener commits: ${res.status}`);
        }
        
        const commits = await res.json();
        
        // Process commits
        const processedCommits = commits.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name || 'Unknown',
            authorEmail: commit.commit.author?.email || '',
            date: commit.commit.author?.date || commit.commit.committer?.date || '',
            url: commit.html_url,
            avatar: commit.author?.avatar_url || commit.committer?.avatar_url || null
        }));
        
        return jsonResponse({
            repo: repoName,
            branch,
            commits: processedCommits,
            page,
            perPage
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
