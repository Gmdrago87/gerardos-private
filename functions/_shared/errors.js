/**
 * Centralized error handling for the API
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
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Authentication error
 */
export class AuthError extends ApiError {
    constructor(message = 'No autorizado', details = {}) {
        super(message, 401, details, 'AUTH_ERROR');
    }
}

/**
 * Validation error
 */
export class ValidationError extends ApiError {
    constructor(message = 'Datos inválidos', details = {}) {
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
 * Handle errors and return appropriate response
 * @param {Error} error - The error to handle
 * @param {Object} context - The request context
 * @returns {Response} The error response
 */
export function handleError(error, context) {
    // Log the error
    console.error('Error:', {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
    });

    // Handle known error types
    if (error instanceof ApiError) {
        return jsonResponse({
            error: error.message,
            code: error.code,
            ...error.details
        }, error.statusCode);
    }

    // Handle JWT errors
    if (error.message.includes('JWT') || error.message.includes('token')) {
        return jsonResponse({
            error: 'Sesión inválida o expirada',
            code: 'INVALID_SESSION'
        }, 401);
    }

    // Handle GitHub API errors
    if (error.message.includes('GitHub') || error.message.includes('API')) {
        return jsonResponse({
            error: 'Error al comunicarse con GitHub',
            code: 'GITHUB_API_ERROR'
        }, 502);
    }

    // Default to 500
    return jsonResponse({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
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
        ...details
    }, statusCode);
}
