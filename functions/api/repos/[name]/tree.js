/**
 * Repository Tree Handler
 * Fetches repository file tree
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName, validateGitRef, encodeGitHubPath } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, handleError } from "../../../_shared/errors.js";

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const branch = url.searchParams.get('branch') || 'main';
        const path = url.searchParams.get('path') || '';
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inválida');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Build the API URL
        let apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(branch)}`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Ruta no encontrada');
            }
            throw new Error(`Error al obtener el árbol: ${res.status}`);
        }
        
        let tree = await res.json();
        
        // If it's a single file, wrap it in an array
        if (tree.type !== 'dir' && !Array.isArray(tree)) {
            tree = [tree];
        }
        
        // Process tree items
        const processedTree = Array.isArray(tree) ? tree.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            sha: item.sha,
            url: item.download_url || item.git_url || item.html_url,
            isDir: item.type === 'dir'
        })) : {
            name: tree.name,
            path: tree.path,
            type: tree.type,
            size: tree.size,
            sha: tree.sha,
            url: tree.download_url || tree.git_url || tree.html_url,
            isDir: tree.type === 'dir'
        };
        
        return jsonResponse({
            repo: repoName,
            branch,
            path,
            tree: processedTree
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
