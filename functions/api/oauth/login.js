export async function onRequestGet(context) {
    const { env, request } = context;
    const clientId = env.GITHUB_CLIENT_ID || "Ov23liZt2GrRqM6MBcHa";
    
    if (!clientId) {
        console.error("[API] Error: Falta GITHUB_CLIENT_ID en la configuración.");
        return new Response("Falta GITHUB_CLIENT_ID en la configuración.", { status: 500 });
    }

    const state = crypto.randomUUID();
    const scope = "repo workflow delete_repo";
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scope)}&state=${state}`;

    const isProduction = env.NODE_ENV === "production";
    let cookieString = `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
    if (isProduction || request.url.startsWith("https://")) {
        cookieString += "; Secure";
    }

    return new Response(null, {
        status: 302,
        headers: {
            "Location": githubAuthUrl,
            "Set-Cookie": cookieString
        }
    });
}

