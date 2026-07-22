/**
 * Repository File Handler
 * Fetches file content from repository
 * Enhanced with better error handling and content processing
 */

import { jsonResponse } from "../../../_shared/http.js";
import { getGitHubHeaders, getRepoOwner, validateRepoName, validateGitRef, validateFilePath, encodeGitHubPath } from "../../../_shared/github.js";
import { requireAuth } from "../../../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, GitHubApiError, handleError } from "../../../_shared/errors.js";

const CACHE_DURATION = 60 * 1000; // 1 minute cache
const fileCache = new Map();

/**
 * Detect file encoding based on content
 * @param {string} content - File content
 * @returns {string} Detected encoding
 */
function detectEncoding(content) {
    // Check for UTF-8 BOM
    if (content.charCodeAt(0) === 0xFEFF) {
        return 'utf-8-bom';
    }
    
    // Check for common patterns
    try {
        // If it's valid UTF-8, use it
        new TextDecoder('utf-8').decode(new TextEncoder().encode(content));
        return 'utf-8';
    } catch (e) {
        return 'base64';
    }
}

/**
 * Process file content based on file type
 * @param {string} content - Raw content
 * @param {string} path - File path
 * @returns {Object} Processed content
 */
function processContent(content, path) {
    const extension = path.includes('.') ? path.split('.').pop().toLowerCase() : '';
    
    const binaryExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'pdf', 'zip', 'tar', 'gz'];
    const isBinary = binaryExtensions.includes(extension);
    
    if (isBinary) {
        return {
            content: content,
            encoding: 'base64',
            isBinary: true,
            type: extension
        };
    }
    
    return {
        content: content,
        encoding: 'utf-8',
        isBinary: false,
        type: extension || 'text'
    };
}

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        const { params, request } = context;
        const repoName = params.name;
        const url = new URL(request.url);
        const branch = url.searchParams.get('branch') || 'main';
        const filePath = url.searchParams.get('path');
        
        if (!validateRepoName(repoName)) {
            throw new ValidationError('Nombre de repositorio inv\u00e1lido');
        }
        
        if (!validateGitRef(branch)) {
            throw new ValidationError('Rama inv\u00e1lida');
        }
        
        if (!filePath || !validateFilePath(filePath)) {
            throw new ValidationError('Ruta de archivo inv\u00e1lida');
        }
        
        const cacheKey = `file_${repoName}_${branch}_${filePath}`;
        
        // Check cache
        const cached = fileCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            return jsonResponse({
                ...cached.data,
                cached: true
            });
        }
        
        const owner = getRepoOwner(context);
        const headers = getGitHubHeaders(context);
        headers['Accept'] = 'application/vnd.github.v3.raw';
        
        // Build the API URL
        const apiUrl = `https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(branch)}`;
        
        const res = await fetch(apiUrl, {
            headers
        });
        
        if (!res.ok) {
            if (res.status === 404) {
                throw new NotFoundError('Archivo no encontrado');
            }
            throw new GitHubApiError(`Error al obtener el archivo: ${res.status}`);
        }
        
        // Get content based on content type
        const contentType = res.headers.get('Content-Type');
        let content;
        let encoding = 'utf-8';
        
        if (contentType?.includes('application/json')) {
            // It's a JSON response (file metadata)
            const fileInfo = await res.json();
            if (fileInfo.encoding === 'base64') {
                content = atob(fileInfo.content);
                encoding = 'utf-8';
            } else {
                content = fileInfo.content || '';
            }
        } else {
            // It's raw content
            content = await res.text();
        }
        
        // Process content
        const processed = processContent(content, filePath);
        
        const result = {
            repo: repoName,
            branch,
            path: filePath,
            content: processed.content,
            encoding: processed.encoding,
            isBinary: processed.isBinary,
            type: processed.type
        };
        
        // Cache the result
        fileCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
        
        return jsonResponse({
            ...result,
            cached: false
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
