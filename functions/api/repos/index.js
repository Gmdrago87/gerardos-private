export async function onRequestGet(context) {
    const { env } = context;
    
    if (!context.data.session.github_token || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Falta configurar GITHUB_PAT o GITHUB_USERNAME" }), {
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
        // Consultar el perfil del usuario autenticado (GET /user) y sus repositorios
        // Usamos /user en lugar de /users/username para que cargue la info privada si está disponible
        const [userRes, reposRes] = await Promise.all([
            fetch("https://api.github.com/user", { headers }),
            fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=all", { headers })
        ]);
        
        if (!userRes.ok || !reposRes.ok) {
            const userErr = await userRes.text();
            const reposErr = await reposRes.text();
            console.error("Error GitHub:", { userErr, reposErr });
            return new Response(JSON.stringify({ error: "Error al comunicarse con GitHub" }), {
                status: 502,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const user = await userRes.json();
        const repos = await reposRes.json();
        
        return new Response(JSON.stringify({ user, repos }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: "Error interno en el proxy del backend" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    if (!context.data.session.github_token) {
        return new Response(JSON.stringify({ error: "Falta configurar GITHUB_PAT" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    try {
        const body = await request.json();
        const { name, description, isPrivate } = body;
        
        if (!name) {
            return new Response(JSON.stringify({ error: "Se requiere el nombre del repositorio" }), {
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
        
        const gitHubBody = JSON.stringify({
            name,
            description: description || "",
            private: !!isPrivate,
            auto_init: true // inicializar con un README.md vacío
        });
        
        const res = await fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers,
            body: gitHubBody
        });
        
        if (!res.ok) {
            const errText = await res.text();
            console.error("Error al crear repo en GitHub:", errText);
            return new Response(JSON.stringify({ error: "No se pudo crear el repositorio en GitHub", details: errText }), {
                status: 502,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const data = await res.json();
        return new Response(JSON.stringify(data), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Formato de petición inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }
}
