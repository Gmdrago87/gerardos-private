/**
 * Repository Actions Handler
 * Handles file operations (create, update, delete)
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName, validateGitRef, validateFilePath, encodeGitHubPath } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, handleError } from "../../../_shared/errors.js";

export async function onRequestPost(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const branch = url.searchParams.get('branch') || 'main';
        const filePath = url.searchParams.get('path') || '';
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inválida');
        }
        
        if (filePath && !validateFilePath(filePath)) {
            throw new ValidationError('Ruta de archivo inválida');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const { content, message = 'Add file' } = await request.json();
        
        if (!content) {
            throw new ValidationError('El contenido es obligatorio');
        }
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeGitHubPath(filePath)}`;
        
        // For new files, we need to get the current branch SHA
        const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches/${encodeURIComponent(branch)}`, {
            headers
        });
        
        if (!branchRes.ok) {
            throw new Error('No se pudo obtener información de la rama');
        }
        
        const branchData = await branchRes.json();
        
        const body = {
            message,
            content: btoa(content),
            branch
        };
        
        // If file exists, we need the SHA for update
        try {
            const fileRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
                headers
            });
            
            if (fileRes.ok) {
                const fileData = await fileRes.json();
                body.sha = fileData.sha;
            }
        } catch (e) {
            // File doesn't exist, create new
        }
        
        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al guardar el archivo');
        }
        
        const result = await res.json();
        
        return jsonResponse({
            success: true,
            commit: {
                sha: result.commit.sha,
                message: result.commit.message,
                url: result.commit.html_url
            },
            content: {
                path: result.content.path,
                htmlUrl: result.content.html_url
            }
        }, 201);
        
    } catch (error) {
        return handleError(error, context);
    }
}

export async function onRequestDelete(context) {
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
        headers['Content-Type'] = 'application/json';
        
        const { message = 'Delete file', confirm = false } = await request.json();
        
        if (!confirm) {
            throw new ValidationError('Debes confirmar la eliminación');
        }
        
        // Get file SHA first
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(branch)}`;
        
        const fileRes = await fetch(apiUrl, {
            headers
        });
        
        if (!fileRes.ok) {
            if (fileRes.status === 404) {
                throw new NotFoundError('Archivo no encontrado');
            }
            throw new Error('Error al obtener información del archivo');
        }
        
        const fileData = await fileRes.json();
        
        // Delete the file
        const res = await fetch(apiUrl, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
                message,
                sha: fileData.sha,
                branch
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al eliminar el archivo');
        }
        
        return jsonResponse({
            success: true,
            message: 'Archivo eliminado correctamente'
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
