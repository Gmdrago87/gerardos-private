import { getGitHubHeaders, requireAuth, validateRepoName } from '../../../_shared/github.js';
import { jsonResponse } from '../../../_shared/http.js';

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
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/branches?per_page=100`;
        const res = await fetch(fetchUrl, { headers });

        if (!res.ok) {
            return jsonResponse({ error: "No se pudieron obtener las ramas" }, res.status);
        }

        const data = await res.json();
        const mappedBranches = data.map(item => ({
            name: item.name,
            protected: item.protected
        }));

        return jsonResponse(mappedBranches);
    } catch (e) {
        return jsonResponse({ error: "Error al listar ramas en el servidor" }, 500);
    }
}
