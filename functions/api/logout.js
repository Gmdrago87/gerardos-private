export async function onRequestPost(context) {
    const { env, request } = context;
    const isProduction = env.NODE_ENV === "production";
    const expires = "Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    let cookieString = `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${expires}`;
    let oauthStateCookie = `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${expires}`;

    if (isProduction || request.url.startsWith("https://")) {
        cookieString += "; Secure";
        oauthStateCookie += "; Secure";
    }

    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    headers.append("Set-Cookie", cookieString);
    headers.append("Set-Cookie", oauthStateCookie);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
