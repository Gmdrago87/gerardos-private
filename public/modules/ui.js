import { LANG_COLORS, FILTER_BTN_INACTIVE, FILTER_BTN_ACTIVE, FILTER_BTN_ALL_ACTIVE, escapeHtml, sanitizeUrl, highlightText } from './utils.js';
import { getState } from './state.js';
import { sendAIMessage } from './ai_ui.js';

export function animateCounter(element, target, duration = 1500) {
    if (!element) return;
    if (target === 0) {
        element.textContent = 0;
        return;
    }
    const start = performance.now();
    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        element.textContent = Math.floor(progress * target);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

export function updateLoadingStatus(message) {
    const statusElement = document.getElementById('loading-status');
    if (statusElement) statusElement.textContent = message;
}

export function hideLoading() {
    const loader = document.getElementById('loading');
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.display = 'none';
        document.getElementById('main-content').style.opacity = '1';
    }, 300);
}

export function showError(msg) {
    document.getElementById('loading').innerHTML = `
        <div class="error-screen">
            <p class="error-title">¡Ups!</p>
            <p class="error-message">${msg}</p>
            <button id="retry-btn" class="btn-retry">Reintentar</button>
        </div>
    `;
    document.getElementById('retry-btn').addEventListener('click', () => location.reload());
}

export function renderProfile(user) {
    const avatarImg = document.getElementById('avatar');
    if (avatarImg) {
        avatarImg.src = user.avatar_url || 'https://avatars.githubusercontent.com/u/232252917?v=4';
        avatarImg.alt = `${user.name || user.login || 'Gerard'} - Avatar`;
        avatarImg.onerror = () => {
            avatarImg.onerror = null; // Previene el bucle infinito si la imagen de respaldo también falla
            avatarImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238b5cf6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
        };
    }
    document.getElementById('name').textContent = user.name || 'GerardMaestre';
    document.getElementById('username').textContent = `@${user.login || 'Gmdrago87'}`;
    animateCounter(document.getElementById('followers'), user.followers || 0, 1000);
    animateCounter(document.getElementById('following'), user.following || 0, 1000);
    document.getElementById('github-link').href = user.html_url || 'https://github.com/GerardMaestre';
}

export function calculateStats(repos) {
    const totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
    const totalForks = repos.reduce((acc, repo) => acc + repo.forks_count, 0);
    const langs = repos.reduce((acc, r) => {
        if (r.language) acc[r.language] = (acc[r.language] || 0) + 1;
        return acc;
    }, {});
    const topLang = Object.keys(langs).length > 0 
        ? Object.keys(langs).reduce((a, b) => langs[a] > langs[b] ? a : b) 
        : 'N/A';
    animateCounter(document.getElementById('total-repos'), repos.length, 1200);
    animateCounter(document.getElementById('total-stars'), totalStars, 1500);
    animateCounter(document.getElementById('total-forks'), totalForks, 1500);
    document.getElementById('top-lang').textContent = topLang;
}

export function setupFilters(repos, onFilterClick) {
    const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
    const container = document.getElementById('filter-container');
    container.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = FILTER_BTN_ALL_ACTIVE;
    allBtn.dataset.filter = 'all';
    allBtn.textContent = 'Todos';
    allBtn.onclick = (e) => onFilterClick('all', e.target);
    container.appendChild(allBtn);
    languages.forEach(lang => {
        const btn = document.createElement('button');
        btn.className = FILTER_BTN_INACTIVE;
        btn.textContent = lang;
        btn.onclick = (e) => onFilterClick(lang, e.target);
        container.appendChild(btn);
    });
}

export function showDataSourceIndicator(source) {
    const displayMessages = {
        'cache': 'Caché del navegador',
        'api': 'GitHub API',
        'fallback': 'Caché expirada'
    };
    const sourceText = document.getElementById('data-source-text');
    if (sourceText) {
        sourceText.textContent = `Fuente: ${displayMessages[source] || 'GitHub API'}`;
    }
    const indicator = document.getElementById('data-source-indicator');
    if (indicator) indicator.classList.remove('hidden');
    updateCacheAgeText(source);
}

function updateCacheAgeText(source) {
    const cacheAgeText = document.getElementById('cache-age-text');
    if (!cacheAgeText) return;
    const timestamp = localStorage.getItem('gh_time_GerardMaestre');
    if (timestamp && (source === 'cache' || source === 'fallback')) {
        const cacheAge = Math.floor((Date.now() - parseInt(timestamp)) / 60000);
        const displayAge = cacheAge < 60 ? `${cacheAge} min` : `${Math.floor(cacheAge / 60)}h ${cacheAge % 60}min`;
        cacheAgeText.textContent = `· Última actualización: hace ${displayAge}`;
    } else {
        cacheAgeText.textContent = source === 'api' ? '· Recién actualizado' : '';
    }
}

export function showToast(title = 'Modo Caché', message = 'Datos almacenados localmente', type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const iconMap = { 'info': 'wifi-off', 'warning': 'alert-triangle', 'success': 'check-circle', 'error': 'x-circle' };
    const colorMap = { 'info': 'toast__icon--info', 'warning': 'toast__icon--warning', 'success': 'toast__icon--success', 'error': 'toast__icon--error' };
    const iconElement = toast.querySelector('[data-lucide]');
    if (iconElement) {
        iconElement.setAttribute('data-lucide', iconMap[type] || 'wifi-off');
        iconElement.className = colorMap[type] || 'toast__icon--info';
    }
    toast.querySelector('.toast__title').textContent = title;
    toast.querySelector('.toast__message').textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('toast--visible');
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => dismissToast(toast), 5000);
}

function dismissToast(toast) {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.classList.add('hidden'), 500);
}

function getBadgeUrl(topic) {
    const logos = {
        'react': 'react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB',
        'vue': 'vue.js-%2335495e.svg?style=flat&logo=vuedotjs&logoColor=%234FC08D',
        'angular': 'angular-%23DD0031.svg?style=flat&logo=angular&logoColor=white',
        'javascript': 'javascript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E',
        'typescript': 'typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white',
        'python': 'python-3670A0?style=flat&logo=python&logoColor=ffdd54',
        'html': 'html5-%23E34F26.svg?style=flat&logo=html5&logoColor=white',
        'css': 'css3-%231572B6.svg?style=flat&logo=css3&logoColor=white',
        'tailwind': 'tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white',
        'node': 'node.js-6DA55F?style=flat&logo=node.js&logoColor=white',
        'nextjs': 'Next-black?style=flat&logo=next.js&logoColor=white'
    };
    const safeTopic = encodeURIComponent(topic);
    return logos[topic.toLowerCase()] || `${safeTopic}-blue?style=flat&logo=github`;
}

function generateBadgesHtml(topics) {
    if (!topics || topics.length === 0) return '<div class="repo-card__badges-empty"></div>';
    const badges = topics.slice(0, 4).map(t => {
        const url = getBadgeUrl(t);
        return `<img src="https://img.shields.io/badge/${url}" alt="${escapeHtml(t)}" class="repo-card__tech-badge" loading="lazy">`;
    }).join('');
    return `<div class="repo-card__badges">${badges}</div>`;
}

export function renderRepos(repos, append = false, searchTerm = '', onCardClick, onCloneClick) {
    const grid = document.getElementById('repos-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!append) grid.innerHTML = '';
    if (repos.length === 0) {
        grid.innerHTML = `<div class="repos-grid__empty">Sin resultados encontrados</div>`;
        loadMoreBtn.classList.add('hidden');
        document.getElementById('showing-count').textContent = '';
        return;
    }
    const { visibleCount } = getState();
    const startIndex = append ? visibleCount - 9 : 0;
    const itemsToShow = repos.slice(startIndex, visibleCount);
    if (append && itemsToShow.length === 0) return;
    const fragment = document.createDocumentFragment();
    itemsToShow.forEach(repo => {
        const card = createCardElement(repo, searchTerm, onCardClick, onCloneClick);
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    updateLoadMoreUi(repos.length, visibleCount, loadMoreBtn, append);
}

function updateLoadMoreUi(total, visible, btn, append) {
    if (visible < total) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
    document.getElementById('showing-count').textContent = `Mostrando ${Math.min(visible, total)} de ${total}`;
    if (window.lucide) window.lucide.createIcons();
    if (!append) setTimeout(() => setupIntersectionObserver(), 100);
}

function createCardElement(repo, searchTerm, onCardClick, onCloneClick) {
    const card = document.createElement('div');
    card.className = 'repo-card';
    const langColor = LANG_COLORS[repo.language] || '#ffffff';
    const repoName = escapeHtml(repo.name);
    const repoDesc = escapeHtml(repo.description) || 'Sin descripción disponible.';
    const highlightedName = searchTerm ? highlightText(repoName, searchTerm) : repoName;
    const highlightedDesc = searchTerm ? highlightText(repoDesc, searchTerm) : repoDesc;
    const updateBadge = getUpdateBadgeText(repo.pushed_at);
    const webUrl = getWebUrl(repo.homepage);
    const hasWeb = webUrl !== '#';
    card.innerHTML = getCardHtml(repo, highlightedName, highlightedDesc, langColor, updateBadge, webUrl, hasWeb);
    setupCardEventListeners(card, repo, onCardClick, onCloneClick);
    return card;
}

function getUpdateBadgeText(pushedAt) {
    const days = Math.floor((Date.now() - new Date(pushedAt)) / 86400000);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    return `Hace ${Math.floor(days / 30)} meses`;
}

function getWebUrl(homepage) {
    if (!homepage || homepage.trim() === '') return '#';
    const trimmed = homepage.trim();
    return sanitizeUrl(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed);
}

function getCardHtml(repo, name, desc, langColor, updateBadge, webUrl, hasWeb) {
    const htmlUrl = sanitizeUrl(repo.html_url);
    const badgesHtml = generateBadgesHtml(repo.topics);
    const privateBadge = repo.private ? '<span class="repo-card__private-badge" title="Repositorio Privado"><i data-lucide="lock"></i> Privado</span>' : '';
    return `
        <div class="repo-card__header">
            <div class="repo-card__folder-icon">
                <i data-lucide="folder"></i>
                ${privateBadge}
            </div>
            <div class="repo-card__actions" id="actions-${repo.id}">
                ${hasWeb ? `<a href="${webUrl}" target="_blank" rel="noopener noreferrer" class="repo-card__web-link"><i data-lucide="globe"></i> WEB</a>` : ''}
                <a href="${htmlUrl}" target="_blank" rel="noopener noreferrer" class="repo-card__github-link"><i data-lucide="external-link"></i></a>
                <a href="https://vscode.dev/github/GerardMaestre/${encodeURIComponent(repo.name)}" target="_blank" rel="noopener noreferrer" class="repo-card__vscode-link"><i data-lucide="code-2"></i> VS Code</a>
                <button class="repo-card__toggle-visibility-btn" data-repo-name="${escapeHtml(repo.name).replace(/"/g, '&quot;')}" data-repo-private="${repo.private}" onclick="event.stopPropagation(); window.toggleRepoVisibilityGlobal(this.getAttribute('data-repo-name'), this.getAttribute('data-repo-private') === 'true')" title="${repo.private ? 'Hacer Público' : 'Hacer Privado'}"><i data-lucide="${repo.private ? 'unlock' : 'lock'}"></i></button>
                <button class="repo-card__delete-btn" data-repo-name="${escapeHtml(repo.name).replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); window.deleteRepoGlobal(this.getAttribute('data-repo-name'))" title="Eliminar Repositorio"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        ${badgesHtml}
        <div class="repo-card__update-row"><span class="repo-card__update-tag"><i data-lucide="clock"></i> ${updateBadge}</span></div>
        <h3 class="repo-card__name">${name}</h3>
        <p class="repo-card__description truncate-2-lines">${desc}</p>
        <div class="repo-card__footer">
            <div class="repo-card__language">${repo.language ? `<span class="repo-card__lang-dot" style="background-color: ${langColor}; box-shadow: 0 0 5px ${langColor}"></span> ${escapeHtml(repo.language)}` : ''}</div>
            <div class="repo-card__stats">
                <span class="repo-card__stat"><i data-lucide="star"></i> ${repo.stargazers_count}</span>
                <span class="repo-card__stat"><i data-lucide="git-fork"></i> ${repo.forks_count}</span>
            </div>
        </div>
    `;
}

function setupCardEventListeners(card, repo, onCardClick, onCloneClick) {
    const cloneBtn = document.createElement('button');
    cloneBtn.className = 'repo-card__clone-btn';
    cloneBtn.title = "Copiar 'git clone'";
    cloneBtn.innerHTML = '<i data-lucide="clipboard-copy"></i>';
    cloneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onCloneClick(sanitizeUrl(repo.clone_url), cloneBtn);
    });
    const actions = card.querySelector(`#actions-${repo.id}`);
    if (actions) actions.insertBefore(cloneBtn, actions.firstChild);
    card.addEventListener('click', (e) => {
        if (!e.target.closest('a') && !e.target.closest('button')) onCardClick(repo);
    });
}

export function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    document.querySelectorAll('.repo-card').forEach(card => {
        card.classList.add('fade-in-hidden');
        observer.observe(card);
    });
}

function buildHierarchy(files) {
    const root = {};
    files.forEach(file => {
        const parts = file.path.split('/');
        let current = root;
        parts.forEach((part, index) => {
            if (!current[part]) {
                current[part] = {
                    name: part,
                    type: index === parts.length - 1 ? 'file' : 'folder',
                    path: file.path,
                    children: {}
                };
            }
            current = current[part].children;
        });
    });
    return root;
}

function generateTreeHTML(node, repoName, branch) {
    const entries = Object.values(node).sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });
    return entries.map(item => {
        if (item.type === 'folder') return generateFolderHtml(item, repoName, branch);
        return generateFileHtml(item, repoName, branch);
    }).join('');
}

function generateFolderHtml(item, repoName, branch) {
    return `
        <details class="tree-folder">
            <summary class="tree-folder__summary">
                <i data-lucide="folder" class="tree-folder__icon tree-folder__icon--closed"></i>
                <i data-lucide="folder-open" class="tree-folder__icon tree-folder__icon--open"></i>
                <span class="tree-folder__name">${escapeHtml(item.name)}</span>
            </summary>
            <div class="tree-folder__children">
                ${generateTreeHTML(item.children, repoName, branch)}
            </div>
        </details>
    `;
}

function generateFileHtml(item, repoName, branch) {
    return `
        <div class="tree-file file-node"
             data-repo="${escapeHtml(repoName).replace(/"/g, '&quot;')}"
             data-branch="${escapeHtml(branch).replace(/"/g, '&quot;')}"
             data-path="${escapeHtml(item.path).replace(/"/g, '&quot;')}">
            <i data-lucide="file-code"></i>
            ${escapeHtml(item.name)}
        </div>
    `;
}

export function prepareRepoViewer(repoName) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden', 'closing');
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').textContent = repoName;
    document.getElementById('file-tree').innerHTML = '<div class="modal__loading--pulse">Cargando estructura...</div>';
    const viewer = document.getElementById('code-viewer');
    viewer.innerHTML = '<div class="modal__loading"><i data-lucide="loader-2"></i><p class="modal__loading-text">Buscando README...</p></div>';
    if (window.lucide) window.lucide.createIcons();
}

export function renderRepoTree(repo, treeData, onFileClick) {
    const fileTree = document.getElementById('file-tree');
    const blobs = treeData.tree.filter(i => i.type === 'blob');
    const hierarchy = buildHierarchy(blobs);
    fileTree.innerHTML = generateTreeHTML(hierarchy, repo.name, repo.default_branch);
    if (window.lucide) window.lucide.createIcons();
    setupFileTreeListeners(onFileClick);
    return blobs;
}

function setupFileTreeListeners(onFileClick) {
    const tree = document.getElementById('file-tree');
    tree.onclick = (e) => {
        const fileNode = e.target.closest('.file-node');
        if (fileNode) onFileClick(fileNode);
    };
}

export function showFileLoading() {
    const viewer = document.getElementById('code-viewer');
    viewer.innerHTML = `<div class="modal__loading"><div class="loading-spinner-small" style="width:1.5rem;height:1.5rem;border:2px solid var(--color-primary);border-top-color:transparent;border-radius:9999px;animation:spin 1s linear infinite"></div></div>`;
}

let currentEditor = null;

function getLanguageFromPath(path) {
    const ext = path.split('.').pop().toLowerCase();
    const map = {
        'js': 'javascript', 'json': 'json', 'html': 'html', 'css': 'css',
        'md': 'markdown', 'py': 'python', 'ts': 'typescript', 'yaml': 'yaml', 'yml': 'yaml',
        'sh': 'shell', 'bash': 'shell', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp', 'java': 'java'
    };
    return map[ext] || 'plaintext';
}

export function renderFileContent(content, path, element) {
    document.querySelectorAll('.file-node').forEach(d => d.classList.remove('tree-file--active'));
    if (element) element.classList.add('tree-file--active');
    
    const viewer = document.getElementById('code-viewer');
    
    // Show save button
    const actionsContainer = document.getElementById('modal-actions-container');
    if (actionsContainer) actionsContainer.style.display = 'flex';
    
    if (window.monaco && window.monacoReady) {
        viewer.innerHTML = '<div id="monaco-container" class="monaco-editor-container"></div>';
        initMonaco(content, path);
    } else {
        viewer.innerHTML = '<div class="modal__loading"><i data-lucide="loader-2"></i><p class="modal__loading-text">Cargando editor...</p></div>';
        if (window.lucide) window.lucide.createIcons();
        
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (window.monaco && window.monacoReady) {
                clearInterval(checkInterval);
                viewer.innerHTML = '<div id="monaco-container" class="monaco-editor-container"></div>';
                initMonaco(content, path);
            } else if (attempts > 150) { // 15 segundos
                clearInterval(checkInterval);
                const escaped = content.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#039;'}[m]));
                viewer.innerHTML = `<div class="modal__error">Error cargando el editor avanzado.</div><pre class="code-content">${escaped}</pre>`;
            }
        }, 100);
    }
}

function initMonaco(content, path) {
    if (currentEditor) {
        currentEditor.dispose();
    }
    const container = document.getElementById('monaco-container');
    if (!container) return;
    
    currentEditor = window.monaco.editor.create(container, {
        value: content,
        language: getLanguageFromPath(path),
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        scrollBeyondLastLine: false,
        roundedSelection: false,
        padding: { top: 16, bottom: 16 }
    });
    
    // AI Copilot Actions
    currentEditor.addAction({
        id: 'ai-explain',
        label: '🤖 IA: Explicar Código',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run: (ed) => handleAiAction(ed, 'explain')
    });
    
    currentEditor.addAction({
        id: 'ai-refactor',
        label: '🤖 IA: Refactorizar',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.6,
        run: (ed) => handleAiAction(ed, 'refactor')
    });
    
    currentEditor.addAction({
        id: 'ai-find-bugs',
        label: '🤖 IA: Buscar Bugs',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.7,
        run: (ed) => handleAiAction(ed, 'find_bugs')
    });
    
    currentEditor.addAction({
        id: 'ai-comment',
        label: '🤖 IA: Añadir Comentarios',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.8,
        run: (ed) => handleAiAction(ed, 'comment')
    });
}

async function handleAiAction(editor, action) {
    let code = editor.getModel().getValueInRange(editor.getSelection());
    if (!code || code.trim() === '') {
        code = editor.getValue();
    }
    
    const modal = document.getElementById('ai-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    sendAIMessage(code, action);
}

export function getCurrentEditorContent() {
    return currentEditor ? currentEditor.getValue() : null;
}

export function showViewerError(message, type = 'error') {
    const viewer = document.getElementById('code-viewer');
    const colorClass = type === 'warning' ? 'modal__message--warning' : 'modal__error';
    const icon = type === 'warning' ? '' : '<i data-lucide="alert-triangle"></i>';
    viewer.innerHTML = `<div class="${colorClass}">${icon}${message}</div>`;
    if (window.lucide) window.lucide.createIcons();
}

export async function renderReadme(content) {
    const viewer = document.getElementById('code-viewer');
    if (!window.marked) await importDynamicMarked();
    viewer.innerHTML = `
        <div class="h-full overflow-auto custom-scroll">
            <div class="markdown-body">
                ${window.marked.parse(content)}
            </div>
        </div>`;
}

function importDynamicMarked() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load marked'));
        document.head.appendChild(script);
    });
}

export function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('closing');
    
    const actionsContainer = document.getElementById('modal-actions-container');
    if (actionsContainer) actionsContainer.style.display = 'none';
    
    if (currentEditor) {
        currentEditor.dispose();
        currentEditor = null;
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('closing');
        document.body.style.overflow = '';
        document.getElementById('file-tree').innerHTML = '';
        document.getElementById('code-viewer').innerHTML = '';
    }, 300);
}

export async function copyCloneCommand(url, btn) {
    const command = `git clone ${url}`;
    try {
        await navigator.clipboard.writeText(command);
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" class="clone-success-icon"></i>`;
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = originalContent;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    } catch (err) {
        alert(`Copia este comando:\n${command}`);
    }
}
