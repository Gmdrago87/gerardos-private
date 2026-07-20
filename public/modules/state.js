import { ITEMS_PER_PAGE } from './utils.js';

const state = {
    allRepos: [],
    filteredRepos: [],
    currentLangFilter: 'all',
    visibleCount: ITEMS_PER_PAGE,
    currentSort: 'updated'
};

const listeners = {};

export function getState() {
    return structuredClone(state);
}

export function setState(update) {
    Object.assign(state, update);
}



// Caching con IndexedDB (usando idb-keyval que está disponible globalmente si se cargó desde CDN)
export async function getCachedTree(key) {
    try {
        if (window.idbKeyval) {
            return await window.idbKeyval.get(`tree_${key}`);
        }
    } catch(e) {
        console.warn("IndexedDB no disponible", e);
    }
    return null;
}

export async function setCachedTree(key, val) {
    try {
        if (window.idbKeyval) {
            if (val === null) {
                await window.idbKeyval.del(`tree_${key}`);
            } else {
                await window.idbKeyval.set(`tree_${key}`, val);
            }
        }
    } catch(e) {
        console.warn("IndexedDB no disponible", e);
    }
}

export async function getCachedFile(key) {
    try {
        if (window.idbKeyval) {
            return await window.idbKeyval.get(`file_${key}`);
        }
    } catch(e) {
        console.warn("IndexedDB no disponible", e);
    }
    return null;
}

export async function setCachedFile(key, val) {
    try {
        if (window.idbKeyval) {
            if (val === null) {
                await window.idbKeyval.del(`file_${key}`);
            } else {
                await window.idbKeyval.set(`file_${key}`, val);
            }
        }
    } catch(e) {
        console.warn("IndexedDB no disponible", e);
    }
}
