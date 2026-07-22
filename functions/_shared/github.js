import { jsonResponse } from './http.js';

const REPO_NAME_REGEX = /^(?!\.)(?!.*\.git$)[A-Za-z0-9._-]{1,100}$/;
const GIT_REF_REGEX = /^(?!\/)(?!.*\.\.)(?!.*@\{)(?!.*\\)(?!.*\/\/)(?!.*\.$)[A-Za-z0-9._\/-]{1,255}$/;
const SHA_REGEX = /^[a-f0-9]{40}$/i;

const BASE_GITHUB_HEADERS = Object.freeze({
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
});

export function getGitHubHeaders(context, withContentType = false) {
    const token = context.data.session.github_token;
    const user = context.data.session.sub || "unknown";
    return {
        ...BASE_GITHUB_HEADERS,
        "Authorization": `Bearer ${token}`,
        "User-Agent": `GerardOS-Private-Dashboard/${user}`,
        ...(withContentType ? { "Content-Type": "application/json" } : {})
    };
}

import { verifyJwt } from './jwt.js';

const RESERVED_REPO_NAMES = new Set([
    "www", "api", "github", "user", "organization", "repo", "repos",
    "gist", "gists", "pages", "actions", "codespaces", "packages",
    "settings", "new", "edit", "delete", "admin", "owner", "site"
]);

const FORBIDDEN_GIT_REFS = new Set([
    "HEAD", "ORIG_HEAD", "FETCH_HEAD", "MERGE_HEAD", "CHERRY_PICK_HEAD",
    "REBASE_HEAD", "REVERT_HEAD", "SQUASH_MSG", "MERGE_MSG", "MERGE_MODE"
]);

export function validateRepoName(name) {
    if (typeof name !== "string" || !REPO_NAME_REGEX.test(name) || name.endsWith(".")) {
        return false;
    }
    if (RESERVED_REPO_NAMES.has(name.toLowerCase())) {
        return false;
    }
    return true;
}

export function validateGitRef(ref) {
    if (typeof ref !== "string" || !GIT_REF_REGEX.test(ref)) {
        return false;
    }
    if (FORBIDDEN_GIT_REFS.has(ref.toUpperCase())) {
        return false;
    }
    if (ref.startsWith("refs/") || ref.includes("@{")) {
        return false;
    }
    return true;
}

export function validateSha(sha) {
    return typeof sha === "string" && SHA_REGEX.test(sha);
}

export function validateFilePath(path) {
    if (typeof path !== "string" || path.length < 1 || path.length > 4096) return false;
    
    try {
        path = decodeURIComponent(path);
    } catch (e) {
        return false;
    }

    if (
        path.includes("\0") ||
        path.includes("\\") ||
        path.startsWith("/") ||
        path.endsWith("/") ||
        path.includes("//") ||
        path.includes("/./") ||
        path.includes("/../") ||
        path.includes("../") ||
        path.includes(".../") ||
        path.includes("~") ||
        path.includes("*") ||
        path.includes("?") ||
        path.includes("|") ||
        path.includes("<") ||
        path.includes(">") ||
        path.includes("$") ||
        path.includes("{") ||
        path.includes("}") ||
        path.includes(";") ||
        path.includes("`")
    ) {
        return false;
    }

    const segments = path.split("/");
    for (const segment of segments) {
        if (
            segment === "." ||
            segment === ".." ||
            segment === "" ||
            (segment.startsWith(".") && segment.length > 1)
        ) {
            return false;
        }
    }

    return true;
}

export function encodeGitHubPath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
}

export function getRepoOwner(context) {
    const session = context.data?.session;
    if (session?.sub) return session.sub;
    
    const envUser = context.env.GITHUB_USERNAME;
    if (typeof envUser === "string" && envUser.trim() !== "") {
        return envUser.split(",")[0]?.trim() || "Gmdrago87";
    }
    
    return "Gmdrago87";
}

export function isAllowedUser(username, env) {
    if (typeof username !== "string" || !username) return false;
    
    const allowedUsers = env.GITHUB_USERNAME;
    if (typeof allowedUsers !== "string" || allowedUsers.trim() === "") {
        return false;
    }
    
    const allowed = allowedUsers.split(",").map(u => u.trim().toLowerCase());
    return allowed.includes(username.toLowerCase());
}

export async function requireAuth(context) {
    const session = context.data?.session;
    if (!session?.github_token) {
        return jsonResponse({ error: "Sesión no válida" }, 401);
    }
    
    // El token JWT de la cookie ya fue verificado por _middleware.js
    // por lo que context.data.session ya es seguro de usar aquí.
    
    return null;
}


