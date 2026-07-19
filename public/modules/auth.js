export async function checkSession() {
    try {
        const res = await fetch("/api/session", { credentials: "include" });
        if (!res.ok) return { authenticated: false };
        return await res.json();
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
            location.reload();
        }
    } catch (e) {
        console.error("Error al cerrar sesión:", e);
    }
}
