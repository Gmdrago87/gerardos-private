import { getGitHubHeaders, requireAuth, validateRepoName } from '../../../_shared/github.js';
import { jsonParseErrorResponse, jsonResponse, readJson } from '../../../_shared/http.js';

function validateLabels(labels) {
    return labels === undefined || (Array.isArray(labels) && labels.length <= 20 && labels.every(label => typeof label === "string" && label.length > 0 && label.length <= 50));
}

export async function onRequestGet(context) {
    const { env, params } = context;
    const repoName = params.name;

    const authError = requireAuth(context);
    if (authError) return authError;

    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }

    const headers = getGitHubHeaders(context);

    try {
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/issues?state=all&per_page=100`;
        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
            return jsonResponse({ error: "No se pudieron obtener los issues" }, res.status);
        }

        const data = await res.json();
        return jsonResponse(data);
    } catch (e) {
        return jsonResponse({ error: "Error interno al obtener issues" }, 500);
    }
}

export async function onRequestPost(context) {
    const { env, params, request } = context;
    const repoName = params.name;

    const authError = requireAuth(context);
    if (authError) return authError;

    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }

    try {
        const body = await readJson(request);
        const { title, body: issueBody, labels } = body;

        if (typeof title !== "string" || title.trim().length === 0 || title.length > 256) {
            return jsonResponse({ error: "El título es obligatorio y debe tener 256 caracteres o menos" }, 400);
        }
        if (issueBody !== undefined && (typeof issueBody !== "string" || issueBody.length > 65536)) {
            return jsonResponse({ error: "El cuerpo del issue es inválido" }, 400);
        }
        if (!validateLabels(labels)) {
            return jsonResponse({ error: "Las etiquetas son inválidas" }, 400);
        }

        const headers = getGitHubHeaders(context, true);
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/issues`;

        const res = await fetch(fetchUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ title: title.trim(), body: issueBody || "", labels: labels || [] })
        });

        const data = await res.json();
        if (!res.ok) {
            return jsonResponse({ error: data.message || "No se pudo crear el issue" }, res.status);
        }

        return jsonResponse(data, 201);
    } catch (e) {
        if (["UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "INVALID_JSON"].includes(e?.message)) return jsonParseErrorResponse(e);
        return jsonResponse({ error: "Error interno al crear issue" }, 500);
    }
}

export async function onRequestPatch(context) {
    const { env, params, request } = context;
    const repoName = params.name;

    const authError = requireAuth(context);
    if (authError) return authError;

    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }

    try {
        const body = await readJson(request);
        const { issue_number, state, labels } = body;
        const num = Number(issue_number);

        if (!Number.isInteger(num) || num < 1) {
            return jsonResponse({ error: "El issue_number debe ser un entero positivo" }, 400);
        }
        if (state !== undefined && !["open", "closed"].includes(state)) {
            return jsonResponse({ error: "Estado de issue inválido" }, 400);
        }
        if (!validateLabels(labels)) {
            return jsonResponse({ error: "Las etiquetas son inválidas" }, 400);
        }

        const headers = getGitHubHeaders(context, true);
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/issues/${num}`;

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
            return jsonResponse({ error: data.message || "No se pudo actualizar el issue" }, res.status);
        }

        return jsonResponse(data);
    } catch (e) {
        if (["UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "INVALID_JSON"].includes(e?.message)) return jsonParseErrorResponse(e);
        return jsonResponse({ error: "Error interno al actualizar issue" }, 500);
    }
}
