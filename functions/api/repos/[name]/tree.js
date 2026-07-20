import { getGitHubHeaders, requireAuth, validateRepoName } from '../../../_shared/github.js';

export async function onRequestGet(context) {
    const authError = requireAuth(context);
    if (authError) return authError;
    
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!validateRepoName(repoName)) {
        return new Response(JSON.stringify({ error: "Nombre de repositorio inválido" }), { status: 400 });
    }
    
    // Obtener la rama de la query string
    const url = new URL(request.url);
    const branch = url.searchParams.get("branch") || "main";
    
    const headers = getGitHubHeaders(context);
    
    try {
        const fetchUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
        const res = await fetch(fetchUrl, { headers });
        
        if (!res.ok) {
            return new Response(JSON.stringify({ error: "No se pudo obtener el árbol de archivos" }), {
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
        return new Response(JSON.stringify({ error: "Error de servidor en el proxy de archivos" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
