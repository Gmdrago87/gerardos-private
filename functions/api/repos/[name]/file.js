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

    if (path.includes("..") || path.includes("\0")) {
        return new Response(JSON.stringify({ error: "Ruta de archivo inválida" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    if (!context.data.session.github_token || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    const headers = {
        "Authorization": `Bearer ${context.data.session.github_token}`,
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

export async function onRequestPut(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!context.data.session.github_token || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    try {
        const body = await request.json();
        const { path, message, content, branch, sha } = body;
        
        if (!path || !message || content === undefined) {
            return new Response(JSON.stringify({ error: "Faltan parámetros requeridos (path, message, content)" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        if (path.includes("..") || path.includes("\0")) {
            return new Response(JSON.stringify({ error: "Ruta de archivo inválida" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const headers = {
            "Authorization": `Bearer ${context.data.session.github_token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GerardOS-Private-Dashboard"
        };
        
        // Encode content to base64 properly handling UTF-8
        const utf8Bytes = new TextEncoder().encode(content);
        let binaryString = "";
        for (let i = 0; i < utf8Bytes.length; i++) {
            binaryString += String.fromCharCode(utf8Bytes[i]);
        }
        const base64Content = btoa(binaryString);
        
        const requestBody = {
            message: message,
            content: base64Content,
            branch: branch || "main"
        };
        
        if (sha) {
            requestBody.sha = sha;
        }
        
        const safePath = path.split("/").map(p => encodeURIComponent(p)).join("/");
        const putUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/contents/${safePath}`;
        
        const res = await fetch(putUrl, {
            method: "PUT",
            headers,
            body: JSON.stringify(requestBody)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            return new Response(JSON.stringify({ error: data.message || "Error al guardar el archivo" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        return new Response(JSON.stringify({ ok: true, commit: data.commit, content: data.content }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error interno al procesar la petición de guardado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestDelete(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    if (!context.data.session.github_token || !env.GITHUB_USERNAME) {
        return new Response(JSON.stringify({ error: "Servidor desconfigurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    try {
        const body = await request.json();
        const { path, message, branch, sha } = body;
        
        if (!path || !message || !sha) {
            return new Response(JSON.stringify({ error: "Faltan parámetros requeridos (path, message, sha)" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        if (path.includes("..") || path.includes("\0")) {
            return new Response(JSON.stringify({ error: "Ruta de archivo inválida" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const headers = {
            "Authorization": `Bearer ${context.data.session.github_token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GerardOS-Private-Dashboard"
        };
        
        const requestBody = {
            message: message,
            sha: sha,
            branch: branch || "main"
        };
        
        const safePath = path.split("/").map(p => encodeURIComponent(p)).join("/");
        const deleteUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repoName}/contents/${safePath}`;
        
        const res = await fetch(deleteUrl, {
            method: "DELETE",
            headers,
            body: JSON.stringify(requestBody)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            return new Response(JSON.stringify({ error: data.message || "Error al eliminar el archivo" }), {
                status: res.status,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        return new Response(JSON.stringify({ ok: true, commit: data.commit }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Error interno al procesar la petición de eliminación" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
