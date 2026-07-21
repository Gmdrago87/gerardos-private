/**
 * Repository Handler
 * Handles operations on a specific repository
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
        
        const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new Error(`Error al obtener repositorio: ${res.status}`);
        }
        
        const repo = await res.json();
        return jsonResponse(repo);
        
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
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        
        // Confirm deletion (optional - can be handled client-side)
        const body = await request.json();
        if (!body.confirm) {
            throw new ValidationError('Debes confirmar la eliminación');
        }
        
        const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
            method: 'DELETE',
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new Error(`Error al eliminar repositorio: ${res.status}`);
        }
        
        return jsonResponse({ success: true, message: 'Repositorio eliminado correctamente' });
        
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
            throw new ValidationError('Nombre de repositorio inválido');
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        headers['Content-Type'] = 'application/json';
        
        const body = await request.json();
        const updateData = {};
        
        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.private !== undefined) updateData.private = body.private;
        
        if (Object.keys(updateData).length === 0) {
            throw new ValidationError('No se proporcionaron datos para actualizar');
        }
        
        const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateData)
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Repositorio no encontrado');
            }
            throw new Error(`Error al actualizar repositorio: ${res.status}`);
        }
        
        const updatedRepo = await res.json();
        return jsonResponse(updatedRepo);
        
    } catch (error) {
        return handleError(error, context);
    }
}
