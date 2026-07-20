import { jsonResponse } from './http.js';

const REPO_NAME_REGEX = /^(?!\.)(?!.*\.git$)[A-Za-z0-9._-]{1,100}$/;
const GIT_REF_REGEX = /^(?!\/)(?!.*\.\.)(?!.*@\{)(?!.*\\)(?!.*\/\/)(?!.*\.$)[A-Za-z0-9._\/-]{1,255}$/;
const SHA_REGEX = /^[a-f0-9]{40}$/i;

const BASE_GITHUB_HEADERS = Object.freeze({
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GerardOS-Private-Dashboard"
});

export function getGitHubHeaders(context, withContentType = false) {
    const token = context.data.session.github_token;
    return {
        ...BASE_GITHUB_HEADERS,
        "Authorization": `Bearer ${token}`,
        ...(withContentType ? { "Content-Type": "application/json" } : {})
    };
}

export function validateRepoName(name) {
    return typeof name === "string" && REPO_NAME_REGEX.test(name) && !name.endsWith(".");
}

export function validateGitRef(ref) {
    return typeof ref === "string" && GIT_REF_REGEX.test(ref);
}

export function validateSha(sha) {
    return typeof sha === "string" && SHA_REGEX.test(sha);
}

export function validateFilePath(path) {
    if (typeof path !== "string" || path.length < 1 || path.length > 4096) return false;
    if (path.includes("\0") || path.includes("\\") || path.startsWith("/") || path.endsWith("/") || path.includes("//") || path.includes("/./") || path.includes("/../")) return false;
    return true;
}

export function encodeGitHubPath(path) {
    // Reemplazo regex directo por segmento sin alojar arrays intermedias
    return path.replace(/[^/]+/g, encodeURIComponent);
}

export function requireAuth(context) {
    if (!context.data?.session?.github_token) {
        return jsonResponse({ error: "Sesión no válida" }, 401);
    }
    if (!context.env.GITHUB_USERNAME) {
        return jsonResponse({ error: "Servidor desconfigurado" }, 500);
    }
    return null;
}

