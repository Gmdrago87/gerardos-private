import { getGitHubHeaders, requireAuth, validateRepoName } from '../../../_shared/github.js';

export async function onRequestGet(context) {
    const { env, params } = context;
    const repoName = params.name;
    
    if (!context.data.session.github_token || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    const headers = {
        "Authorization": `Bearer ${context.data.session.github_token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GerardOS-Private-Dashboard"
    };
    
    try {
        const fetchUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/branches`;
        const res = await fetch(fetchUrl, { headers });
        
        if (!res.ok) {
            return new Response(JSON.stringify({ error: "No se pudieron obtener las ramas" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const data = await res.json();
        
        // Mapear ramas para simplificar la respuesta
        const mappedBranches = data.map(item => ({
            name: item.name,
            protected: item.protected
        }));
        
        return new Response(JSON.stringify(mappedBranches), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error al listar ramas en el servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
