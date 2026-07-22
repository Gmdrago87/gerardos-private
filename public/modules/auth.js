import { clearCache } from './api.js';
import { clearPrivateRepoCache } from './state.js';

export async function checkSession() {
    try {
        const res = await fetch("/api/session", { credentials: "include" });
        if (!res.ok) return { authenticated: false };
        const session = await res.json();
        if (!session.authenticated) {
            clearCache();
            await clearPrivateRepoCache();
        }
        return session;
    } catch (e) {
        console.error("Error al comprobar la sesión:", e);
        return { authenticated: false };
    }
}

export function login() {
    window.location.href = "/api/oauth/login";
}

export async function logout() {
    try {
        const res = await fetch("/api/logout", {
            method: "POST",
            credentials: "include"
        });
        if (res.ok) {
            clearCache();
            await clearPrivateRepoCache();
            location.reload();
        }
    } catch (e) {
        console.error("Error al cerrar sesión:", e);
    }
}
