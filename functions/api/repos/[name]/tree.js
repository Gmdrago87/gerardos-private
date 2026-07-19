export async function onRequestGet(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    // Obtener la rama de la query string
    const url = new URL(request.url);
    const branch = url.searchParams.get("branch") || "main";
    
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
