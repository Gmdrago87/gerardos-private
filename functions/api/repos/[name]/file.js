/**
 * Repository File Handler
 * Fetches file content from repository
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName, validateGitRef, validateFilePath, encodeGitHubPath } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, handleError } from "../../../_shared/errors.js";

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const branch = url.searchParams.get('branch') || 'main';
        const filePath = url.searchParams.get('path');
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inválida');
        }
        
        if (!filePath || !validateFilePath(filePath)) {
            throw new ValidationError('Ruta de archivo inválida');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        headers['Accept'] = 'application/vnd.github.v3.raw';
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(branch)}`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Archivo no encontrado');
            }
            throw new Error(`Error al obtener el archivo: ${res.status}`);
        }
        
        // Get content based on content type
        const contentType = res.headers.get('Content-Type');
        let content;
        
        if (contentType?.includes('application/json')) {
            // It's a JSON response (file metadata)
            const fileInfo = await res.json();
            if (fileInfo.encoding === 'base64') {
                content = atob(fileInfo.content);
            } else {
                content = fileInfo.content || '';
            }
        } else {
            // It's raw content
            content = await res.text();
        }
        
        return jsonResponse({
            repo: repoName,
            branch,
            path: filePath,
            content,
            encoding: 'utf-8'
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
