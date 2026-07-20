import { getGitHubHeaders, requireAuth, validateRepoName } from '../../../_shared/github.js';

export async function onRequestGet(context) {
    const authError = requireAuth(context);
    if (authError) return authError;
    
    const { env, params } = context;
    const repoName = params.name;
    
    if (!validateRepoName(repoName)) {
        return new Response(JSON.stringify({ error: "Nombre de repositorio inválido" }), { status: 400 });
    }
    
    const headers = getGitHubHeaders(context);
    
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
    const authError = requireAuth(context);
    if (authError) return authError;
    
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!validateRepoName(repoName)) {
        return new Response(JSON.stringify({ error: "Nombre de repositorio inválido" }), { status: 400 });
    }
    
    try {
        const body = await request.json();
        if (body.confirm !== repoName) {
            return new Response(JSON.stringify({ error: "Confirmación incorrecta: debes escribir el nombre exacto del repositorio" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const headers = getGitHubHeaders(context);
        
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

export async function onRequestPatch(context) {
    const authError = requireAuth(context);
    if (authError) return authError;
    
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!validateRepoName(repoName)) {
        return new Response(JSON.stringify({ error: "Nombre de repositorio inválido" }), { status: 400 });
    }
    
    try {
        const body = await request.json();
        if (typeof body.private !== 'boolean') {
            return new Response(JSON.stringify({ error: "Petición inválida: falta el estado private" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const headers = getGitHubHeaders(context, true);
        
        const res = await fetch(`https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ private: body.private })
        });
        
        if (res.ok) {
            const data = await res.json();
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } else {
            const err = await res.text();
            return new Response(JSON.stringify({ error: "No se pudo actualizar el repositorio", details: err }), {
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
