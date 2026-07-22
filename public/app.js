/**
 * DevRepo - Main Application (Apple Style Integration)
 * This file integrates the existing functionality with the new Apple-style UI
 */

import { USERNAME, debounce, escapeHtml } from './modules/utils.js';
import { getState, setState } from './modules/state.js';
import { 
    getCachedData, 
    saveToCache, 
    getExpiredCache, 
    clearCache, 
    fetchApiData, 
    fetchFallbackData,
    fetchRepoTree, 
    fetchFileContent, 
    createRepo, 
    deleteRepo, 
    updateRepoVisibility, 
    fetchCommits, 
    fetchBranches, 
    saveFileContent, 
    deleteFile, 
    fetchIssues, 
    createIssue, 
    updateIssue, 
    fetchActions 
} from './modules/api.js';
import { checkSession, login, logout } from './modules/auth.js';
import { initShortcuts } from './modules/shortcuts.js';
import { initAI } from './modules/ai_ui.js';
import { initFuturisticEngine } from './modules/futuristic.js';

// ===== STATE MANAGEMENT =====
const state = {
    user: null,
    repos: [],
    filteredRepos: [],
    currentLangFilter: 'all',
    currentSort: 'updated',
    visibleCount: 12,
    isLoading: false
};

// ===== LOADING SCREEN =====
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function updateLoadingStatus(text) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
        statusEl.textContent = text;
    }
}

// ===== LOGIN SCREEN =====
function showLoginScreen() {
    const loginScreen = document.getElementById('mac-login-screen');
    const mainWindow = document.querySelector('main');
    const loadingScreen = document.getElementById('loading');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (mainWindow) mainWindow.style.opacity = '0.3';
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
    
    // Setup login button
    const loginBtn = document.getElementById('mac-login-github-btn');
    if (loginBtn) {
        loginBtn.onclick = handleLoginSubmit;
    }
}

function hideLoginScreen() {
    const loginScreen = document.getElementById('mac-login-screen');
    const mainWindow = document.querySelector('main');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainWindow) mainWindow.style.opacity = '1';
}

async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('mac-login-github-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Redirigiendo a GitHub...';
    }
    login();
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const iconMap = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error_outline'
    };
    
    const toastPanel = toast.querySelector('.toast__panel');
    if (!toastPanel) return;
    
    const icon = toastPanel.querySelector('.material-symbols-outlined');
    if (icon) {
        icon.textContent = iconMap[type] || 'info';
    }
    
    const titleEl = toastPanel.querySelector('.toast__title');
    const messageEl = toastPanel.querySelector('.toast__message');
    
    if (titleEl) {
        titleEl.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    }
    if (messageEl) {
        messageEl.textContent = message;
    }
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

// ===== VERSION INFO =====
async function loadVersionInfo() {
    try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const data = await res.json();
        const elements = document.querySelectorAll('#footer-version, .login-version-tag');
        elements.forEach(el => {
            if (data.version) {
                if (data.fullSha) {
                    el.innerHTML = `<a href="https://github.com/GerardMaestre/gerardos-privado/commit/${data.fullSha}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;" title="Ver commit en GitHub">${data.version}</a>`;
                } else {
                    el.textContent = data.version;
                }
            }
        });
    } catch (e) {
        console.warn('No se pudo obtener la versión dinámica:', e);
    }
}

// ===== DATA PROCESSING =====
async function processData(user, repos, source = 'api') {
    // Update state
    state.user = user;
    state.repos = repos || [];
    state.filteredRepos = [...state.repos];
    
    // Update UI
    updateProfile(user);
    updateStats(user, repos);
    renderRepos(state.filteredRepos.slice(0, state.visibleCount));
    setupFilters(repos);
    showDataSourceIndicator(source);
    
    // Setup event listeners
    setupEventListeners();
}

function updateProfile(user) {
    if (!user) return;
    
    const avatar = document.getElementById('avatar');
    const nameEl = document.getElementById('name');
    const usernameEl = document.getElementById('username');
    
    if (avatar) avatar.src = user.avatar_url || 'https://avatars.githubusercontent.com/u/195803064?v=4';
    if (nameEl) nameEl.textContent = user.name || user.login || 'User';
    if (usernameEl) usernameEl.textContent = user.login ? `@${user.login}` : '';
}

function updateStats(user, repos) {
    const totalRepos = document.getElementById('total-repos');
    const totalIssues = document.getElementById('total-issues');
    const cicdSuccess = document.getElementById('cicd-success');
    
    if (totalRepos) totalRepos.textContent = user?.public_repos || repos?.length || 0;
    if (totalIssues) totalIssues.textContent = '0'; // Will be updated with actual data
    if (cicdSuccess) cicdSuccess.textContent = '94%';
}

function showDataSourceIndicator(source) {
    const indicator = document.getElementById('data-source-indicator');
    const text = document.getElementById('data-source-text');
    const cacheAge = document.getElementById('cache-age-text');
    
    if (!indicator || !text) return;
    
    if (source === 'cache') {
        indicator.classList.remove('hidden');
        text.textContent = 'Fuente de datos: Caché';
        if (cacheAge) {
            const cachedData = getCachedData();
            if (cachedData && cachedData.timestamp) {
                const age = Math.floor((Date.now() - cachedData.timestamp) / 1000 / 60);
                cacheAge.textContent = ` (${age} min atrás)`;
            }
        }
    } else {
        indicator.classList.add('hidden');
    }
}

// ===== REPOSITORY RENDERING =====
function renderRepos(repos) {
    const reposGrid = document.getElementById('repos-grid');
    if (!reposGrid) return;
    
    // Clear existing repos
    reposGrid.innerHTML = '';
    
    if (!repos || repos.length === 0) {
        reposGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-4">inbox</span>
                <p class="text-on-surface-variant">No repositories found</p>
            </div>
        `;
        document.getElementById('showing-count').textContent = 'Mostrando 0 repositorios';
        return;
    }
    
    // Render each repo card
    repos.forEach(repo => {
        const repoCard = createRepoCard(repo);
        reposGrid.appendChild(repoCard);
    });
    
    // Update showing count
    document.getElementById('showing-count').textContent = `Mostrando ${repos.length} de ${state.repos.length} repositorios`;
    
    // Show load more button if there are more repos
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.classList.toggle('hidden', repos.length >= state.repos.length);
    }
}

function createRepoCard(repo) {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-xl p-6 magnetic-hover glass-panel-hover flex flex-col group cursor-pointer relative overflow-hidden h-48';
    card.onclick = () => openRepoModal(repo);
    
    // Get language color
    const languageColors = {
        JavaScript: 'bg-yellow-400',
        TypeScript: 'bg-blue-400',
        Python: 'bg-green-400',
        Java: 'bg-orange-500',
        C: 'bg-purple-400',
        'C++': 'bg-pink-400',
        Go: 'bg-cyan-400',
        Rust: 'bg-orange-500',
        PHP: 'bg-indigo-400',
        Ruby: 'bg-red-400'
    };
    
    const langColor = languageColors[repo.language] || 'bg-gray-400';
    const lastUpdated = repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'Unknown';
    
    card.innerHTML = `
        <div class="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500 pointer-events-none"></div>
        <div class="flex justify-between items-start z-10">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 squircle-sm bg-surface-container-high flex items-center justify-center border border-white/5">
                    <span class="material-symbols-outlined text-primary text-[24px]">${getRepoIcon(repo)}</span>
                </div>
                <div>
                    <h3 class="font-headline-sm text-headline-sm text-white group-hover:text-primary transition-colors truncate">${escapeHtml(repo.name || 'Untitled')}</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant truncate">${repo.language || 'Unknown'} • ${escapeHtml(repo.description || 'No description')}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-label-mono text-label-mono text-on-surface-variant bg-white/5 px-2 py-1 rounded">${repo.visibility || 'public'}</span>
                <div class="flex items-center gap-1 text-secondary">
                    <span class="w-2 h-2 rounded-full status-dot-success"></span>
                    <span class="font-label-mono text-label-mono">Active</span>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-4 mt-2 z-10 border-t border-white/5 pt-4">
            <div>
                <p class="font-label-mono text-label-mono text-on-surface-variant opacity-70 mb-1">LAST COMMIT</p>
                <p class="font-body-sm text-body-sm truncate text-white">${escapeHtml(repo.lastCommit || lastUpdated)}</p>
            </div>
            <div>
                <p class="font-label-mono text-label-mono text-on-surface-variant opacity-70 mb-1">STARS</p>
                <p class="font-body-sm text-body-sm text-white flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px] text-yellow-400">star</span> ${repo.stargazers_count || 0}
                </p>
            </div>
            <div class="flex justify-end items-end">
                <span class="font-label-mono text-label-mono text-on-surface-variant text-xs">Updated ${lastUpdated}</span>
            </div>
        </div>
    `;
    
    return card;
}

function getRepoIcon(repo) {
    if (repo.language === 'JavaScript' || repo.language === 'TypeScript') return 'web';
    if (repo.language === 'Python') return 'data_object';
    if (repo.language === 'Java' || repo.language === 'Kotlin') return 'coffee';
    if (repo.language === 'Go') return 'data_object';
    if (repo.language === 'Rust') return 'memory';
    if (repo.language === 'C' || repo.language === 'C++') return 'settings_input_component';
    return 'api';
}

// ===== FILTERS AND SORTING =====
function setupFilters(repos) {
    const filterLang = document.getElementById('filter-lang');
    if (!filterLang) return;
    
    // Get unique languages
    const languages = ['all', ...new Set(repos.map(r => r.language).filter(Boolean))];
    
    // Update filter options
    filterLang.innerHTML = languages.map(lang => `
        <option value="${lang}">${lang === 'all' ? 'All Languages' : lang}</option>
    `).join('');
    
    // Setup filter event
    filterLang.onchange = () => applyFilters();
    
    // Setup sort event
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.onchange = applySorting;
    }
}

function applyFilters() {
    const langFilter = document.getElementById('filter-lang')?.value || 'all';
    const sortBy = document.getElementById('sort-select')?.value || 'updated';
    
    state.currentLangFilter = langFilter;
    state.currentSort = sortBy;
    
    // Filter repos
    let filtered = [...state.repos];
    
    if (langFilter !== 'all') {
        filtered = filtered.filter(r => r.language === langFilter);
    }
    
    // Sort repos
    filtered = sortRepos(filtered, sortBy);
    
    state.filteredRepos = filtered;
    renderRepos(filtered.slice(0, state.visibleCount));
}

function applySorting() {
    applyFilters(); // Re-apply filters with new sort
}

function sortRepos(repos, sortBy) {
    switch (sortBy) {
        case 'stars':
            return repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
        case 'forks':
            return repos.sort((a, b) => (b.forks_count || 0) - (a.forks_count || 0));
        case 'name':
            return repos.sort((a, b) => a.name.localeCompare(b.name));
        case 'updated':
        default:
            return repos.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    }
}

// ===== LOAD MORE =====
function setupLoadMore() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.onclick = () => {
            state.visibleCount += 12;
            renderRepos(state.filteredRepos.slice(0, state.visibleCount));
        };
    }
}

// ===== MODAL FUNCTIONS =====
function openRepoModal(repo) {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('hidden');
        loadRepoData(repo);
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function loadRepoData(repo) {
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.textContent = repo.name || 'Repository';
    }
    
    // Load file tree
    const fileTree = document.getElementById('file-tree');
    if (fileTree) {
        fileTree.innerHTML = `
            <div class="text-on-surface-variant text-sm text-center py-4">
                <span class="material-symbols-outlined">folder_open</span>
                <p>Cargando estructura...</p>
            </div>
        `;
    }
    
    // Load code viewer
    const codeViewer = document.getElementById('code-viewer');
    if (codeViewer) {
        codeViewer.innerHTML = `
            <div class="flex items-center justify-center h-full text-on-surface-variant">
                <div class="text-center">
                    <span class="material-symbols-outlined text-4xl mb-2">description</span>
                    <p>Selecciona un archivo</p>
                </div>
            </div>
        `;
    }
    
    // Fetch repo tree
    try {
        const tree = await fetchRepoTree(repo.owner.login, repo.name);
        if (tree && fileTree) {
            renderFileTree(tree, repo);
        }
    } catch (error) {
        console.error('Error loading repo tree:', error);
        if (fileTree) {
            fileTree.innerHTML = `
                <div class="text-on-surface-variant text-sm text-center py-4">
                    <span class="material-symbols-outlined">error_outline</span>
                    <p>Error cargando estructura</p>
                </div>
            `;
        }
    }
}

function renderFileTree(tree, repo) {
    const fileTree = document.getElementById('file-tree');
    if (!fileTree) return;
    
    // Simple tree rendering - in a real implementation, you'd have a proper tree structure
    fileTree.innerHTML = `
        <div class="tree-item active" data-path="README.md" onclick="selectFile(this, '${repo.owner.login}', '${repo.name}', 'README.md')">
            <span class="material-symbols-outlined icon">description</span>
            <span class="name">README.md</span>
        </div>
        <div class="tree-item" data-path="src" onclick="toggleFolder(this)">
            <span class="material-symbols-outlined icon">folder</span>
            <span class="name">src</span>
        </div>
        <div class="tree-item" data-path=".github" onclick="toggleFolder(this)">
            <span class="material-symbols-outlined icon">folder</span>
            <span class="name">.github</span>
        </div>
    `;
}

async function selectFile(element, owner, repo, path) {
    // Update active state
    document.querySelectorAll('.tree-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    
    // Load file content
    const codeViewer = document.getElementById('code-viewer');
    if (codeViewer) {
        codeViewer.innerHTML = `
            <div class="flex items-center justify-center h-full text-on-surface-variant">
                <div class="text-center">
                    <span class="loading-spinner"></span>
                    <p>Cargando ${path}...</p>
                </div>
            </div>
        `;
    }
    
    try {
        const content = await fetchFileContent(owner, repo, path);
        if (codeViewer) {
            renderFileContent(path, content);
        }
    } catch (error) {
        console.error('Error loading file:', error);
        if (codeViewer) {
            codeViewer.innerHTML = `
                <div class="flex items-center justify-center h-full text-on-surface-variant">
                    <div class="text-center">
                        <span class="material-symbols-outlined text-4xl mb-2 text-error">error_outline</span>
                        <p>Error cargando archivo</p>
                    </div>
                </div>
            `;
        }
    }
}

function renderFileContent(path, content) {
    const codeViewer = document.getElementById('code-viewer');
    if (!codeViewer) return;
    
    const filePath = document.getElementById('file-path');
    if (filePath) {
        filePath.textContent = path;
    }
    
    // Simple syntax highlighting based on file extension
    const ext = path.split('.').pop();
    const language = getLanguageFromExtension(ext);
    
    codeViewer.innerHTML = `
        <pre class="language-${language}"><code>${escapeHtml(content)}</code></pre>
    `;
}

function getLanguageFromExtension(ext) {
    const map = {
        js: 'javascript',
        ts: 'typescript',
        py: 'python',
        java: 'java',
        go: 'go',
        rs: 'rust',
        c: 'c',
        cpp: 'cpp',
        php: 'php',
        rb: 'ruby',
        md: 'markdown',
        json: 'json',
        yaml: 'yaml',
        yml: 'yaml',
        html: 'html',
        css: 'css'
    };
    return map[ext] || 'text';
}

function toggleFolder(element) {
    // Simple folder toggle - in a real implementation, you'd show/hide children
    console.log('Toggle folder:', element.dataset.path);
}

// ===== KANBAN =====
function setupKanban() {
    // Setup kanban drag and drop
    const kanbanCols = document.querySelectorAll('.kanban-col');
    
    kanbanCols.forEach(col => {
        const cards = col.querySelector('.kanban-cards');
        if (cards) {
            // Setup drop zone
            cards.ondragover = (e) => {
                e.preventDefault();
                cards.classList.add('bg-surface-variant/30');
            };
            
            cards.ondragleave = () => {
                cards.classList.remove('bg-surface-variant/30');
            };
            
            cards.ondrop = (e) => {
                e.preventDefault();
                cards.classList.remove('bg-surface-variant/30');
                // Handle drop
            };
        }
    });
}

// ===== CREATE REPO =====
function setupCreateRepoModal() {
    const createBtn = document.getElementById('btn-open-create-repo');
    const modal = document.getElementById('create-repo-modal');
    const cancelBtn = document.getElementById('create-repo-cancel-btn');
    const closeBtn = modal?.querySelector('.modal__close');
    const form = document.getElementById('create-repo-form');
    
    if (createBtn && modal) {
        createBtn.onclick = () => modal.classList.remove('hidden');
    }
    
    if (cancelBtn && modal) {
        cancelBtn.onclick = () => modal.classList.add('hidden');
    }
    
    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }
    
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await createNewRepo();
        };
    }
}

async function createNewRepo() {
    const name = document.getElementById('repo-name')?.value || '';
    const desc = document.getElementById('repo-desc')?.value || '';
    const isPrivate = document.getElementById('repo-private')?.checked || false;
    const errorEl = document.getElementById('create-repo-error');
    
    if (!name) {
        if (errorEl) errorEl.textContent = 'El nombre del repositorio es obligatorio';
        return;
    }
    
    if (errorEl) errorEl.textContent = '';
    
    const submitBtn = document.getElementById('create-repo-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Creando...';
    }
    
    try {
        const newRepo = await createRepo(name, desc, isPrivate);
        if (newRepo) {
            // Add to state
            state.repos.unshift(newRepo);
            state.filteredRepos = [...state.repos];
            
            // Re-render
            renderRepos(state.filteredRepos.slice(0, state.visibleCount));
            
            // Close modal
            document.getElementById('create-repo-modal')?.classList.add('hidden');
            
            // Reset form
            if (form) form.reset();
            
            showToast('Repositorio creado con éxito', 'success');
        }
    } catch (error) {
        console.error('Error creating repo:', error);
        if (errorEl) errorEl.textContent = error.message || 'Error creando repositorio';
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">create</span> Crear';
        }
    }
}

// ===== AI ASSISTANT =====
function setupAIAssistant() {
    const aiBtn = document.getElementById('btn-ai-assistant');
    const aiModal = document.getElementById('ai-modal');
    const aiClose = document.getElementById('ai-close-btn');
    const aiSend = document.getElementById('ai-send-btn');
    const aiInput = document.getElementById('ai-input');
    
    if (aiBtn && aiModal) {
        aiBtn.onclick = () => aiModal.classList.remove('hidden');
    }
    
    if (aiClose && aiModal) {
        aiClose.onclick = () => aiModal.classList.add('hidden');
    }
    
    if (aiSend && aiInput) {
        aiSend.onclick = () => {
            const message = aiInput.value.trim();
            if (message) {
                sendAIMessage(message);
                aiInput.value = '';
            }
        };
        
        aiInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                aiSend.onclick();
            }
        };
    }
}

function sendAIMessage(message) {
    const messagesContainer = document.getElementById('ai-messages');
    if (!messagesContainer) return;
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-chat-msg ai-chat-msg--user flex gap-3 mb-4 justify-end';
    userMsg.innerHTML = `
        <div class="ai-msg-bubble bg-primary/20 p-3 squircle-sm border border-primary/30 max-w-xs">
            <p class="font-body-md text-body-md text-on-surface">${escapeHtml(message)}</p>
        </div>
        <div class="w-8 h-8 rounded-full bg-surface-container-high/50 flex-shrink-0 flex items-center justify-center border border-outline-variant/30 mt-1">
            <img alt="User" class="w-full h-full rounded-full object-cover" src="https://avatars.githubusercontent.com/u/195803064?v=4">
        </div>
    `;
    messagesContainer.appendChild(userMsg);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Call AI API
    initAI().then(() => {
        // Use the existing AI functionality
        if (window.AI && window.AI.sendMessage) {
            window.AI.sendMessage(message);
        } else {
            // Fallback: show typing indicator
            showAITyping();
        }
    });
}

function showAITyping() {
    const messagesContainer = document.getElementById('ai-messages');
    if (!messagesContainer) return;
    
    const typingMsg = document.createElement('div');
    typingMsg.className = 'ai-chat-msg ai-chat-msg--ai flex gap-3 mb-4';
    typingMsg.id = 'ai-typing-indicator';
    typingMsg.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center border border-primary/30 mt-1">
            <span class="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
        </div>
        <div class="ai-msg-bubble bg-surface-container-high/50 p-3 squircle-sm border border-white/5 rounded-xl">
            <p class="font-body-md text-body-md text-on-surface">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </p>
        </div>
    `;
    messagesContainer.appendChild(typingMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== SETTINGS MODAL =====
function setupSettingsModal() {
    const settingsBtn = document.querySelector('[title="Ajustes"]');
    const modal = document.getElementById('settings-modal');
    const closeBtn = modal?.querySelector('.modal__close');
    const backdrop = modal?.querySelector('.modal__backdrop');
    
    if (settingsBtn && modal) {
        settingsBtn.onclick = () => modal.classList.remove('hidden');
    }
    
    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }
    
    if (backdrop && modal) {
        backdrop.onclick = () => modal.classList.add('hidden');
    }
}

// ===== LOGOUT =====
function setupLogout() {
    const logoutBtn = document.getElementById('mac-logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                try {
                    await logout();
                } catch (error) {
                    console.error('Error logging out:', error);
                }
            }
        };
    }
}

// ===== SCROLL TO TOP =====
function setupScrollToTop() {
    const btn = document.getElementById('scroll-to-top');
    if (btn) {
        btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        
        window.addEventListener('scroll', debounce(() => {
            if (window.scrollY > 300) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        }, 10));
    }
}

// ===== TAB SWITCHING =====
function setupModalTabs() {
    const tabs = document.querySelectorAll('.modal-tab');
    const panes = document.querySelectorAll('.modal__body');
    
    tabs.forEach(tab => {
        tab.onclick = () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs and panes
            tabs.forEach(t => {
                t.classList.remove('active', 'text-primary');
                t.classList.add('text-on-surface-variant');
            });
            panes.forEach(p => p.classList.add('hidden'));
            
            // Add active class to clicked tab
            tab.classList.add('active', 'text-primary');
            tab.classList.remove('text-on-surface-variant');
            
            // Show corresponding pane
            const targetPane = document.getElementById(`tab-${targetTab}`);
            if (targetPane) {
                targetPane.classList.remove('hidden');
            }
        };
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.oninput = debounce(() => {
            const query = searchInput.value.toLowerCase();
            if (query) {
                const filtered = state.filteredRepos.filter(r => 
                    r.name.toLowerCase().includes(query) ||
                    r.description?.toLowerCase().includes(query) ||
                    r.language?.toLowerCase().includes(query)
                );
                renderRepos(filtered.slice(0, state.visibleCount));
            } else {
                renderRepos(state.filteredRepos.slice(0, state.visibleCount));
            }
        }, 300);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.onclick = forceRefreshData;
    }
    
    // Setup load more
    setupLoadMore();
    
    // Setup kanban
    setupKanban();
    
    // Setup create repo modal
    setupCreateRepoModal();
    
    // Setup AI assistant
    setupAIAssistant();
    
    // Setup settings modal
    setupSettingsModal();
    
    // Setup logout
    setupLogout();
    
    // Setup scroll to top
    setupScrollToTop();
    
    // Setup modal tabs
    setupModalTabs();
    
    // Setup keyboard shortcuts
    initShortcuts();
    
    // Setup AI
    initAI();
    
    // Setup futuristic engine
    initFuturisticEngine();
}

// ===== DATA FETCHING =====
async function fetchFreshOrFallback() {
    try {
        updateLoadingStatus('Consultando API GitHub...');
        const data = await fetchApiData();
        if (data) {
            processData(data.user, data.repos, 'api');
            hideLoading();
            return;
        }
        
        // Fallback to cached data
        const cached = getCachedData();
        if (cached) {
            processData(cached.user, cached.repos, 'cache');
            hideLoading();
            return;
        }
        
        throw new Error('No data available');
    } catch (error) {
        console.error('Error fetching data:', error);
        handleCriticalError(error);
    }
}

function handleCriticalError(error) {
    hideLoading();
    showToast(error.message || 'Error loading data', 'error');
}

async function forceRefreshData() {
    const refreshBtn = document.getElementById('refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="loading-spinner"></span> Refreshing...';
    }
    
    try {
        await clearCache();
        await fetchFreshOrFallback();
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error refreshing data', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<span class="material-symbols-outlined">refresh</span> Refresh';
        }
    }
}

// ===== INITIALIZATION =====
async function initApp() {
    // Trazado de errores desde la URL (OAuth Callback)
    const urlParams = new URLSearchParams(window.location.search);
    const urlError = urlParams.get('error');
    const urlErrorDesc = urlParams.get('error_description') || urlParams.get('scope') || '';
    
    if (urlError) {
        console.error(`[OAuth Trazado] Error detectado en la redirección: ${urlError}`);
        if (urlErrorDesc) console.error(`[OAuth Trazado] Detalles adicionales: ${urlErrorDesc}`);
        
        showToast(`Error de autenticación: ${urlError.replace(/_/g, ' ')}`, 'error');
        
        // Limpiar URL para que no vuelva a salir si refresca
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    updateLoadingStatus('Verificando sesión...');
    
    try {
        const session = await checkSession();
        if (!session.authenticated) {
            showLoginScreen();
            return;
        }
        
        hideLoginScreen();
        updateLoadingStatus('Conectando con GitHub...');
        
        const cached = getCachedData();
        if (cached) {
            updateLoadingStatus('Cargando desde caché...');
            processData(cached.user, cached.repos, 'cache');
            hideLoading();
            return;
        }
        
        await fetchFreshOrFallback();
    } catch (error) {
        if (error.message === "UNAUTHORIZED") {
            showLoginScreen();
        } else {
            handleCriticalError(error);
        }
    }
}

// ===== START APPLICATION =====
// Set current year
const yearEl = document.getElementById('year');
if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
}

// Load version info
loadVersionInfo();

// Initialize app
initApp();

// Export for use in other modules
window.DevRepo = {
    state,
    renderRepos,
    openRepoModal,
    closeModal,
    showToast,
    forceRefreshData
};
