/**
 * AI Handler
 * Placeholder for AI integration
 * Enhanced with better structure for future implementation
 */

import { jsonResponse } from "../_shared/http.js";
import { requireAuth } from "../_shared/github.js";
import { AuthError, ValidationError, NotFoundError, handleError } from "../_shared/errors.js";

export async function onRequestPost(context) {
    try {
        requireAuth(context);
        
        const { request } = context;
        const body = await request.json();
        
        const { prompt, action, repoName, filePath, branch } = body;
        
        if (!prompt || typeof prompt !== 'string') {
            throw new ValidationError('El prompt es obligatorio y debe ser una cadena de texto');
        }
        
        if (prompt.length > 10000) {
            throw new ValidationError('El prompt es demasiado largo (m\u00e1ximo 10000 caracteres)');
        }
        
        // Check if AI is configured
        const aiConfigured = context.env.AI_PROVIDER && context.env.AI_API_KEY;
        
        if (!aiConfigured) {
            return jsonResponse({
                success: false,
                error: 'AI no configurada',
                message: 'El proveedor de IA no est\u00e1 configurado. Configura AI_PROVIDER y AI_API_KEY en las variables de entorno.',
                configured: false
            }, 400);
        }
        
        // For now, return a placeholder response
        // In the future, this will integrate with actual AI providers
        return jsonResponse({
            success: true,
            message: 'AI integration placeholder',
            response: 'Esta funcionalidad est\u00e1 en desarrollo. Configura un proveedor de IA para habilitarla.',
            configured: true,
            provider: context.env.AI_PROVIDER || null
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        // Return AI configuration status
        return jsonResponse({
            configured: !!(context.env.AI_PROVIDER && context.env.AI_API_KEY),
            provider: context.env.AI_PROVIDER || null,
            features: {
                codeAnalysis: true,
                documentation: true,
                suggestions: true,
                chat: false
            }
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
