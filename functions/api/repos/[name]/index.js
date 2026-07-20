import { getGitHubHeaders, requireAuth, validateRepoName } from '../../../_shared/github.js';
import { jsonParseErrorResponse, jsonResponse, readJson } from '../../../_shared/http.js';

function repoUrl(env, repoName, owner) {
    const user = owner || env.GITHUB_USERNAME;
    return `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repoName)}`;
}

export async function onRequestGet(context) {
    const authError = requireAuth(context);
    if (authError) return authError;

    const { env, params } = context;
    const repoName = params.name;

    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }

    const headers = getGitHubHeaders(context);

    try {
        const res = await fetch(repoUrl(env, repoName), { headers });
        if (!res.ok) {
            return jsonResponse({ error: "Repositorio no encontrado" }, res.status);
        }

        const data = await res.json();
        return jsonResponse(data);
    } catch (e) {
        return jsonResponse({ error: "Error en el proxy" }, 500);
    }
}

export async function onRequestDelete(context) {
    const authError = requireAuth(context);
    if (authError) return authError;

    const { env, params, request } = context;
    const repoName = params.name;

    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }

    try {
        const body = await readJson(request);
        if (body.confirm !== repoName) {
            return jsonResponse({ error: "Confirmación incorrecta: debes escribir el nombre exacto del repositorio" }, 400);
        }

        const headers = getGitHubHeaders(context);
        const owner = context.data.session?.sub || env.GITHUB_USERNAME;

        const res = await fetch(repoUrl(env, repoName, owner), { method: "DELETE", headers });

        if (res.status === 204) {
            return jsonResponse({ ok: true, message: `Repositorio ${repoName} eliminado con éxito` });
        }

        const errText = await res.text();
        let parsedErr;
        try { parsedErr = JSON.parse(errText); } catch(e) {}
        
        let userMsg = parsedErr?.message || "No se pudo eliminar el repositorio en GitHub";
        if (res.status === 403 || res.status === 404) {
            userMsg += ". Si iniciaste sesión anteriormente, cierra sesión y vuelve a entrar para actualizar el permiso de borrado en GitHub (delete_repo).";
        }

        console.error("GitHub delete repo failed", { status: res.status, body: errText });
        return jsonResponse({ error: userMsg, details: errText }, res.status);
    } catch (e) {
        if (["UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "INVALID_JSON"].includes(e?.message)) return jsonParseErrorResponse(e);
        return jsonResponse({ error: "Error interno al eliminar el repositorio", details: e.message }, 500);
    }
}

export async function onRequestPatch(context) {
    const authError = requireAuth(context);
    if (authError) return authError;

    const { env, params, request } = context;
    const repoName = params.name;

    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }

    try {
        const body = await readJson(request);
        if (typeof body.private !== "boolean") {
            return jsonResponse({ error: "Petición inválida: falta el estado private" }, 400);
        }

        const headers = getGitHubHeaders(context, true);
        const res = await fetch(repoUrl(env, repoName), {
            method: "PATCH",
            headers,
            body: JSON.stringify({ name: repoName, private: body.private })
        });

        if (res.ok) {
            const data = await res.json();
            return jsonResponse(data);
        }

        console.error("GitHub update repo failed", { status: res.status, body: await res.text() });
        return jsonResponse({ error: "No se pudo actualizar el repositorio" }, res.status);
    } catch (e) {
        if (["UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "INVALID_JSON"].includes(e?.message)) return jsonParseErrorResponse(e);
        return jsonResponse({ error: "Error interno al actualizar el repositorio" }, 500);
    }
}
