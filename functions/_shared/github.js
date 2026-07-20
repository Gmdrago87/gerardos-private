export function getGitHubHeaders(context, withContentType = false) {
    const headers = {
        "Authorization": `Bearer ${context.data.session.github_token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GerardOS-Private-Dashboard"
    };
    if (withContentType) {
        headers["Content-Type"] = "application/json";
    }
    return headers;
}

export function validateRepoName(name) {
    if (!name) return false;
    return /^[a-zA-Z0-9._-]+$/.test(name);
}

export function requireAuth(context) {
    if (!context.data.session || !context.data.session.github_token) {
        return new Response(JSON.stringify({ error: "Falta configurar GITHUB_PAT o sesión no válida" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }
    if (!context.env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Falta configurar GITHUB_USERNAME" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    return null;
}
