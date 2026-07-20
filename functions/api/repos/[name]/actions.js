import { getGitHubHeaders, requireAuth, validateRepoName } from '../../../_shared/github.js';

export async function onRequestGet(context) {
    const { env, params } = context;
    const repoName = params.name;
    
    const authError = requireAuth(context);
    if (authError) return authError;
    
    if (!validateRepoName(repoName)) {
        return new Response(JSON.stringify({ error: "Nombre de repositorio inválido" }), { status: 400 });
    }
    
    const headers = getGitHubHeaders(context);
    
    try {
        const fetchUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/actions/runs?per_page=15`;
        
        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
            return new Response(JSON.stringify({ error: "No se pudieron obtener los actions" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const data = await res.json();
        
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error interno al obtener actions" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
