export async function onRequestGet(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    // Obtener parámetros de la url
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    const branch = url.searchParams.get("branch") || "main";
    
    if (!path) {
        return new Response(JSON.stringify({ error: "Falta el parámetro 'path'" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    if (!env.GITHUB_PAT || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    const headers = {
        "Authorization": `Bearer ${env.GITHUB_PAT}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GerardOS-Private-Dashboard"
    };
    
    try {
        // Escapar adecuadamente la ruta del archivo
        const safePath = path.split("/").map(p => encodeURIComponent(p)).join("/");
        const fetchUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/contents/${safePath}?ref=${encodeURIComponent(branch)}`;
        
        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
            return new Response(JSON.stringify({ error: "No se pudo obtener el archivo" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const data = await res.json();
        
        if (data.encoding === "base64") {
            // Decodificar Base64 de forma segura para caracteres UTF-8
            const binaryString = atob(data.content.replace(/\s/g, ""));
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const fileContent = new TextDecoder().decode(bytes);
            
            return new Response(fileContent, {
                status: 200,
                headers: { 
                    "Content-Type": "text/plain; charset=utf-8",
                    // Habilitar caché ligera para el navegador (15 segundos)
                    "Cache-Control": "private, max-age=15"
                }
            });
        } else {
            return new Response("Archivo binario o muy grande.", {
                status: 200,
                headers: { "Content-Type": "text/plain" }
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error al leer el archivo en el servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
