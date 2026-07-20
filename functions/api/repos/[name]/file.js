import { encodeGitHubPath, getGitHubHeaders, requireAuth, validateFilePath, validateGitRef, validateRepoName, validateSha } from '../../../_shared/github.js';
import { jsonParseErrorResponse, jsonResponse, readJson } from '../../../_shared/http.js';

export async function onRequestGet(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    // Obtener parámetros de la url
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    const branch = url.searchParams.get("branch") || "main";
    
    if (!path) {
        return jsonResponse({ error: "Falta el parámetro 'path'" }, 400);
    }

    if (!validateFilePath(path) || !validateGitRef(branch)) {
        return jsonResponse({ error: "Ruta de archivo o rama inválida" }, 400);
    }
    
    const authError = requireAuth(context);
    if (authError) return authError;
    
    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }
    
    const headers = getGitHubHeaders(context);
    
    try {
        // Escapar adecuadamente la ruta del archivo
        const safePath = encodeGitHubPath(path);
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/contents/${safePath}?ref=${encodeURIComponent(branch)}`;
        
        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
            return jsonResponse({ error: "No se pudo obtener el archivo" }, res.status);
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
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff"
                }
            });
        } else {
            return new Response("Archivo binario o muy grande.", {
                status: 200,
                headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
            });
        }
    } catch (e) {
        return jsonResponse({ error: "Error al leer el archivo en el servidor" }, 500);
    }
}

export async function onRequestPut(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    const authError = requireAuth(context);
    if (authError) return authError;
    
    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }
    
    try {
        const body = await readJson(request);
        const { path, message, content, branch, sha } = body;
        
        if (!path || !message || content === undefined) {
            return new Response(JSON.stringify({ error: "Faltan parámetros requeridos (path, message, content)" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        if (!validateFilePath(path) || !validateGitRef(branch || "main")) {
            return jsonResponse({ error: "Ruta de archivo o rama inválida" }, 400);
        }
        
        const headers = getGitHubHeaders(context);
        
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
            if (!validateSha(sha)) return jsonResponse({ error: "SHA inválido" }, 400);
            requestBody.sha = sha;
        }
        
        const safePath = encodeGitHubPath(path);
        const putUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/contents/${safePath}`;
        
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
        
        return jsonResponse({ ok: true, commit: data.commit, content: data.content });
    } catch (e) {
        if (["UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "INVALID_JSON"].includes(e?.message)) return jsonParseErrorResponse(e);
        return jsonResponse({ error: "Error interno al procesar la petición de guardado" }, 500);
    }
}

export async function onRequestDelete(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
    const authError = requireAuth(context);
    if (authError) return authError;
    
    if (!validateRepoName(repoName)) {
        return jsonResponse({ error: "Nombre de repositorio inválido" }, 400);
    }
    
    try {
        const body = await readJson(request);
        const { path, message, branch, sha } = body;
        
        if (!path || !message || !sha) {
            return new Response(JSON.stringify({ error: "Faltan parámetros requeridos (path, message, sha)" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        if (!validateFilePath(path) || !validateGitRef(branch || "main") || !validateSha(sha)) {
            return jsonResponse({ error: "Ruta de archivo, rama o SHA inválidos" }, 400);
        }
        
        const headers = getGitHubHeaders(context);
        
        const requestBody = {
            message: message,
            sha: sha,
            branch: branch || "main"
        };
        
        const safePath = encodeGitHubPath(path);
        const deleteUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/contents/${safePath}`;
        
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
        
        return jsonResponse({ ok: true, commit: data.commit });
    } catch (e) {
        if (["UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "INVALID_JSON"].includes(e?.message)) return jsonParseErrorResponse(e);
        return jsonResponse({ error: "Error interno al procesar la petición de eliminación" }, 500);
    }
}
