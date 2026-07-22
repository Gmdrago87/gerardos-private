import { getGitHubHeaders, getRepoOwner, requireAuth, validateRepoName } from '../../../_shared/github.js';
import { jsonResponse } from '../../../_shared/http.js';

export async function onRequestGet(context) {
    const { params } = context;
    const repoName = params.name;
    
    const authError = requireAuth(context);
    if (authError) return authError;
    
    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }
    
    const headers = getGitHubHeaders(context);
    
    try {
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(getRepoOwner(context))}/${encodeURIComponent(repoName)}/actions/runs?per_page=15`;
        
        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
            return jsonResponse({ error: "No se pudieron obtener los actions" }, res.status);
        }
        
        const data = await res.json();
        
        return jsonResponse(data);
    } catch (e) {
        return jsonResponse({ error: "Error interno al obtener actions" }, 500);
    }
}
