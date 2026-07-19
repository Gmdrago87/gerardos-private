export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    console.log(`[API] OAuth Login solicitado desde ${url.pathname}`);

    if (!env.GITHUB_CLIENT_ID) {
        console.error("[API] Error: Falta GITHUB_CLIENT_ID en la configuración.");
        return new Response("Falta GITHUB_CLIENT_ID en la configuración.", { status: 500 });
    }

    const scope = "repo workflow";
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=${encodeURIComponent(scope)}`;

    console.log(`[API] Redirigiendo a GitHub Auth: ${githubAuthUrl.substring(0, 50)}...`);
    return Response.redirect(githubAuthUrl, 302);
}
