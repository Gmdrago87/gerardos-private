import { ITEMS_PER_PAGE } from './utils.js';

const state = {
    user: null,
    allRepos: [],
    filteredRepos: [],
    currentLangFilter: 'all',
    visibleCount: ITEMS_PER_PAGE,
    currentSort: 'updated'
};

// Zero-cost state getter (evita structuredClone profundo en hot paths)
export function getState() {
    return state;
}

export function setState(update) {
    Object.assign(state, update);
}

// Caching con IndexedDB
export async function getCachedTree(key) {
    try {
        return window.idbKeyval ? await window.idbKeyval.get(`tree_${key}`) : null;
    } catch {
        return null;
    }
}

export async function setCachedTree(key, val) {
    try {
        if (!window.idbKeyval) return;
        if (val === null) {
            await window.idbKeyval.del(`tree_${key}`);
        } else {
            await window.idbKeyval.set(`tree_${key}`, val);
        }
    } catch (e) {
        console.warn("IndexedDB error", e);
    }
}

export async function getCachedFile(key) {
    try {
        return window.idbKeyval ? await window.idbKeyval.get(`file_${key}`) : null;
    } catch {
        return null;
    }
}

export async function setCachedFile(key, val) {
    try {
        if (!window.idbKeyval) return;
        if (val === null) {
            await window.idbKeyval.del(`file_${key}`);
        } else {
            await window.idbKeyval.set(`file_${key}`, val);
        }
    } catch (e) {
        console.warn("IndexedDB error", e);
    }
}

export async function clearPrivateRepoCache() {
    try {
        if (!window.idbKeyval) return;
        const keys = await window.idbKeyval.keys();
        const targets = keys.filter(key => typeof key === "string" && (key.startsWith("file_") || key.startsWith("tree_")));
        await Promise.all(targets.map(key => window.idbKeyval.del(key)));
    } catch (e) {
        console.warn("No se pudo limpiar la caché privada", e);
    }
}

export async function getCachedReposData() {
    try {
        if (window.idbKeyval) {
            const data = await window.idbKeyval.get('app_repos_cache');
            if (data && data.user && data.repos) return data;
        }
    } catch (e) {
        console.warn("IndexedDB error leyendo repos", e);
    }
    return null;
}

export async function setCachedReposData(user, repos) {
    try {
        if (window.idbKeyval) {
            await window.idbKeyval.set('app_repos_cache', { user, repos, timestamp: Date.now() });
        }
    } catch (e) {
        console.warn("IndexedDB error guardando repos", e);
    }
}

