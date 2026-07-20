import { encodeGitHubPath, getGitHubHeaders, requireAuth, validateFilePath, validateGitRef, validateRepoName, validateSha } from '../../../_shared/github.js';
import { jsonParseErrorResponse, jsonResponse, readJson } from '../../../_shared/http.js';

function uint8ToBase64(bytes) {
    const len = bytes.byteLength;
    let binary = "";
    const CHUNK_SIZE = 0x8000;
    for (let i = 0; i < len; i += CHUNK_SIZE) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
    }
    return btoa(binary);
}

function base64ToUint8(base64Str) {
    const cleanStr = base64Str.replace(/\s/g, "");
    const binary = atob(cleanStr);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export async function onRequestGet(context) {
    const { env, params, request } = context;
    const repoName = params.name;
    
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
        const safePath = encodeGitHubPath(path);
        const fetchUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_USERNAME)}/${encodeURIComponent(repoName)}/contents/${safePath}?ref=${encodeURIComponent(branch)}`;
        
        const res = await fetch(fetchUrl, { headers });
        if (!res.ok) {
            return jsonResponse({ error: "No se pudo obtener el archivo" }, res.status);
        }
        
        const data = await res.json();
        
        if (data.encoding === "base64") {
            const bytes = base64ToUint8(data.content);
            const fileContent = new TextDecoder().decode(bytes);
            
            return new Response(fileContent, {
                status: 200,
                headers: { 
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff"
                }
            });
        }
        
        return new Response("Archivo binario o muy grande.", {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
        });
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
            return jsonResponse({ error: "Faltan parámetros requeridos (path, message, content)" }, 400);
        }
        
        const targetBranch = branch || "main";
        if (!validateFilePath(path) || !validateGitRef(targetBranch)) {
            return jsonResponse({ error: "Ruta de archivo o rama inválida" }, 400);
        }
        
        const headers = getGitHubHeaders(context, true);
        const utf8Bytes = new TextEncoder().encode(content);
        const base64Content = uint8ToBase64(utf8Bytes);
        
        const requestBody = {
            message,
            content: base64Content,
            branch: targetBranch
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
            return jsonResponse({ error: data.message || "Error al guardar el archivo" }, res.status);
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
            return jsonResponse({ error: "Faltan parámetros requeridos (path, message, sha)" }, 400);
        }
        
        const targetBranch = branch || "main";
        if (!validateFilePath(path) || !validateGitRef(targetBranch) || !validateSha(sha)) {
            return jsonResponse({ error: "Ruta de archivo, rama o SHA inválidos" }, 400);
        }
        
        const headers = getGitHubHeaders(context, true);
        
        const requestBody = {
            message,
            sha,
            branch: targetBranch
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
            return jsonResponse({ error: data.message || "Error al eliminar el archivo" }, res.status);
        }
        
        return jsonResponse({ ok: true, commit: data.commit });
    } catch (e) {
        if (["UNSUPPORTED_MEDIA_TYPE", "PAYLOAD_TOO_LARGE", "INVALID_JSON"].includes(e?.message)) return jsonParseErrorResponse(e);
        return jsonResponse({ error: "Error interno al procesar la petición de eliminación" }, 500);
    }
}

