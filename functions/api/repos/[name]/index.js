export async function onRequestGet(context) {
    const { env, params } = context;
    const repoName = params.name;
    
    if (!env.GITHUB_PAT || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    const headers = {
        "Authorization": `Bearer ${env.GITHUB_PAT}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GerardOS-Private-Dashboard"
    };
    
    try {
        const res = await fetch(`https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}`, { headers });
        if (!res.ok) {
            return new Response(JSON.stringify({ error: "Repositorio no encontrado" }), {
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
        return new Response(JSON.stringify({ error: "Error en el proxy" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestDelete(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!env.GITHUB_PAT || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    try {
        // Doble verificación: comprobar que el usuario envió una confirmación en el cuerpo
        const body = await request.json();
        if (body.confirm !== repoName) {
            return new Response(JSON.stringify({ error: "Confirmación incorrecta: debes escribir el nombre exacto del repositorio" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const headers = {
            "Authorization": `Bearer ${env.GITHUB_PAT}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GerardOS-Private-Dashboard"
        };
        
        const res = await fetch(`https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}`, {
            method: "DELETE",
            headers
        });
        
        if (res.status === 204) {
            return new Response(JSON.stringify({ ok: true, message: `Repositorio ${repoName} eliminado con éxito` }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } else {
            const err = await res.text();
            return new Response(JSON.stringify({ error: "No se pudo eliminar el repositorio", details: err }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: "Petición inválida o error en el servidor" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }
}
