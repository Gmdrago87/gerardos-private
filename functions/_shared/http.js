export function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...headers
        }
    });
}

export async function readJson(request, maxBytes = 131072) {
    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error("UNSUPPORTED_MEDIA_TYPE");
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > maxBytes) {
        throw new Error("PAYLOAD_TOO_LARGE");
    }

    const text = await request.text();
    if (text.length > maxBytes) {
        throw new Error("PAYLOAD_TOO_LARGE");
    }
    if (!text.trim()) {
        throw new Error("INVALID_JSON");
    }
    return JSON.parse(text);
}

export function jsonParseErrorResponse(error) {
    if (error?.message === "UNSUPPORTED_MEDIA_TYPE") {
        return jsonResponse({ error: "Content-Type debe ser application/json" }, 415);
    }
    if (error?.message === "PAYLOAD_TOO_LARGE") {
        return jsonResponse({ error: "La petición es demasiado grande" }, 413);
    }
    return jsonResponse({ error: "JSON inválido" }, 400);
}
