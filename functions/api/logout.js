export async function onRequestPost(context) {
    // Eliminar la cookie de sesión estableciendo su Max-Age en 0
    const cookieString = "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
    
    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie": cookieString
        }
    });
}
