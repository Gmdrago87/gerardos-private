const BASE_HEADERS = Object.freeze({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
});

export function jsonResponse(data, status = 200, headers = null) {
    const responseHeaders = headers
        ? { ...BASE_HEADERS, ...headers }
        : BASE_HEADERS;

    return new Response(JSON.stringify(data), {
        status,
        headers: responseHeaders
    });
}

export async function readJson(request, maxBytes = 5242880) {
    const contentType = request.headers.get("Content-Type");
    if (!contentType || !/^application\/json(; ?charset=utf-8)?$/i.test(contentType)) {
        throw new Error("UNSUPPORTED_MEDIA_TYPE");
    }

    const contentLengthHeader = request.headers.get("Content-Length");
    if (contentLengthHeader && Number(contentLengthHeader) > maxBytes) {
        throw new Error("PAYLOAD_TOO_LARGE");
    }

    const text = await request.text();
    if (text.length > maxBytes) {
        throw new Error("PAYLOAD_TOO_LARGE");
    }
    
    if (!text || text.length === 0 || text.charCodeAt(0) <= 32 && text.trim().length === 0) {
        throw new Error("INVALID_JSON");
    }
    
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error("INVALID_JSON");
    }
}

export function jsonParseErrorResponse(error) {
    const msg = error?.message;
    if (msg === "UNSUPPORTED_MEDIA_TYPE") {
        return jsonResponse({ error: "Content-Type debe ser application/json" }, 415);
    }
    if (msg === "PAYLOAD_TOO_LARGE") {
        return jsonResponse({ error: "La petición es demasiado grande" }, 413);
    }
    return jsonResponse({ error: "JSON inválido" }, 400);
}

