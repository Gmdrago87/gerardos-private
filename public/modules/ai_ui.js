import { escapeHtml } from './utils.js';

export function initAI() {
    const aiModal = document.getElementById('ai-modal');
    const aiInput = document.getElementById('ai-input');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiMessages = document.getElementById('ai-messages');
    const dockAi = document.getElementById('dock-ai');
    const aiCloseBtn = document.getElementById('ai-close-btn');

    if (dockAi) {
        dockAi.addEventListener('click', () => {
            aiModal.classList.remove('hidden');
            aiInput.focus();
        });
    }

    if (aiCloseBtn) {
        aiCloseBtn.addEventListener('click', () => {
            aiModal.classList.add('hidden');
        });
    }

    if (aiSendBtn && aiInput) {
        const handleSend = () => {
            const prompt = aiInput.value.trim();
            if (!prompt) return;
            aiInput.value = '';
            sendAIMessage(prompt, 'custom');
        };

        aiSendBtn.addEventListener('click', handleSend);
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
    }

    // Configurar botones de acción rápida
    document.querySelectorAll('.ai-quick-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const code = getActiveCodeSnippet();
            if (!code) {
                appendChatMessage('system', 'Por favor, abre un archivo en el explorador de código para aplicar esta acción.');
                return;
            }
            sendAIMessage(code, action);
        });
    });
}

function getActiveCodeSnippet() {
    const codeElement = document.querySelector('#viewer-code-content code') || document.querySelector('.file-viewer-body pre');
    return codeElement ? codeElement.textContent : '';
}

export async function sendAIMessage(codeOrPrompt, action = 'custom') {
    appendChatMessage('user', action === 'custom' ? codeOrPrompt : `Acción enviada: [${action}]`);
    
    const loadingId = appendChatMessage('ai', '<span class="loading-dots">GerardOS AI está pensando...</span>', true);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codeOrPrompt, action })
        });

        const data = await res.json();
        removeChatMessage(loadingId);

        if (!res.ok || data.error) {
            appendChatMessage('ai', `⚠️ Error: ${escapeHtml(data.error || 'No se pudo obtener respuesta de la IA')}`);
            return;
        }

        const formatted = formatMarkdown(data.result);
        appendChatMessage('ai', formatted);
    } catch (e) {
        removeChatMessage(loadingId);
        appendChatMessage('ai', `⚠️ Error de conexión: ${escapeHtml(e.message)}`);
    }
}

function appendChatMessage(sender, content, isLoading = false) {
    const messagesContainer = document.getElementById('ai-messages');
    if (!messagesContainer) return null;

    const msgId = 'msg-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.id = msgId;
    msgDiv.className = `ai-chat-msg ai-chat-msg--${sender}`;

    const icon = sender === 'user' ? 'user' : (sender === 'system' ? 'info' : 'bot');
    
    msgDiv.innerHTML = `
        <div class="ai-msg-avatar ai-msg-avatar--${sender}">
            <i data-lucide="${icon}"></i>
        </div>
        <div class="ai-msg-bubble">
            ${isLoading ? content : (sender === 'user' ? escapeHtml(content) : content)}
        </div>
    `;

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (window.lucide) window.lucide.createIcons();

    return msgId;
}

function removeChatMessage(msgId) {
    const elem = document.getElementById(msgId);
    if (elem) elem.remove();
}

function formatMarkdown(text) {
    if (!text) return '';
    
    // Primero desinfectamos todo el HTML
    let safe = escapeHtml(text);

    // Formatear bloques de código ```
    safe = safe.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="ai-code-block"><code>${code}</code></pre>`;
    });

    // Formatear código en línea `
    safe = safe.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

    // Negritas **texto**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Listas con guion
    safe = safe.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
    safe = safe.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Saltos de línea
    safe = safe.replace(/\n/g, '<br>');

    return safe;
}
