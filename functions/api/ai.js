/**
 * AI Handler
 * Placeholder for AI-related endpoints
 */

import { jsonResponse } from "../_shared/http.js";
import { requireAuth } from "../_shared/github.js";
import { AuthError, ValidationError, handleError } from "../_shared/errors.js";

export async function onRequestPost(context) {
    try {
        requireAuth(context);
        
        const { request } = context;
        const { prompt, action, repo, path, branch } = await request.json();
        
        if (!prompt) {
            throw new ValidationError('El prompt es obligatorio');
        }
        
        // This is a placeholder - implement actual AI integration
        // For now, return a mock response
        const mockResponse = {
            action,
            repo,
            path,
            branch,
            response: `He recibido tu solicitud: "${prompt}". Esta es una respuesta de demostración.`,
            suggestions: [
                "Revisar la documentación del proyecto",
                "Analizar el código fuente",
                "Generar un resumen de cambios"
            ]
        };
        
        return jsonResponse(mockResponse);
        
    } catch (error) {
        return handleError(error, context);
    }
}

export async function onRequestGet(context) {
    try {
        requireAuth(context);
        
        return jsonResponse({
            available: true,
            features: [
                "code_analysis",
                "documentation",
                "summarization",
                "suggestions"
            ]
        });
        
    } catch (error) {
        return handleError(error, context);
    }
}
