import { getGitHubHeaders, getRepoOwner, requireAuth, validateGitRef, validateRepoName } from '../../../_shared/github.js';
import { jsonResponse } from '../../../_shared/http.js';

export async function onRequestGet(context) {
    const { params, request } = context;
    const repoName = params.name;

    const authError = requireAuth(context);
    if (authError) return authError;

    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }

    const url = new URL(request.url);
    const branch = url.searchParams.get("branch") || "main";
    const page = Number.parseInt(url.searchParams.get("page") || "1", 10);

    if (!validateGitRef(branch)) {
        return jsonResponse({ error: "Rama o referencia inválida" }, 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > 100) {
        return jsonResponse({ error: "Página inválida" }, 400);
    }

    const headers = getGitHubHeaders(context);

    try {
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(getRepoOwner(context))}/${encodeURIComponent(repoName)}/commits?sha=${encodeURIComponent(branch)}&page=${page}&per_page=20`;
        const res = await fetch(fetchUrl, { headers });

        if (!res.ok) {
            return jsonResponse({ error: "No se pudieron obtener los commits" }, res.status);
        }

        const data = await res.json();
        const mappedCommits = data.map(item => ({
            sha: item.sha,
            commit: {
                message: item.commit?.message || "",
                author: {
                    name: item.commit?.author?.name || "",
                    date: item.commit?.author?.date || null
                }
            },
            author: item.author ? {
                login: item.author.login,
                avatar_url: item.author.avatar_url,
                html_url: item.author.html_url
            } : null
        }));

        return jsonResponse(mappedCommits);
    } catch (e) {
        return jsonResponse({ error: "Error al listar commits en el servidor" }, 500);
    }
}
