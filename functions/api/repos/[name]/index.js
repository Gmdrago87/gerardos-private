/**
 * Repository Handler
 * Handles operations on a specific repository
 * Enhanced with better error handling and validation
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, GitHubApiError, ForbiddenError, handleError } from "../../../_shared/errors.js";

/**
 * Check if user has access to repository
 * @param {Object} context - Request context
 * @param {string} owner - Repository owner
 * @param {string} repoName - Repository name
 * @returns {Promise<boolean>} True if user has access
 */
async function checkRepoAccess(context, owner, repoName) {
    const headers = getGitHubHeaders(context);
    
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}`, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                return false;
            }
            if (res.status === 403) {
                throw new ForbiddenError('No tienes permiso para acceder a este repositorio');
            }
            throw new GitHubApiError(`Error al verificar acceso: ${res.status}`);
        }
        
        return true;
    } catch (error) {
        if (error instanceof ForbiddenError) {
            throw error;
        }
        throw new GitHubApiError(`Error al verificar acceso al repositorio: ${error.message}`);
    }
}

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params } = context;
        const repoName = params.name;
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        const owner = getRepoOwner(context);
        
        // Check if user has access to this repository
        const hasAccess = await checkRepoAccess(context, owner, repoName);
        if (!hasAccess) {
            throw new NotFoundError('Repositorio no encontrado o no accesible');
        }
        
        const headers = getGitHubHeaders(context);
        
        const res = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}`, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new GitHubApiError(`Error al obtener repositorio: ${res.status}`);
        }
        
        const repo = await res.json();
        return jsonResponse({
            success: true,
            repo
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}

export async function onRequestDelete(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        const owner = getRepoOwner(context);
        
        // Check if user has access
        const hasAccess = await checkRepoAccess(context, owner, repoName);
        if (!hasAccess) {
            throw new NotFoundError('Repositorio no encontrado');
        }
        
        const headers = getGitHubHeaders(context);
        
        // Confirm deletion
        const body = await request.json();
        if (!body.confirm) {
            throw new ValidationError('Debes confirmar la eliminaci\u00f3n');
        }
        
        // Check if repository name matches expected pattern to prevent accidental deletion
        if (repoName.toLowerCase() === 'gerardos-private') {
            throw new ForbiddenError('No se puede eliminar este repositorio');
        }
        
        const res = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}`, {
            method: 'DELETE',
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            const error = await res.json().catch(() => ({}));
            throw new GitHubApiError(error.message || 'Error al eliminar repositorio');
        }
        
        return jsonResponse({
            success: true,
            message: 'Repositorio eliminado correctamente'
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}

export async function onRequestPatch(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        const owner = getRepoOwner(context);
        
        // Check if user has access
        const hasAccess = await checkRepoAccess(context, owner, repoName);
        if (!hasAccess) {
            throw new NotFoundError('Repositorio no encontrado');
        }
        
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const body = await request.json();
        const updateData = {};
        
        if (body.name !== undefined) {
            if (typeof body.name !== 'string') {
                throw new ValidationError('El nombre debe ser una cadena de texto');
            }
            updateData.name = body.name;
        }
        if (body.description !== undefined) {
            if (typeof body.description !== 'string') {
                throw new ValidationError('La descripci\u00f3n debe ser una cadena de texto');
            }
            updateData.description = body.description;
        }
        if (body.private !== undefined) {
            if (typeof body.private !== 'boolean') {
                throw new ValidationError('El valor de privado debe ser booleano');
            }
            updateData.private = body.private;
        }
        if (body.homepage !== undefined) {
            if (typeof body.homepage !== 'string') {
                throw new ValidationError('La p\u00e1gina de inicio debe ser una URL v\u00e1lida');
            }
            updateData.homepage = body.homepage;
        }
        
        if (Object.keys(updateData).length === 0) {
            throw new ValidationError('No se proporcionaron datos para actualizar');
        }
        
        const res = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateData)
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            const error = await res.json().catch(() => ({}));
            throw new GitHubApiError(error.message || 'Error al actualizar repositorio');
        }
        
        const updatedRepo = await res.json();
        return jsonResponse({
            success: true,
            message: 'Repositorio actualizado correctamente',
            repo: updatedRepo
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
