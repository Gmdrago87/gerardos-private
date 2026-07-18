import { ITEMS_PER_PAGE } from './utils.js';

const state = {
    allRepos: [],
    filteredRepos: [],
    currentLangFilter: 'all',
    visibleCount: ITEMS_PER_PAGE,
    currentSort: 'updated'
};

const listeners = {};

const sessionCache = {
    trees: new Map(),
    files: new Map()
};

export function getState() {
    return state;
}

export function setState(update) {
    Object.assign(state, update);
    notify('change', state);
}

export function subscribe(event, callback) {
    if (!listeners[event]) {
        listeners[event] = [];
    }
    listeners[event].push(callback);
}

function notify(event, data) {
    if (listeners[event]) {
        listeners[event].forEach(cb => cb(data));
    }
}

export function getCachedTree(key) {
    return sessionCache.trees.get(key);
}

export function setCachedTree(key, val) {
    sessionCache.trees.set(key, val);
}

export function getCachedFile(key) {
    return sessionCache.files.get(key);
}

export function setCachedFile(key, val) {
    sessionCache.files.set(key, val);
}
