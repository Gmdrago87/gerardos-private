import { jsonResponse } from './http.js';

const REPO_NAME_REGEX = /^(?!\.)(?!.*\.git$)[A-Za-z0-9._-]{1,100}$/;
const GIT_REF_REGEX = /^(?!\/)(?!.*\.\.)(?!.*@\{)(?!.*\\)(?!.*\/\/)(?!.*\.$)[A-Za-z0-9._\/-]{1,255}$/;
const SHA_REGEX = /^[a-f0-9]{40}$/i;

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
    if (path.includes("\0") || path.includes("\\") || path.startsWith("/") || path.endsWith("/")) return false;
    const segments = path.split("/");
    return segments.every(segment => segment && segment !== "." && segment !== ".." && !segment.includes("\0"));
}

export function encodeGitHubPath(path) {
    return path.split("/").map(segment => encodeURIComponent(segment)).join("/");
}

export function requireAuth(context) {
    if (!context.data.session || !context.data.session.github_token) {
        return jsonResponse({ error: "Sesión no válida" }, 401);
    }
    if (!context.env.GITHUB_USERNAME) {
        return jsonResponse({ error: "Servidor desconfigurado" }, 500);
    }
    return null;
}
