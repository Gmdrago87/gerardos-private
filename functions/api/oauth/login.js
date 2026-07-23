export async function onRequestGet(context) {
    const { env, request } = context;
    const clientId = env.GITHUB_CLIENT_ID;
    
    if (!clientId) {
        console.error("[API] Error: Falta GITHUB_CLIENT_ID en la configuración.");
        return new Response("Falta GITHUB_CLIENT_ID en la configuración.", { status: 500 });
    }

    const state = crypto.randomUUID();
    const scope = "repo workflow delete_repo";
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scope)}&state=${state}`;

    const isSecure = new URL(request.url).protocol === "https:";
    const cookieString = `oauth_state=${state}; Path=/; HttpOnly; Max-Age=600; ${isSecure ? 'SameSite=None; Secure' : 'SameSite=Lax'}`;

    // Usamos un redirect HTML en lugar de un 302 HTTP para asegurar que el navegador 
    // procese y guarde la cookie 'oauth_state' antes de navegar a GitHub (evita bugs en Safari/Brave).
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0;url=${githubAuthUrl}">
    <title>Redirigiendo a GitHub...</title>
</head>
<body>
    <p>Redirigiendo a GitHub para autenticación...</p>
    <script>window.location.href = "${githubAuthUrl}";</script>
</body>
</html>`;

    return new Response(html, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Set-Cookie": cookieString
        }
    });
}

