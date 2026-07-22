import { getGitHubHeaders, requireAuth, validateRepoName } from '../../_shared/github.js';
import { jsonParseErrorResponse, jsonResponse, readJson } from '../../_shared/http.js';

export async function onRequestGet(context) {
    const authError = requireAuth(context);
    if (authError) return authError;
    
    const headers = getGitHubHeaders(context);
    
    try {
        const userRes = await fetch("https://api.github.com/user", { headers });
        if (!userRes.ok) {
            return jsonResponse({ error: "Error al obtener usuario de GitHub" }, userRes.status);
        }

        const reposRes = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=all", { headers });
        if (!reposRes.ok) {
            return jsonResponse({ error: "Error al obtener repositorios de GitHub" }, reposRes.status);
        }
        
        // Comprobaciones realizadas secuencialmente arriba
        
        const [user, repos] = await Promise.all([userRes.json(), reposRes.json()]);
        return jsonResponse({ user, repos });
    } catch (err) {
        console.error("Backend Proxy Error:", err);
        return jsonResponse({ error: "Error interno en el proxy del backend", details: err.message, stack: err.stack }, 500);
    }
}

export async function onRequestPost(context) {
    const authError = requireAuth(context);
    if (authError) return authError;
    
    try {
        const body = await readJson(context.request);
        const { name, description, isPrivate } = body;
        
        if (!validateRepoName(name)) {
            return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
        }
        
        const headers = getGitHubHeaders(context, true);
        const gitHubBody = JSON.stringify({
            name,
            description: description || "",
            private: Boolean(isPrivate),
            auto_init: true
        });
        
        const res = await fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers,
            body: gitHubBody
        });
        
        const data = await res.json();
        if (!res.ok) {
            return jsonResponse({ error: data?.message || "No se pudo crear el repositorio en GitHub" }, res.status);
        }
        
        return jsonResponse(data, 201);
    } catch (e) {
        if (e?.message?.startsWith("UNSUPPORTED_MEDIA") || e?.message?.startsWith("PAYLOAD_") || e?.message?.startsWith("INVALID_")) {
            return jsonParseErrorResponse(e);
        }
        return jsonResponse({ error: "Formato de petición inválido" }, 400);
    }
}

