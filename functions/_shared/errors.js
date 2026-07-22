/**
 * Centralized error handling for the API
 * Enhanced with better error classification and logging
 */

import { jsonResponse } from './http.js';

/**
 * Custom API error class
 */
export class ApiError extends Error {
    constructor(message, statusCode = 500, details = {}, code = null) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.details = details;
        this.code = code || this.constructor.name;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: this.message,
            code: this.code,
            status: this.statusCode,
            timestamp: this.timestamp,
            ...this.details
        };
    }
}

/**
 * Authentication error
 */
export class AuthError extends ApiError {
    constructor(message = 'No autorizado: sesi\u00f3n no v\u00e1lida', details = {}) {
        super(message, 401, details, 'AUTH_ERROR');
    }
}

/**
 * Validation error
 */
export class ValidationError extends ApiError {
    constructor(message = 'Datos inv\u00e1lidos', details = {}) {
        super(message, 400, details, 'VALIDATION_ERROR');
    }
}

/**
 * Not found error
 */
export class NotFoundError extends ApiError {
    constructor(message = 'Recurso no encontrado', details = {}) {
        super(message, 404, details, 'NOT_FOUND');
    }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApiError {
    constructor(message = 'Demasiadas peticiones', details = {}) {
        super(message, 429, details, 'RATE_LIMIT');
    }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends ApiError {
    constructor(message = 'Acceso denegado', details = {}) {
        super(message, 403, details, 'FORBIDDEN');
    }
}

/**
 * CSRF error
 */
export class CsrfError extends ApiError {
    constructor(message = 'Error de CSRF: token inv\u00e1lido', details = {}) {
        super(message, 403, details, 'CSRF_ERROR');
    }
}

/**
 * Server configuration error
 */
export class ServerConfigError extends ApiError {
    constructor(message = 'Servidor desconfigurado', details = {}) {
        super(message, 500, details, 'SERVER_MISCONFIGURED');
    }
}

/**
 * GitHub API error
 */
export class GitHubApiError extends ApiError {
    constructor(message = 'Error en la API de GitHub', details = {}) {
        super(message, 502, details, 'GITHUB_API_ERROR');
    }
}

/**
 * Handle errors and return appropriate response
 * @param {Error} error - The error to handle
 * @param {Object} context - The request context
 * @returns {Response} The error response
 */
export function handleError(error, context) {
    // Log the error with more context
    const errorId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    
    console.error('[' + new Date().toISOString() + '] Error:', {
        errorId,
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        path: context?.request?.url,
        method: context?.request?.method
    });

    // Handle known error types
    if (error instanceof ApiError) {
        return jsonResponse(error.toJSON(), error.statusCode);
    }

    // Handle JWT errors
    if (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('session')) {
        return jsonResponse({
            error: 'Sesi\u00f3n inv\u00e1lida o expirada',
            code: 'INVALID_SESSION',
            errorId
        }, 401);
    }

    // Handle GitHub API errors
    if (error.message.includes('GitHub') || error.message.includes('API') || error.message.includes('fetch')) {
        return jsonResponse({
            error: 'Error al comunicarse con GitHub',
            code: 'GITHUB_API_ERROR',
            errorId
        }, 502);
    }

    // Handle rate limit from GitHub
    if (error.message.includes('rate limit') || error.message.includes('403')) {
        return jsonResponse({
            error: 'L\u00edmite de peticiones a GitHub excedido',
            code: 'GITHUB_RATE_LIMIT',
            errorId
        }, 429);
    }

    // Handle validation errors
    if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        return jsonResponse({
            error: 'Datos inv\u00e1lidos',
            code: 'VALIDATION_ERROR',
            errorId
        }, 400);
    }

    // Handle not found
    if (error.message.includes('not found') || error.message.includes('404')) {
        return jsonResponse({
            error: 'Recurso no encontrado',
            code: 'NOT_FOUND',
            errorId
        }, 404);
    }

    // Default to 500
    return jsonResponse({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        errorId
    }, 500);
}

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @param {Object} details - Additional details
 * @returns {Response} The error response
 */
export function createErrorResponse(message, statusCode = 500, code = 'ERROR', details = {}) {
    return jsonResponse({
        error: message,
        code,
        timestamp: new Date().toISOString(),
        ...details
    }, statusCode);
}

/**
 * Create a success response with consistent format
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code
 * @returns {Response} Success response
 */
export function createSuccessResponse(data = {}, message = 'Success', status = 200) {
    return jsonResponse({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    }, status);
}
