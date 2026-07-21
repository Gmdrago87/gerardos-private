/**
 * HTTP utilities for Cloudflare Workers
 */

/**
 * Create a JSON response
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code
 * @param {Object} headers - Additional headers
 * @returns {Response} JSON response
 */
export function jsonResponse(data, status = 200, headers = {}) {
    const body = JSON.stringify(data, null, 2);
    
    return new Response(body, {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...headers
        }
    });
}

/**
 * Create a text response
 * @param {string} text - Response text
 * @param {number} status - HTTP status code
 * @param {Object} headers - Additional headers
 * @returns {Response} Text response
 */
export function textResponse(text, status = 200, headers = {}) {
    return new Response(text, {
        status,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            ...headers
        }
    });
}

/**
 * Create a redirect response
 * @param {string} url - Redirect URL
 * @param {number} status - HTTP status code (301, 302, 307, 308)
 * @returns {Response} Redirect response
 */
export function redirectResponse(url, status = 302) {
    return new Response(null, {
        status,
        headers: {
            'Location': url
        }
    });
}

/**
 * Create an HTML response
 * @param {string} html - HTML content
 * @param {number} status - HTTP status code
 * @param {Object} headers - Additional headers
 * @returns {Response} HTML response
 */
export function htmlResponse(html, status = 200, headers = {}) {
    return new Response(html, {
        status,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...headers
        }
    });
}

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {string} code - Error code
 * @returns {Response} Error response
 */
export function errorResponse(message, status = 500, code = 'ERROR') {
    return jsonResponse({
        error: message,
        code,
        timestamp: new Date().toISOString()
    }, status);
}

/**
 * Create a success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code
 * @returns {Response} Success response
 */
export function successResponse(data = {}, message = 'Success', status = 200) {
    return jsonResponse({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    }, status);
}

/**
 * Create a paginated response
 * @param {Array} data - Response data
 * @param {Object} pagination - Pagination info
 * @param {number} status - HTTP status code
 * @returns {Response} Paginated response
 */
export function paginatedResponse(data, pagination, status = 200) {
    return jsonResponse({
        success: true,
        data,
        pagination: {
            page: pagination.page || 1,
            perPage: pagination.perPage || 30,
            total: pagination.total || data.length,
            totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.perPage || 30))
        }
    }, status);
}

/**
 * Add CORS headers to a response
 * @param {Response} response - Original response
 * @param {Object} options - CORS options
 * @returns {Response} Response with CORS headers
 */
export function withCORS(response, options = {}) {
    const { origin = '*', methods = 'GET, POST, PUT, PATCH, DELETE, OPTIONS', headers = '*' } = options;
    
    const newResponse = new Response(response.body, response);
    
    newResponse.headers.set('Access-Control-Allow-Origin', origin);
    newResponse.headers.set('Access-Control-Allow-Methods', methods);
    newResponse.headers.set('Access-Control-Allow-Headers', headers);
    newResponse.headers.set('Access-Control-Max-Age', '86400');
    
    return newResponse;
}

/**
 * Handle OPTIONS request for CORS preflight
 * @param {Request} request - Incoming request
 * @returns {Response} OPTIONS response
 */
export function handleOptions(request) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400'
        }
    });
}
