import { getGitHubHeaders, requireAuth, validateRepoName } from '../../_shared/github.js';
import { jsonParseErrorResponse, jsonResponse, readJson } from '../../_shared/http.js';

export async function onRequestGet(context) {
    const authError = requireAuth(context);
    if (authError) return authError;
    
    const headers = getGitHubHeaders(context);
    
    try {
        const [userRes, reposRes] = await Promise.all([
            fetch("https://api.github.com/user", { headers }),
            fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=all", { headers })
        ]);
        
        if (!userRes.ok || !reposRes.ok) {
            const userErr = await userRes.text();
            const reposErr = await reposRes.text();
            console.error("Error GitHub:", { userErr, reposErr });
            return jsonResponse({ error: "Error al comunicarse con GitHub" }, 502);
        }
        
        const user = await userRes.json();
        const repos = await reposRes.json();
        
        return jsonResponse({ user, repos });
    } catch (err) {
        return jsonResponse({ error: "Error interno en el proxy del backend" }, 500);
    }
}

export async function onRequestPost(context) {
    const authError = requireAuth(context);
    if (authError) return authError;
    
    try {
        const body = await readJson(context.request);
        const { name, description, isPrivate } = body;
        
        if (!validateRepoName(name)) {
            return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
        }
        
        const headers = getGitHubHeaders(context, true);
        
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
            return jsonResponse({ error: "No se pudo crear el repositorio en GitHub" }, 502);
        }
        
        const data = await res.json();
        return jsonResponse(data, 201);
    } catch (e) {
        if (["UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "INVALID_JSON"].includes(e?.message)) return jsonParseErrorResponse(e);
        return jsonResponse({ error: "Formato de petición inválido" }, 400);
    }
}
