/**
 * Repository Branches Handler
 * Fetches branch list for a repository
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, handleError } from "../../../_shared/errors.js";

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params } = context;
        const repoName = params.name;
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/branches`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new Error(`Error al obtener ramas: ${res.status}`);
        }
        
        const branches = await res.json();
        
        // Process branches
        const processedBranches = branches.map(branch => ({
            name: branch.name,
            sha: branch.commit.sha,
            message: branch.commit.commit.message,
            date: branch.commit.commit.author?.date || branch.commit.commit.committer?.date || '',
            isDefault: branch.name === 'main' || branch.name === 'master'
        }));
        
        return jsonResponse({
            repo: repoName,
            branches: processedBranches
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
