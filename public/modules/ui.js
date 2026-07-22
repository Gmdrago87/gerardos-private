/**
 * UI Module for GerardOS Private Dashboard
 * Cleaned version - Removed macOS design references
 */

import { LANG_COLORS, FILTER_BTN_INACTIVE, FILTER_BTN_ACTIVE, FILTER_BTN_ALL_ACTIVE, escapeHtml, sanitizeUrl, highlightText, CACHE_KEY_TIME } from './utils.js';
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
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            // Changed from main-content to hub-view to match actual HTML
            const hubView = document.getElementById('hub-view');
            if (hubView) hubView.style.opacity = '1';
        }, 300);
    }
}

export function showError(msg) {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.innerHTML = `
        <div class="error-screen">
            <p class="error-title">¡Ups!</p>
            <p class="error-message">${escapeHtml(msg)}</p>
            <button id="retry-btn" class="btn-retry">Reintentar</button>
        </div>
    `;
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => location.reload());
    }
}

export function renderProfile(user) {
    // Updated to use actual element IDs from HTML
    const avatarEl = document.getElementById('avatar');
    const avatarMobileEl = document.getElementById('avatar-mobile');
    const nameEl = document.getElementById('name');
    const usernameEl = document.getElementById('username');
    const githubLinkEl = document.getElementById('github-link');

    if (user) {
        if (avatarEl && user.avatar_url) {
            avatarEl.src = user.avatar_url;
            avatarEl.alt = `${user.name || user.login || 'Gerard'} - Avatar`;
        }
        if (avatarMobileEl && user.avatar_url) {
            avatarMobileEl.src = user.avatar_url;
            avatarMobileEl.alt = `${user.name || user.login || 'Gerard'} - Avatar`;
        }
        if (nameEl) nameEl.textContent = user.name || 'GerardMaestre';
        if (usernameEl) usernameEl.textContent = `@${user.login || 'GerardMaestre'}`;
        if (githubLinkEl) githubLinkEl.href = user.html_url || 'https://github.com/GerardMaestre';
    }
}

export function calculateStats(repos) {
    const totalStars = repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);
    const totalForks = repos.reduce((acc, repo) => acc + (repo.forks_count || 0), 0);
    const langs = repos.reduce((acc, r) => {
        if (r.language) acc[r.language] = (acc[r.language] || 0) + 1;
        return acc;
    }, {});
    const topLang = Object.keys(langs).length > 0
        ? Object.keys(langs).reduce((a, b) => langs[a] > langs[b] ? a : b)
        : 'N/A';
    
    // Updated to use actual element IDs from HTML
    animateCounter(document.getElementById('total-repos'), repos.length, 1200);
    animateCounter(document.getElementById('total-stars'), totalStars, 1500);
    animateCounter(document.getElementById('total-forks'), totalForks, 1500);
    const topLangEl = document.getElementById('top-lang');
    if (topLangEl) topLangEl.textContent = topLang;
}

export function renderPortfolioIntelligence(repos) {
    const now = Date.now();
    const recentRepos = repos.filter(repo => (repo._pushedTime || new Date(repo.pushed_at).getTime()) > now - 90 * 86400000);
    const languages = new Set(repos.map(repo => repo.language).filter(Boolean));
    const launchReadyRepos = repos.filter(repo => Boolean(repo.homepage) || (repo.topics && repo.topics.length >= 3));
    const activityScore = repos.length ? Math.round((recentRepos.length / repos.length) * 100) : 0;
    const diversityScore = Math.min(100, languages.size * 14);
    const launchScore = repos.length ? Math.round((launchReadyRepos.length / repos.length) * 100) : 0;
    const portfolioScore = Math.round((activityScore * 0.45) + (diversityScore * 0.25) + (launchScore * 0.3));

    const scoreEl = document.getElementById('portfolio-score');
    const activityEl = document.getElementById('metric-activity');
    const diversityEl = document.getElementById('metric-diversity');
    const launchEl = document.getElementById('metric-launch-ready');
    const nextMoveEl = document.getElementById('portfolio-next-move');

    if (scoreEl) scoreEl.textContent = `${portfolioScore}`;
    if (activityEl) activityEl.textContent = `${activityScore}%`;
    if (diversityEl) diversityEl.textContent = `${languages.size} stacks`;
    if (launchEl) launchEl.textContent = `${launchReadyRepos.length}/${repos.length}`;
    if (nextMoveEl) {
        nextMoveEl.textContent = getPortfolioNextMove({ activityScore, languages, launchReadyRepos, repos });
    }
}

function getPortfolioNextMove({ activityScore, languages, launchReadyRepos, repos }) {
    if (!repos.length) return 'Conecta tus repositorios para activar recomendaciones estratégicas.';
    if (activityScore < 35) return 'Siguiente salto: reactivar proyectos clave con demos, releases y commits de mantenimiento visibles.';
    if (languages.size < 4) return 'Siguiente salto: sumar variedad tecnológica para proyectar profundidad full-stack y producto.';
    if (launchReadyRepos.length < Math.ceil(repos.length * 0.35)) return 'Siguiente salto: añadir homepages, topics y README orientados a conversión en los repos con más potencial.';
    return 'Portfolio en modo élite: prioriza casos de uso, métricas de impacto y demos interactivas para diferenciarte.';
}

export function setupFilters(repos, onFilterClick) {
    const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
    // Create filter container if it doesn't exist
    let container = document.getElementById('filter-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'filter-container';
        container.className = 'language-group';
        const searchWrapper = document.getElementById('hub-scroll-container');
        if (searchWrapper) {
            searchWrapper.insertBefore(container, searchWrapper.firstChild);
        }
    }
    
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
        btn.dataset.filter = lang;
        btn.textContent = lang;
        btn.onclick = (e) => onFilterClick(lang, e.target);
        container.appendChild(btn);
    });
}

export function showDataSourceIndicator(source) {
    // Simplified - just log for now as the indicator elements don't exist in HTML
    const displayMessages = {
        'cache': 'Caché del navegador',
        'api': 'GitHub API',
        'fallback': 'Caché expirada'
    };
    console.log('Data source:', displayMessages[source] || 'GitHub API');
}

export function showToast(title = 'Notificación', message = 'Mensaje de estado.', type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const iconMap = { 'info': 'info', 'warning': 'warning', 'success': 'check_circle', 'error': 'error' };
    const colorMap = { 
        'info': 'text-primary', 
        'warning': 'text-yellow-400', 
        'success': 'text-green-400', 
        'error': 'text-red-400' 
    };
    
    const iconWrapper = toast.querySelector('#toast-icon-wrapper');
    const iconEl = toast.querySelector('#toast-icon');
    const titleEl = toast.querySelector('#toast-title');
    const messageEl = toast.querySelector('#toast-message');
    
    if (iconEl) {
        iconEl.textContent = iconMap[type] || 'info';
    }
    if (iconWrapper) {
        iconWrapper.className = `w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[type] || 'text-primary'} bg-${type}-500/20`;
    }
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    toast.classList.remove('hidden', 'translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    const closeBtn = toast.querySelector('#toast-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            toast.classList.add('hidden', 'translate-y-20', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        };
    }
    
    setTimeout(() => {
        toast.classList.add('hidden', 'translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 5000);
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
    if (!grid) return;

    // Guardar referencias globales para event delegation de cero costo
    window._onCardClickGlobal = onCardClick;
    window._onCloneClickGlobal = onCloneClick;

    if (!grid.dataset.delegated) {
        grid.dataset.delegated = 'true';
        grid.addEventListener('click', (e) => {
            const cloneBtn = e.target.closest('.repo-card__clone-btn');
            if (cloneBtn) {
                e.stopPropagation();
                const url = cloneBtn.dataset.cloneUrl;
                if (window._onCloneClickGlobal) window._onCloneClickGlobal(url, cloneBtn);
                return;
            }
            const card = e.target.closest('.repo-card');
            if (card && !e.target.closest('a') && !e.target.closest('button')) {
                const repoName = card.dataset.repoName;
                const s = getState();
                const repo = s.allRepos.find(r => r.name === repoName);
                if (repo && window._onCardClickGlobal) window._onCardClickGlobal(repo);
            }
        });
    }

    if (!append) grid.innerHTML = '';
    if (repos.length === 0) {
        grid.innerHTML = `<div class="repos-grid__empty">Sin resultados encontrados</div>`;
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        return;
    }
    const { visibleCount } = getState();
    const startIndex = append ? visibleCount - 9 : 0;
    const itemsToShow = repos.slice(startIndex, visibleCount);
    if (append && itemsToShow.length === 0) return;

    const fragment = document.createDocumentFragment();
    itemsToShow.forEach(repo => {
        const card = createCardElement(repo, searchTerm);
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    updateLoadMoreUi(repos.length, visibleCount, loadMoreBtn, append);
}

function updateLoadMoreUi(total, visible, btn, append) {
    if (btn) {
        if (visible < total) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }
}

function createCardElement(repo, searchTerm) {
    const card = document.createElement('div');
    card.className = 'repo-card glass-panel squircle';
    card.dataset.repoName = repo.name;
    const langColor = LANG_COLORS[repo.language] || '#8b90a0';
    const repoName = escapeHtml(repo.name);
    const repoDesc = escapeHtml(repo.description) || 'Sin descripción disponible.';
    const highlightedName = searchTerm ? highlightText(repoName, searchTerm) : repoName;
    const highlightedDesc = searchTerm ? highlightText(repoDesc, searchTerm) : repoDesc;
    const updateBadge = getUpdateBadgeText(repo._pushedTime || repo.pushed_at);
    const webUrl = getWebUrl(repo.homepage);
    const hasWeb = webUrl !== '#';
    card.innerHTML = getCardHtml(repo, highlightedName, highlightedDesc, langColor, updateBadge, webUrl, hasWeb);
    return card;
}

function getUpdateBadgeText(pushedTimeOrString) {
    const pushedMs = typeof pushedTimeOrString === 'number' ? pushedTimeOrString : new Date(pushedTimeOrString).getTime();
    const days = Math.floor((Date.now() - pushedMs) / 86400000);
    if (days <= 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    return `Hace ${Math.floor(days / 30)} meses`;
}

function getWebUrl(homepage) {
    if (!homepage) return '#';
    if (homepage.startsWith('http')) return sanitizeUrl(homepage);
    return `https://${homepage}`;
}

function getCardHtml(repo, name, desc, langColor, updateBadge, webUrl, hasWeb) {
    const stars = repo.stargazers_count || 0;
    const forks = repo.forks_count || 0;
    const language = repo.language || 'Unknown';
    const langDotColor = LANG_COLORS[language] || '#8b90a0';
    
    return `
    <div class="repo-card__header">
        <div class="repo-card__folder-icon">
            <span class="material-symbols-outlined">folder</span>
        </div>
        <div class="repo-card__actions">
            ${hasWeb ? `<a href="${webUrl}" target="_blank" rel="noopener noreferrer" class="repo-card__web-link">
                <span class="material-symbols-outlined">public</span>
                Web
            </a>` : ''}
            <button class="repo-card__clone-btn" data-clone-url="${repo.clone_url || repo.html_url}">
                <span class="material-symbols-outlined">content_copy</span>
            </button>
        </div>
    </div>
    <h3 class="repo-card__name">${name}</h3>
    <p class="repo-card__description">${desc}</p>
    <div class="repo-card__update-row">
        <span class="repo-card__update-tag">
            <span class="material-symbols-outlined">schedule</span>
            ${updateBadge}
        </span>
    </div>
    ${repo.topics && repo.topics.length > 0 ? generateBadgesHtml(repo.topics) : '<div class="repo-card__badges-empty"></div>'}
    <div class="repo-card__footer">
        <div class="repo-card__language">
            <span class="repo-card__lang-dot" style="background-color: ${langDotColor}"></span>
            <span>${language}</span>
        </div>
        <div class="repo-card__stats">
            <span class="repo-card__stat">
                <span class="material-symbols-outlined">star</span>
                ${stars}
            </span>
            <span class="repo-card__stat">
                <span class="material-symbols-outlined">call_split</span>
                ${forks}
            </span>
        </div>
    </div>
    `;
}

export function prepareRepoViewer(repoName) {
    // Show IDE view and set up for repository viewing
    const ideView = document.getElementById('ide-view');
    const hubView = document.getElementById('hub-view');
    
    if (hubView) hubView.classList.add('hidden');
    if (ideView) ideView.classList.remove('hidden');
    
    // Update IDE header
    const repoNameEl = document.getElementById('ide-repo-name');
    if (repoNameEl) repoNameEl.textContent = repoName;
    
    const filePathEl = document.getElementById('ide-file-path');
    if (filePathEl) filePathEl.textContent = 'Selecciona un archivo';
}

export function renderRepoTree(repo, treeData, onFileClick, branch) {
    const fileTree = document.getElementById('file-tree');
    if (!fileTree) return [];
    
    fileTree.innerHTML = '';
    const blobs = [];
    
    if (treeData && treeData.tree) {
        const rootUl = document.createElement('ul');
        rootUl.className = 'tree-root';
        
        treeData.tree.forEach(item => {
            if (item.type === 'blob') {
                blobs.push(item);
                const li = document.createElement('li');
                li.className = 'tree-file';
                li.dataset.repo = repo.name;
                li.dataset.path = item.path;
                li.onclick = () => onFileClick(li, branch);
                
                const icon = document.createElement('span');
                icon.className = 'material-symbols-outlined';
                icon.textContent = 'description';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = item.path;
                
                li.appendChild(icon);
                li.appendChild(nameSpan);
                rootUl.appendChild(li);
            } else if (item.type === 'tree') {
                // For folders, we'd need recursive rendering - simplified for now
                const li = document.createElement('li');
                li.className = 'tree-folder';
                
                const summary = document.createElement('summary');
                summary.className = 'tree-folder__summary';
                
                const icon = document.createElement('span');
                icon.className = 'material-symbols-outlined tree-folder__icon';
                icon.textContent = 'folder';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'tree-folder__name';
                nameSpan.textContent = item.path;
                
                summary.appendChild(icon);
                summary.appendChild(nameSpan);
                li.appendChild(summary);
                rootUl.appendChild(li);
            }
        });
        
        fileTree.appendChild(rootUl);
    }
    
    return blobs;
}

export function showFileLoading() {
    const codeViewer = document.getElementById('code-viewer');
    if (codeViewer) {
        codeViewer.innerHTML = `
            <div class="modal__loading">
                <span class="material-symbols-outlined" style="font-size: 2rem; animation: spin 1s linear infinite;">progress_activity</span>
                <p class="modal__loading-text">Cargando archivo...</p>
            </div>
        `;
    }
}

export function renderFileContent(content, path, element) {
    const codeViewer = document.getElementById('code-viewer');
    if (!codeViewer) return;
    
    // Highlight active file in tree
    document.querySelectorAll('.tree-file').forEach(file => {
        file.classList.remove('tree-file--active');
    });
    if (element) {
        element.classList.add('tree-file--active');
    }
    
    // Update file path display
    const filePathEl = document.getElementById('ide-file-path');
    if (filePathEl) filePathEl.textContent = path;
    
    // Render content
    const ext = path.split('.').pop().toLowerCase();
    const isMarkdown = ['md', 'markdown'].includes(ext);
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
    
    if (isImage) {
        codeViewer.innerHTML = `<img src="${escapeHtml(content)}" class="max-w-full max-h-full object-contain" alt="${escapeHtml(path)}">`;
    } else if (isMarkdown) {
        renderReadme(content);
    } else {
        const pre = document.createElement('pre');
        pre.textContent = content;
        pre.className = 'code-content';
        codeViewer.innerHTML = '';
        codeViewer.appendChild(pre);
    }
}

export function showViewerError(message, type = 'error') {
    const codeViewer = document.getElementById('code-viewer');
    if (!codeViewer) return;
    
    const iconMap = { 'error': 'error', 'warning': 'warning', 'info': 'info' };
    const colorMap = { 'error': 'text-red-400', 'warning': 'text-yellow-400', 'info': 'text-primary' };
    
    codeViewer.innerHTML = `
        <div class="modal__error">
            <span class="material-symbols-outlined ${colorMap[type] || 'text-red-400'}" style="font-size: 2rem;">${iconMap[type] || 'error'}</span>
            <p>${message}</p>
        </div>
    `;
}

export function renderReadme(content) {
    const codeViewer = document.getElementById('code-viewer');
    if (!codeViewer) return;
    
    // Simple markdown rendering - for full markdown, you'd need a library
    codeViewer.innerHTML = `
        <div class="markdown-body">
            ${escapeHtml(content)}
        </div>
    `;
}

export function closeModal() {
    const ideView = document.getElementById('ide-view');
    const hubView = document.getElementById('hub-view');
    
    if (ideView) ideView.classList.add('hidden');
    if (hubView) hubView.classList.remove('hidden');
    
    // Reset current repo info
    currentRepoInfo = null;
    currentBranch = 'main';
    currentFilePath = null;
}

export function copyCloneCommand(url, btn) {
    navigator.clipboard.writeText(url).then(() => {
        if (btn) {
            btn.innerHTML = '<span class="material-symbols-outlined">check</span>';
            setTimeout(() => {
                btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
            }, 2000);
        }
        showToast('Copiado', 'Comando de clonación copiado al portapapeles', 'success');
    }).catch(err => {
        showToast('Error', 'No se pudo copiar al portapapeles', 'error');
    });
}

export function getCurrentEditorContent() {
    const codeViewer = document.getElementById('code-viewer');
    if (!codeViewer) return null;
    
    const pre = codeViewer.querySelector('pre');
    if (pre) return pre.textContent;
    
    return null;
}

export function showCustomAlert({ title, message, type = 'info', icon = 'info' }) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="glass-panel squircle p-6 max-w-md mx-4">
                <div class="flex items-center gap-4 mb-4">
                    <span class="material-symbols-outlined text-4xl ${type === 'error' ? 'text-red-400' : type === 'warning' ? 'text-yellow-400' : 'text-primary'}">${icon}</span>
                    <h3 class="font-headline-md text-on-surface">${escapeHtml(title)}</h3>
                </div>
                <p class="font-body-md text-on-surface-variant mb-6">${escapeHtml(message)}</p>
                <button class="w-full bg-primary text-on-primary py-3 px-6 rounded-lg font-label-emphasized hover:opacity-90 transition-opacity" onclick="this.closest('.fixed').remove(); resolve(true)">
                    Aceptar
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Replace the resolve in the button onclick
        const button = modal.querySelector('button');
        if (button) {
            button.onclick = () => {
                modal.remove();
                resolve(true);
            };
        }
    });
}

export function showCustomConfirm({ title, message, type = 'info', icon = 'info', confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false }) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="glass-panel squircle p-6 max-w-md mx-4">
                <div class="flex items-center gap-4 mb-4">
                    <span class="material-symbols-outlined text-4xl ${type === 'error' ? 'text-red-400' : type === 'warning' ? 'text-yellow-400' : 'text-primary'}">${icon}</span>
                    <h3 class="font-headline-md text-on-surface">${escapeHtml(title)}</h3>
                </div>
                <p class="font-body-md text-on-surface-variant mb-6">${escapeHtml(message)}</p>
                <div class="flex gap-4">
                    <button class="flex-1 bg-${isDanger ? 'error' : 'primary'} text-on-${isDanger ? 'error' : 'primary'} py-3 px-6 rounded-lg font-label-emphasized hover:opacity-90 transition-opacity confirm-btn" onclick="this.closest('.fixed').remove(); resolve(true)">
                        ${escapeHtml(confirmText)}
                    </button>
                    <button class="flex-1 bg-surface-container-high text-on-surface py-3 px-6 rounded-lg font-label-emphasized hover:bg-surface-variant transition-colors cancel-btn" onclick="this.closest('.fixed').remove(); resolve(false)">
                        ${escapeHtml(cancelText)}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                modal.remove();
                resolve(true);
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                modal.remove();
                resolve(false);
            };
        }
    });
}

export function showCustomPrompt({ title, message, fields = [], confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false, validate = null }) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-sm';
        
        let fieldsHtml = '';
        fields.forEach(field => {
            const inputType = field.textarea ? 'textarea' : 'text';
            const inputId = `prompt-${field.name}-${Date.now()}`;
            fieldsHtml += `
                <div class="mb-4">
                    <label class="block font-label-sm text-on-surface-variant mb-1">${escapeHtml(field.label)}</label>
                    <${inputType} 
                        id="${inputId}" 
                        class="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary ${field.textarea ? 'resize-none h-24' : ''}"
                        placeholder="${escapeHtml(field.placeholder || '')}"
                        ${field.required ? 'required' : ''}
                        ${inputType === 'textarea' ? '></' + inputType + '>' : '/>'}
                </div>
            `;
        });
        
        modal.innerHTML = `
            <div class="glass-panel squircle p-6 max-w-md mx-4">
                <div class="flex items-center gap-4 mb-4">
                    <span class="material-symbols-outlined text-4xl text-primary">edit</span>
                    <h3 class="font-headline-md text-on-surface">${escapeHtml(title)}</h3>
                </div>
                <p class="font-body-md text-on-surface-variant mb-6">${escapeHtml(message)}</p>
                ${fieldsHtml}
                <div class="flex gap-4">
                    <button class="flex-1 bg-primary text-on-primary py-3 px-6 rounded-lg font-label-emphasized hover:opacity-90 transition-opacity confirm-btn" onclick="handlePromptConfirm(this)">
                        ${escapeHtml(confirmText)}
                    </button>
                    <button class="flex-1 bg-surface-container-high text-on-surface py-3 px-6 rounded-lg font-label-emphasized hover:bg-surface-variant transition-colors cancel-btn" onclick="this.closest('.fixed').remove(); resolve(null)">
                        ${escapeHtml(cancelText)}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const values = {};
                let isValid = true;
                
                fields.forEach(field => {
                    const inputId = `prompt-${field.name}-${Date.now()}`;
                    const input = modal.querySelector(`#${inputId}`);
                    if (input) {
                        values[field.name] = input.value;
                        if (field.required && !values[field.name]) {
                            isValid = false;
                        }
                    }
                });
                
                if (isValid && validate) {
                    const validationError = validate(values);
                    if (validationError) {
                        showToast('Validación', validationError, 'error');
                        isValid = false;
                    }
                }
                
                if (isValid) {
                    modal.remove();
                    resolve(values);
                }
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                modal.remove();
                resolve(null);
            };
        }
    });
}

// Helper function for prompt confirmation
window.handlePromptConfirm = function(btn) {
    const modal = btn.closest('.fixed');
    if (!modal) return;
    
    const confirmBtn = modal.querySelector('.confirm-btn');
    if (confirmBtn && confirmBtn.onclick) {
        confirmBtn.onclick();
    }
};
