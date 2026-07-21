import { setCachedReposData, getCachedReposData } from './state.js';

export async function getCachedDataAsync() {
    try {
        const idbData = await getCachedReposData();
        if (idbData && idbData.timestamp && (Date.now() - idbData.timestamp < CACHE_DURATION)) {
            return { user: idbData.user, repos: idbData.repos };
        }
    } catch (e) {
        console.warn('Error leyendo de IndexedDB:', e);
    }
    return getCachedData();
}

export function getCachedData() {
    try {
        const timestamp = localStorage.getItem(CACHE_KEY_TIME);
        const user = localStorage.getItem(CACHE_KEY_USER);
        const repos = localStorage.getItem(CACHE_KEY_REPOS);
        if (!timestamp || !user || !repos) return null;
        const now = Date.now();
        if (now - parseInt(timestamp) < CACHE_DURATION) {
            return { user: JSON.parse(user), repos: JSON.parse(repos) };
        }
    } catch (e) {
        clearCache();
    }
    return null;
}

export function saveToCache(user, repos) {
    try {
        localStorage.setItem(CACHE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(CACHE_KEY_REPOS, JSON.stringify(repos));
        localStorage.setItem(CACHE_KEY_TIME, Date.now().toString());
        setCachedReposData(user, repos);
    } catch (e) {
        console.warn('Storage lleno', e);
        setCachedReposData(user, repos);
    }
}

export function getExpiredCache() {
    try {
        const user = localStorage.getItem(CACHE_KEY_USER);
        const repos = localStorage.getItem(CACHE_KEY_REPOS);
        if (user && repos) {
            return { user: JSON.parse(user), repos: JSON.parse(repos) };
        }
    } catch (e) {
        clearCache();
    }
    return null;
}

export function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY_USER);
        localStorage.removeItem(CACHE_KEY_REPOS);
        localStorage.removeItem(CACHE_KEY_TIME);
    } catch (e) {
        console.warn('Error al limpiar caché:', e);
    }
}

// Llama a nuestro backend en Cloudflare Pages
export async function fetchApiData() {
    const res = await fetch("/api/repos", { credentials: "include" });
    if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
    }
    if (!res.ok) {
        throw new Error("Error API");
    }
    return await res.json(); // Devuelve { user, repos }
}

export async function fetchFallbackData() {
    // Si la API falla, intentamos usar una base de datos local estática
    const res = await fetch('./database.json');
    if (!res.ok) throw new Error('No local database');
    const data = await res.json();
    return { user: data.user, repos: data.repos };
}

function repoPath(repoName) {
    return encodeURIComponent(repoName);
}

export async function fetchRepoTree(repoName, branch) {
    const url = `/api/repos/${repoPath(repoName)}/tree?branch=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error('Error tree API');
    return res.json();
}

export async function fetchFileContent(repoName, branch, path) {
    const url = `/api/repos/${repoPath(repoName)}/file?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error('Error file API');
    return res.text(); // El backend ya lo decodifica y devuelve como texto
}

export async function createRepo(name, description, isPrivate) {
    const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isPrivate }),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo crear el repositorio");
    }
    return res.json();
}

export async function deleteRepo(name, confirm) {
    const res = await fetch(`/api/repos/${repoPath(name)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo eliminar el repositorio");
    }
    return res.json();
}

export async function updateRepoVisibility(name, isPrivate) {
    const res = await fetch(`/api/repos/${repoPath(name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ private: isPrivate }),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo actualizar la visibilidad del repositorio");
    }
    return res.json();
}


export async function fetchCommits(repoName, branch, page = 1) {
    const url = `/api/repos/${repoPath(repoName)}/commits?branch=${encodeURIComponent(branch)}&page=${page}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error('Error commits API');
    return res.json();
}

export async function fetchBranches(repoName) {
    const url = `/api/repos/${repoPath(repoName)}/branches`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error('Error branches API');
    return res.json();
}

export async function saveFileContent(repoName, branch, path, content, message, sha) {
    const res = await fetch(`/api/repos/${repoPath(repoName)}/file`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, branch, content, message, sha }),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo guardar el archivo");
    }
    return res.json();
}

export async function deleteFile(repoName, branch, path, message, sha) {
    const res = await fetch(`/api/repos/${repoPath(repoName)}/file`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, branch, message, sha }),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo eliminar el archivo");
    }
    return res.json();
}

// Kanban (Issues) Endpoints
export async function fetchIssues(repoName) {
    const url = `/api/repos/${repoPath(repoName)}/issues`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error('Error al obtener issues');
    return res.json();
}

export async function createIssue(repoName, title, body, labels) {
    const res = await fetch(`/api/repos/${repoPath(repoName)}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, labels }),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo crear la tarea");
    }
    return res.json();
}

export async function updateIssue(repoName, issueNumber, state, labels) {
    const res = await fetch(`/api/repos/${repoPath(repoName)}/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_number: issueNumber, state, labels }),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo actualizar la tarea");
    }
    return res.json();
}

// Actions (Workflows) Endpoint
export async function fetchActions(repoName) {
    const url = `/api/repos/${repoPath(repoName)}/actions`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error('Error al obtener actions');
    return res.json();
}
