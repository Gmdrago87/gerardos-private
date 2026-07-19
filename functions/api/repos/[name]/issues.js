export async function onRequestGet(context) {
    const { env, params, request } = context;
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
        // Fetch open issues
        const fetchUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/issues?state=all`;
        
        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
            return new Response(JSON.stringify({ error: "No se pudieron obtener los issues" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const data = await res.json();
        
        // Return JSON
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error interno al obtener issues" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPost(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!context.data.session.github_token || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    try {
        const body = await request.json();
        const { title, body: issueBody, labels } = body;
        
        if (!title) {
            return new Response(JSON.stringify({ error: "El título es obligatorio" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const headers = {
            "Authorization": `Bearer ${context.data.session.github_token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GerardOS-Private-Dashboard",
            "Content-Type": "application/json"
        };
        
        const fetchUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/issues`;
        
        const res = await fetch(fetchUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ title, body: issueBody, labels: labels || [] })
        });
        
        const data = await res.json();
        if (!res.ok) {
            return new Response(JSON.stringify({ error: data.message || "No se pudo crear el issue" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        return new Response(JSON.stringify(data), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error interno al crear issue" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPatch(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!context.data.session.github_token || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    try {
        const body = await request.json();
        const { issue_number, state, labels } = body;
        
        if (!issue_number) {
            return new Response(JSON.stringify({ error: "El issue_number es obligatorio" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const headers = {
            "Authorization": `Bearer ${context.data.session.github_token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GerardOS-Private-Dashboard",
            "Content-Type": "application/json"
        };
        
        const fetchUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/issues/${issue_number}`;
        
        const updateData = {};
        if (state) updateData.state = state;
        if (labels) updateData.labels = labels;
        
        const res = await fetch(fetchUrl, {
            method: "PATCH",
            headers,
            body: JSON.stringify(updateData)
        });
        
        const data = await res.json();
        if (!res.ok) {
            return new Response(JSON.stringify({ error: data.message || "No se pudo actualizar el issue" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error interno al actualizar issue" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
