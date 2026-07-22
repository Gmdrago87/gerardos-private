export async function onRequestPost(context) {
    const { env, request } = context;
    
    // Check if AI binding exists
    if (!env.AI) {
        return new Response(JSON.stringify({ 
            error: "La Inteligencia Artificial no está activada. Debes ir al panel de Cloudflare > Pages > Ajustes > Functions > Enlaces de AI, y añadir una variable llamada 'AI'." 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { code, action } = body;
        
        if (!code || !action) {
            return new Response(JSON.stringify({ error: "Faltan parámetros (code, action)" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        let systemPrompt = "Eres un asistente experto en programación (GerardOS AI). Tu objetivo es ayudar al usuario de forma muy concisa y clara. Responde en español.";
        let userPrompt = "";
        
        if (action === "explain") {
            userPrompt = `Explícame de forma breve y clara qué hace este código:\n\n\`\`\`\n${code}\n\`\`\``;
        } else if (action === "refactor") {
            userPrompt = `Refactoriza este código para que sea más limpio y eficiente. Devuelve solo el código mejorado y una pequeñísima explicación:\n\n\`\`\`\n${code}\n\`\`\``;
        } else if (action === "find_bugs") {
            userPrompt = `Encuentra posibles bugs o errores de seguridad en este código:\n\n\`\`\`\n${code}\n\`\`\``;
        } else if (action === "comment") {
            userPrompt = `Añade comentarios profesionales (JSDoc o similar) a este código para documentarlo bien:\n\n\`\`\`\n${code}\n\`\`\``;
        } else {
            userPrompt = action + `\n\n\`\`\`\n${code}\n\`\`\``;
        }

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        // Usamos Llama 3 8B Instruct (es rápido y excelente para código)
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages
        });

        return new Response(JSON.stringify({ result: response.response }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: "Error en la IA: " + e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
