/**
 * Repository Actions Handler
 * Handles file operations (create, update, delete)
 * Enhanced with better error handling and validation
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName, validateGitRef, validateFilePath, encodeGitHubPath } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, GitHubApiError, handleError } from "../../../_shared/errors.js";

/**
 * Get file SHA from GitHub
 * @param {Object} context - Request context
 * @param {string} owner - Repository owner
 * @param {string} repoName - Repository name
 * @param {string} filePath - File path
 * @param {string} branch - Branch name
 * @returns {Promise<string|null>} File SHA or null if not found
 */
async function getFileSha(context, owner, repoName, filePath, branch) {
    const headers = getGitHubHeaders(context);
    const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(branch)}`;
    
    try {
        const res = await fetch(apiUrl, { headers });
        
        if (res.ok) {
            const fileData = await res.json();
            return fileData.sha;
        }
        
        if (res.status === 404) {
            return null; // File doesn't exist
        }
        
        throw new GitHubApiError(`Error al obtener SHA del archivo: ${res.status}`);
    } catch (error) {
        throw new GitHubApiError(`Error al obtener informaci\u00f3n del archivo: ${error.message}`);
    }
}

/**
 * Get branch SHA from GitHub
 * @param {Object} context - Request context
 * @param {string} owner - Repository owner
 * @param {string} repoName - Repository name
 * @param {string} branch - Branch name
 * @returns {Promise<string>} Branch SHA
 */
async function getBranchSha(context, owner, repoName, branch) {
    const headers = getGitHubHeaders(context);
    const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/branches/${encodeURIComponent(branch)}`;
    
    const res = await fetch(apiUrl, { headers });
    
    if (!res.ok) {
        if (res.status === 404) {
            throw new NotFoundError(`Rama ${branch} no encontrada`);
        }
        throw new GitHubApiError(`Error al obtener informaci\u00f3n de la rama: ${res.status}`);
    }
    
    const branchData = await res.json();
    return branchData.commit.sha;
}

export async function onRequestPost(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const branch = url.searchParams.get('branch') || 'main';
        let filePath = url.searchParams.get('path') || '';
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inv\u00e1lida');
        }
        
        // Normalize file path
        filePath = filePath.trim();
        if (filePath && !validateFilePath(filePath)) {
            throw new ValidationError('Ruta de archivo inv\u00e1lida');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const body = await request.json();
        const { content, message = 'Add file', commitMessage } = body;
        
        if (!content || typeof content !== 'string') {
            throw new ValidationError('El contenido es obligatorio y debe ser una cadena de texto');
        }
        
        if (content.length > 10 * 1024 * 1024) { // 10MB limit
            throw new ValidationError('El contenido es demasiado grande (m\u00e1ximo 10MB)');
        }
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/contents/${encodeGitHubPath(filePath)}`;
        
        // Get branch SHA
        const branchSha = await getBranchSha(context, owner, repoName, branch);
        
        // Get file SHA if it exists
        let fileSha = null;
        if (filePath) {
            fileSha = await getFileSha(context, owner, repoName, filePath, branch);
        }
        
        const requestBody = {
            message: commitMessage || message,
            content: btoa(encodeURIComponent(content)),
            branch: branchSha
        };
        
        if (fileSha) {
            requestBody.sha = fileSha;
        }
        
        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            const errorMessages = {
                'Validation Failed': 'Error de validaci\u00f3n: ' + (error.message || 'Datos inv\u00e1lidos'),
                'Not Found': 'Repositorio o ruta no encontrada'
            };
            throw new GitHubApiError(errorMessages[error.message] || error.message || 'Error al guardar el archivo');
        }
        
        const result = await res.json();
        
        return jsonResponse({
            success: true,
            message: fileSha ? 'Archivo actualizado correctamente' : 'Archivo creado correctamente',
            commit: {
                sha: result.commit.sha,
                message: result.commit.message,
                url: result.commit.html_url
            },
            content: {
                path: result.content.path,
                htmlUrl: result.content.html_url,
                downloadUrl: result.content.download_url
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
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inv\u00e1lida');
        }
        
        if (!filePath || !validateFilePath(filePath)) {
            throw new ValidationError('Ruta de archivo inv\u00e1lida');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const body = await request.json();
        const { message = 'Delete file', commitMessage, confirm = false } = body;
        
        if (!confirm) {
            throw new ValidationError('Debes confirmar la eliminaci\u00f3n');
        }
        
        // Get file SHA first
        const fileSha = await getFileSha(context, owner, repoName, filePath, branch);
        
        if (!fileSha) {
            throw new NotFoundError('Archivo no encontrado');
        }
        
        // Get branch SHA
        const branchSha = await getBranchSha(context, owner, repoName, branch);
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/contents/${encodeGitHubPath(filePath)}`;
        
        const res = await fetch(apiUrl, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
                message: commitMessage || message,
                sha: fileSha,
                branch: branchSha
            })
        });
        
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            const errorMessages = {
                'Not Found': 'Archivo no encontrado',
                'Validation Failed': 'Error de validaci\u00f3n: ' + (error.message || 'Datos inv\u00e1lidos')
            };
            throw new GitHubApiError(errorMessages[error.message] || error.message || 'Error al eliminar el archivo');
        }
        
        return jsonResponse({
            success: true,
            message: 'Archivo eliminado correctamente'
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
