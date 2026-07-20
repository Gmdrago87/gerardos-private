import { getGitHubHeaders, requireAuth, validateRepoName } from '../../../_shared/github.js';

export async function onRequestGet(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    const url = new URL(request.url);
    const branch = url.searchParams.get("branch") || "main";
    const page = url.searchParams.get("page") || "1";
    
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
        const fetchUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/commits?sha=${encodeURIComponent(branch)}&page=${encodeURIComponent(page)}&per_page=20`;
        const res = await fetch(fetchUrl, { headers });
        
        if (!res.ok) {
            return new Response(JSON.stringify({ error: "No se pudieron obtener los commits" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const data = await res.json();
        
        // Mapear los commits para devolver solo lo necesario y no sobrecargar la respuesta
        const mappedCommits = data.map(item => ({
            sha: item.sha,
            commit: {
                message: item.commit.message,
                author: {
                    name: item.commit.author.name,
                    date: item.commit.author.date
                }
            },
            author: item.author ? {
                login: item.author.login,
                avatar_url: item.author.avatar_url,
                html_url: item.author.html_url
            } : null
        }));
        
        return new Response(JSON.stringify(mappedCommits), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error al listar commits en el servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
