import { getGitHubHeaders, requireAuth, validateGitRef, validateRepoName } from '../../../_shared/github.js';
import { jsonResponse } from '../../../_shared/http.js';

export async function onRequestGet(context) {
    const authError = requireAuth(context);
    if (authError) return authError;
    
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }
    
    // Obtener la rama de la query string
    const url = new URL(request.url);
    const branch = url.searchParams.get("branch") || "main";
    if (!validateGitRef(branch)) {
        return jsonResponse({ error: "Rama o referencia inválida" }, 400);
    }
    
    const headers = getGitHubHeaders(context);
    
    try {
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
        const res = await fetch(fetchUrl, { headers });
        
        if (!res.ok) {
            return jsonResponse({ error: "No se pudo obtener el árbol de archivos" }, res.status);
        }
        
        const data = await res.json();
        return jsonResponse(data);
    } catch (e) {
        return jsonResponse({ error: "Error de servidor en el proxy de archivos" }, 500);
    }
}
