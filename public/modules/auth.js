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

export async function login(password) {
    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password }),
            credentials: "include"
        });
        
        if (!res.ok) {
            const err = await res.json();
            return { ok: false, error: err.error || "Error al iniciar sesión" };
        }
        
        return { ok: true };
    } catch (e) {
        console.error("Error al hacer login:", e);
        return { ok: false, error: "Error de red o conexión" };
    }
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
