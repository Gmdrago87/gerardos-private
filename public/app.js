import { USERNAME, debounce, escapeHtml } from './modules/utils.js';
import { getState, setState, getCachedTree, setCachedTree, getCachedFile, setCachedFile } from './modules/state.js';
import { getCachedData, saveToCache, getExpiredCache, clearCache, fetchApiData, fetchFallbackData, fetchRepoTree, fetchFileContent, createRepo, deleteRepo, updateRepoVisibility, fetchCommits, fetchBranches, saveFileContent, deleteFile, fetchIssues, createIssue, updateIssue, fetchActions } from './modules/api.js';
import { renderProfile, calculateStats, setupFilters, showDataSourceIndicator, showToast, renderRepos, prepareRepoViewer, renderRepoTree, showFileLoading, renderFileContent, showViewerError, renderReadme, closeModal, copyCloneCommand, hideLoading, showError, updateLoadingStatus, getCurrentEditorContent } from './modules/ui.js';
import { checkSession, login, logout } from './modules/auth.js';
import { initShortcuts } from './modules/shortcuts.js';
import { initAI } from './modules/ai_ui.js';

async function loadVersionInfo() {
    try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const data = await res.json();
        const el = document.getElementById('footer-version');
        if (el && data.version) {
            if (data.fullSha) {
                el.innerHTML = `<a href="https://github.com/GerardMaestre/gerardos-privado/commit/${data.fullSha}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;" title="Ver commit en GitHub">${data.version}</a>`;
            } else {
                el.textContent = data.version;
            }
        }
    } catch (e) {
        console.warn('No se pudo obtener la versión dinámica:', e);
    }
}

async function initApp() {
    initShortcuts();
    initAI();
    loadVersionInfo();
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
            handleCachedSuccess(cached);
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

function showLoginScreen() {
    const loginScreen = document.getElementById('mac-login-screen');
    const mainWindow = document.getElementById('mac-main-window');
    const loadingScreen = document.getElementById('loading');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (mainWindow) mainWindow.style.opacity = '0.3';
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
}

function hideLoginScreen() {
    const loginScreen = document.getElementById('mac-login-screen');
    const mainWindow = document.getElementById('mac-main-window');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainWindow) mainWindow.style.opacity = '1';
}

async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('mac-login-github-btn') || document.getElementById('mac-login-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="login-spinner"></span> Redirigiendo a GitHub...';
    }
    login(); // redirect to OAuth
}

function handleCachedSuccess(cached) {
    updateLoadingStatus('Cargando desde caché...');
    processData(cached.user, cached.repos, 'cache');
    hideLoading();
}

async function fetchFreshOrFallback() {
    try {
        updateLoadingStatus('Consultando API GitHub...');
        const data = await fetchApiData();
        saveToCache(data.user, data.repos);
        processData(data.user, data.repos, 'api');
        hideLoading();
    } catch (apiError) {
        console.warn('Falló la API o caché expirada, intentando fallback...', apiError);
        if (apiError.message === "UNAUTHORIZED") {
            showLoginScreen();
            return;
        }
        await fetchLocalFallback();
    }
}

async function fetchLocalFallback() {
    updateLoadingStatus('Cargando datos locales...');
    try {
        const fallback = await fetchFallbackData();
        processData(fallback.user, fallback.repos, 'fallback');
        hideLoading();
    } catch (e) {
        handleCriticalError(e);
    }
}

function handleCriticalError(error) {
    console.error('Error crítico:', error);
    const expired = getExpiredCache();
    if (expired) {
        showToast('Modo Offline', 'Usando datos antiguos guardados', 'warning');
        processData(expired.user, expired.repos, 'fallback');
        hideLoading();
    } else {
        showError('No se pudieron cargar los datos. Verifica tu conexión.');
    }
}

function processData(user, repos, source) {
    setState({ user: user, allRepos: repos, filteredRepos: repos });
    renderProfile(user);
    calculateStats(repos);
    setupFilters(repos, handleFilterClick);
    renderRepos(repos, false, '', handleCardClick, handleCloneClick);
    showDataSourceIndicator(source);
    if (window.lucide) window.lucide.createIcons();
}

function handleFilterClick(lang, btnElement) {
    const s = getState();
    const newFilter = (lang === 'all') ? 'all' : (s.currentLangFilter === lang ? 'all' : lang);
    setState({ currentLangFilter: newFilter });
    
    document.querySelectorAll('#filter-container button').forEach(b => {
        b.className = 'filter-btn';
    });
    if (newFilter !== 'all') {
        btnElement.className = 'filter-btn filter-btn--active';
    } else {
        document.querySelector('[data-filter="all"]').className = 'filter-btn filter-btn--active';
    }
    runFilterAndSearch();
}

function runFilterAndSearch() {
    const s = getState();
    const term = document.getElementById('search-input').value.toLowerCase();
    const filtered = s.allRepos.filter(repo => {
        const matchesSearch = repo.name.toLowerCase().includes(term) || 
                               (repo.description || '').toLowerCase().includes(term);
        const matchesLang = s.currentLangFilter === 'all' || repo.language === s.currentLangFilter;
        return matchesSearch && matchesLang;
    });
    const sorted = sortRepositories(filtered, s.currentSort);
    setState({ filteredRepos: sorted, visibleCount: 9 });
    renderRepos(sorted, false, term, handleCardClick, handleCloneClick);
}

function sortRepositories(repos, sortBy) {
    const sorted = [...repos];
    if (sortBy === 'stars') return sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
    if (sortBy === 'forks') return sorted.sort((a, b) => b.forks_count - a.forks_count);
    if (sortBy === 'name') return sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'updated') return sorted.sort((a, b) => new Date(b.updated_at || b.pushed_at) - new Date(a.updated_at || a.pushed_at));
    return sorted.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
}

function handleSortClick(sortBy) {
    setState({ currentSort: sortBy });
    runFilterAndSearch();
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active-sort');
    });
    document.querySelector(`[data-sort="${sortBy}"]`)?.classList.add('active-sort');
}

// Visor de Código & Ramas & Commits
let currentBranch = 'main';
let currentRepoInfo = null;
let currentFilePath = null;

async function handleCardClick(repo) {
    currentRepoInfo = repo;
    currentBranch = repo.default_branch || 'main';
    currentFilePath = null;
    prepareRepoViewer(repo.name);
    
    // Cargar ramas
    try {
        const branches = await fetchBranches(repo.name);
        renderBranchDropdown(repo, branches);
    } catch(e) {
        console.warn("No se pudieron cargar las ramas");
    }
    
    await loadRepoTreeAndReadme(repo, currentBranch);
}

async function loadRepoTreeAndReadme(repo, branch) {
    try {
        const cacheKey = `${repo.name}:${branch}`;
        let data = await getCachedTree(cacheKey);
        if (!data) {
            data = await fetchRepoTree(repo.name, branch);
            await setCachedTree(cacheKey, data);
        }
        const blobs = renderRepoTree(repo, data, (fileNode) => handleFileClick(fileNode, branch));
        
        // Cargar commits
        loadCommitsList(repo.name, branch);
        
        const readmeNode = blobs.find(f => f.path.toLowerCase() === 'readme.md');
        if (readmeNode) {
            loadReadme(repo.name, branch, readmeNode.path);
        } else {
            showViewerError('Selecciona un archivo', 'warning');
        }
    } catch (e) {
        showViewerError('Error al cargar la estructura del repositorio');
    }
}

function renderBranchDropdown(repo, branches) {
    const titleRow = document.querySelector('.modal__title-row');
    if (!titleRow) return;
    
    // Quitar dropdown viejo si existe
    document.getElementById('branch-select-container')?.remove();
    
    const container = document.createElement('div');
    container.id = 'branch-select-container';
    container.className = 'branch-select-wrapper';
    
    let options = '';
    branches.forEach(b => {
        const isSelected = b.name === currentBranch ? 'selected' : '';
        options += `<option value="${b.name}" ${isSelected}>${b.name}</option>`;
    });
    
    container.innerHTML = `
        <i data-lucide="git-branch" class="branch-icon"></i>
        <select id="branch-select">
            ${options}
        </select>
    `;
    
    titleRow.appendChild(container);
    if (window.lucide) window.lucide.createIcons();
    
    const select = document.getElementById('branch-select');
    select.onchange = async (e) => {
        currentBranch = e.target.value;
        const viewer = document.getElementById('code-viewer');
        viewer.innerHTML = '<div class="modal__loading"><i data-lucide="loader-2"></i><p class="modal__loading-text">Cargando rama...</p></div>';
        if (window.lucide) window.lucide.createIcons();
        await loadRepoTreeAndReadme(repo, currentBranch);
    };
}

async function loadCommitsList(repoName, branch) {
    const codeArea = document.getElementById('code-container');
    if (!codeArea) return;
    
    // Quitar panel de commits viejo si existe
    document.getElementById('commits-sidebar')?.remove();
    
    const commitsSidebar = document.createElement('div');
    commitsSidebar.id = 'commits-sidebar';
    commitsSidebar.className = 'commits-sidebar';
    commitsSidebar.innerHTML = '<div class="commits-loading">Cargando historial...</div>';
    
    // Insertarlo en el modal body junto al code-area
    const modalBody = document.querySelector('.modal__body');
    if (modalBody) {
        modalBody.appendChild(commitsSidebar);
    }
    
    try {
        const commits = await fetchCommits(repoName, branch);
        let listHtml = '<div class="commits-title"><i data-lucide="history"></i> Commits</div><div class="commits-list">';
        
        commits.forEach(c => {
            const date = new Date(c.commit.author.date).toLocaleDateString();
            const avatar = c.author ? `<img src="${c.author.avatar_url}" class="commit-avatar">` : '<div class="commit-avatar-placeholder"></div>';
            listHtml += `
                <div class="commit-item">
                    ${avatar}
                    <div class="commit-info">
                        <p class="commit-msg">${escapeHtml(c.commit.message)}</p>
                        <p class="commit-meta">${escapeHtml(c.commit.author.name)} · ${date}</p>
                    </div>
                </div>
            `;
        });
        listHtml += '</div>';
        commitsSidebar.innerHTML = listHtml;
        if (window.lucide) window.lucide.createIcons();
    } catch(e) {
        commitsSidebar.innerHTML = '<div class="commits-error">Error al cargar commits</div>';
    }
}

async function handleFileClick(element, branch) {
    const { repo, path } = element.dataset;
    currentFilePath = path;
    showFileLoading();
    try {
        const cacheKey = `${repo}:${branch}:${path}`;
        let content = await getCachedFile(cacheKey);
        if (!content) {
            content = await fetchFileContent(repo, branch, path);
            await setCachedFile(cacheKey, content);
        }
        renderFileContent(content, path, element);
    } catch (e) {
        showViewerError('Error al cargar archivo');
    }
}

async function loadReadme(repoName, branch, path) {
    try {
        const cacheKey = `readme:${repoName}:${branch}:${path}`;
        let content = await getCachedFile(cacheKey);
        if (!content) {
            content = await fetchFileContent(repoName, branch, path);
            await setCachedFile(cacheKey, content);
        }
        renderReadme(content);
    } catch (e) {
        showViewerError('No se pudo cargar el README.', 'warning');
    }
}

function handleCloneClick(url, btn) {
    copyCloneCommand(url, btn);
}


async function handleSaveFile() {
    if (!currentRepoInfo || !currentFilePath) return;
    
    const content = getCurrentEditorContent();
    if (content === null) return;
    
    const btn = document.getElementById('modal-save-btn');
    const originalContent = btn.innerHTML;
    btn.classList.add('is-saving');
    btn.disabled = true;
    
    const message = prompt('Escribe un mensaje para este commit:', `Update ${currentFilePath}`);
    if (message === null) {
        btn.classList.remove('is-saving');
        btn.disabled = false;
        return; // Cancelled
    }
    
    try {
        // Necesitamos el SHA actual del archivo para actualizarlo
        const treeData = await getCachedTree(`${currentRepoInfo.name}:${currentBranch}`);
        let sha = null;
        if (treeData) {
            const blob = treeData.tree.find(i => i.path === currentFilePath);
            if (blob) sha = blob.sha;
        }
        
        await saveFileContent(currentRepoInfo.name, currentBranch, currentFilePath, content, message, sha);
        
        // Actualizar la cache
        const cacheKey = `${currentRepoInfo.name}:${currentBranch}:${currentFilePath}`;
        await setCachedFile(cacheKey, content);
        
        btn.innerHTML = '<i data-lucide="check"></i> Guardado';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.classList.remove('is-saving');
            btn.disabled = false;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
        
        // Refrescar el historial de commits
        loadCommitsList(currentRepoInfo.name, currentBranch);
        
    } catch(err) {
        alert(`Error al guardar: ${err.message}`);
        btn.innerHTML = originalContent;
        btn.classList.remove('is-saving');
        btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
    }
}


async function handleNewFile() {
    if (!currentRepoInfo) return;
    const path = prompt('Introduce la ruta completa del nuevo archivo (ej: src/utils.js):');
    if (!path) return;
    
    try {
        await saveFileContent(currentRepoInfo.name, currentBranch, path, "// Nuevo archivo creado desde GerardOS\n", "Create " + path, null);
        
        // Invalidar cache del árbol para forzar recarga
        const cacheKey = `${currentRepoInfo.name}:${currentBranch}`;
        await setCachedTree(cacheKey, null);
        
        await loadRepoTreeAndReadme(currentRepoInfo, currentBranch);
        alert(`Archivo ${path} creado con éxito.`);
    } catch(err) {
        alert(`Error al crear archivo: ${err.message}`);
    }
}

async function handleDeleteFile() {
    if (!currentRepoInfo || !currentFilePath) {
        alert("Selecciona primero un archivo para eliminarlo.");
        return;
    }
    
    const confirmDelete = confirm(`⚠️ ¿Estás seguro de eliminar PERMANENTEMENTE el archivo '${currentFilePath}'?`);
    if (!confirmDelete) return;
    
    try {
        const treeData = await getCachedTree(`${currentRepoInfo.name}:${currentBranch}`);
        let sha = null;
        if (treeData) {
            const blob = treeData.tree.find(i => i.path === currentFilePath);
            if (blob) sha = blob.sha;
        }
        
        if (!sha) {
            alert("No se pudo obtener el SHA del archivo.");
            return;
        }
        
        await deleteFile(currentRepoInfo.name, currentBranch, currentFilePath, "Delete " + currentFilePath, sha);
        
        // Invalidar caches
        await setCachedTree(`${currentRepoInfo.name}:${currentBranch}`, null);
        await setCachedFile(`${currentRepoInfo.name}:${currentBranch}:${currentFilePath}`, null);
        
        document.getElementById('code-viewer').innerHTML = '<i data-lucide="mouse-pointer"></i><p>Selecciona un archivo</p>';
        if (window.lucide) window.lucide.createIcons();
        currentFilePath = null;
        
        await loadRepoTreeAndReadme(currentRepoInfo, currentBranch);
        
    } catch(err) {
        alert(`Error al eliminar: ${err.message}`);
    }
}

// Kanban Logic

async function loadKanbanIssues() {
    if (!currentRepoInfo) return;
    try {
        const issues = await fetchIssues(currentRepoInfo.name);
        
        const todoContainer = document.getElementById('kanban-todo');
        const progressContainer = document.getElementById('kanban-progress');
        const doneContainer = document.getElementById('kanban-done');
        
        todoContainer.innerHTML = '';
        progressContainer.innerHTML = '';
        doneContainer.innerHTML = '';
        
        issues.forEach(issue => {
            // No mostrar Pull Requests
            if (issue.pull_request) return;
            
            // Determinar columna basada en labels o estado
            let col = todoContainer;
            if (issue.state === 'closed') {
                col = doneContainer;
            } else if (issue.labels.some(l => l.name.toLowerCase().includes('progress') || l.name.toLowerCase().includes('doing'))) {
                col = progressContainer;
            }
            
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.number = issue.number;
            
            card.innerHTML = `
                <div class="kanban-card-title">${escapeHtml(issue.title)}</div>
                <div class="kanban-card-meta">
                    <span>#${issue.number}</span>
                    <span>${issue.comments} 💬</span>
                </div>
            `;
            
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', issue.number);
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            
            col.appendChild(card);
        });
        
    } catch (e) {
        console.error("Error al cargar issues", e);
    }
}

async function handleNewIssue() {
    if (!currentRepoInfo) return;
    const title = prompt('Título de la nueva tarea:');
    if (!title) return;
    const body = prompt('Descripción (opcional):');
    try {
        await createIssue(currentRepoInfo.name, title, body || '');
        await loadKanbanIssues();
    } catch (e) {
        alert('Error al crear la tarea: ' + e.message);
    }
}

function setupKanbanDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-col');
    columns.forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', e => {
            col.classList.remove('drag-over');
        });
        col.addEventListener('drop', async e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            
            const dragging = document.querySelector('.dragging');
            const originalParent = dragging ? dragging.parentElement : null;
            if (dragging) col.querySelector('.kanban-cards').appendChild(dragging);
            const number = e.dataTransfer.getData('text/plain');
            const state = col.dataset.state;
            
            try {
                if (state === 'closed') {
                    await updateIssue(currentRepoInfo.name, number, 'closed');
                } else if (state === 'in-progress') {
                    await updateIssue(currentRepoInfo.name, number, 'open', ['in-progress']);
                } else {
                    // back to open / todo
                    await updateIssue(currentRepoInfo.name, number, 'open', []);
                }
            } catch (err) {
                alert('Error al actualizar la tarea: ' + err.message);
                if (dragging && originalParent) originalParent.appendChild(dragging); // Revert UI
            }
        });
    });
}

// Actions Logic
async function loadActions() {
    if (!currentRepoInfo) return;
    const logContainer = document.getElementById('actions-log');
    if (!logContainer) return;
    
    logContainer.innerHTML = '> Obteniendo workflows desde GitHub Actions...\n';
    try {
        const data = await fetchActions(currentRepoInfo.name);
        
        if (!data.workflow_runs || data.workflow_runs.length === 0) {
            logContainer.innerHTML += '> No se encontraron ejecuciones de Actions.\n';
            return;
        }
        
        data.workflow_runs.forEach(run => {
            const statusColor = run.conclusion === 'success' ? '#00ff00' : (run.conclusion === 'failure' ? '#ff0000' : '#ffff00');
            const date = new Date(run.created_at).toLocaleString();
            const logLine = `\n[${date}] ${escapeHtml(run.name)} #${run.run_number}\n> Estado: <span style="color:${statusColor}">${run.status} - ${run.conclusion || 'pending'}</span>\n> Actor: ${escapeHtml(run.actor.login)}\n> Mensaje: ${escapeHtml(run.head_commit.message.split('\\n')[0])}\n----------------------------------------`;
            logContainer.innerHTML += logLine;
        });
        
    } catch (e) {
        logContainer.innerHTML += `\n> [ERROR] ${escapeHtml(e.message)}\n`;
    }
}

// Live Preview Logic
async function loadPreview() {
    if (!currentRepoInfo) return;
    const iframe = document.getElementById('preview-frame');
    if (!iframe) return;
    
    iframe.srcdoc = "<h3>Generando previsualización...</h3>";
    
    try {
        const cacheKeyTree = `${currentRepoInfo.name}:${currentBranch}`;
        const treeData = await getCachedTree(cacheKeyTree);
        if (!treeData) return;
        
        let htmlContent = "";
        let cssContent = "";
        let jsContent = "";
        
        // Buscar index.html, style.css, script.js
        for (const file of treeData.tree) {
            if (file.type !== 'blob') continue;
            const path = file.path.toLowerCase();
            
            if (path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js')) {
                const fCacheKey = `${currentRepoInfo.name}:${currentBranch}:${file.path}`;
                let content = await getCachedFile(fCacheKey);
                if (!content) {
                    content = await fetchFileContent(currentRepoInfo.name, currentBranch, file.path);
                    await setCachedFile(fCacheKey, content);
                }
                
                if (path === 'index.html' || path.endsWith('/index.html')) {
                    htmlContent = content;
                } else if (path.endsWith('.css')) {
                    cssContent += `\n/* ${path} */\n${content}`;
                } else if (path.endsWith('.js')) {
                    jsContent += `\n/* ${path} */\n${content}`;
                }
            }
        }
        
        if (!htmlContent) {
            iframe.srcdoc = "<h3 style='font-family:sans-serif;padding:20px'>No se encontró ningún archivo .html en el repositorio.</h3>";
            return;
        }
        
        // Inyectar CSS y JS en el HTML
        let finalHtml = htmlContent;
        if (cssContent) {
            finalHtml = finalHtml.replace('</head>', `<style>${cssContent}</style></head>`);
        }
        if (jsContent) {
            finalHtml = finalHtml.replace('</body>', `<script>${jsContent}</script></body>`);
        }
        
        iframe.srcdoc = finalHtml;
        
    } catch (e) {
        iframe.srcdoc = `<h3 style='color:red;padding:20px'>Error al cargar preview: ${e.message}</h3>`;
    }
}

function handleLoadMore() {
    const s = getState();
    const newCount = s.visibleCount + 9;
    setState({ visibleCount: newCount });
    renderRepos(s.filteredRepos, true, '', handleCardClick, handleCloneClick);
}

// Command Palette Logic
function initCommandPalette() {
    const cmdInput = document.getElementById('cmd-input');
    const resultsContainer = document.getElementById('palette-results');
    
    if (!cmdInput || !resultsContainer) return;
    
    cmdInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        resultsContainer.innerHTML = '';
        
        if (!query) return;
        
        const s = getState();
        const repos = s.allRepos;
        
        let html = '';
        let count = 0;
        
        // Buscar repositorios
        repos.forEach(r => {
            if (count > 5) return;
            if (r.name.toLowerCase().includes(query)) {
                html += `
                <div class="palette-item" data-repo-name="${escapeHtml(r.name).replace(/"/g, '&quot;')}" onclick="window.openRepoFromPalette(this.getAttribute('data-repo-name'))">
                    <i data-lucide="book" class="palette-item-icon" style="width:16px;height:16px"></i>
                    <span class="palette-item-title">${escapeHtml(r.name)}</span>
                </div>`;
                count++;
            }
        });
        
        // Comandos de sistema
        const commands = [
            { id: 'settings', icon: 'settings', title: 'Abrir Ajustes' },
            { id: 'new-repo', icon: 'plus', title: 'Crear Repositorio' }
        ];
        
        commands.forEach(c => {
            if (c.title.toLowerCase().includes(query)) {
                html += `
                <div class="palette-item" onclick="window.runCommandFromPalette('${c.id}')">
                    <i data-lucide="${c.icon}" class="palette-item-icon" style="width:16px;height:16px"></i>
                    <span class="palette-item-title">${c.title}</span>
                </div>`;
            }
        });
        
        resultsContainer.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    });
}

// Exponer funciones globales para el Command Palette (ya que usan onclick HTML)
window.openRepoFromPalette = (repoName) => {
    document.getElementById('command-palette').classList.add('hidden');
    const s = getState();
    const repo = s.allRepos.find(r => r.name === repoName);
    if (repo) handleCardClick(repo);
};

window.runCommandFromPalette = (cmdId) => {
    document.getElementById('command-palette').classList.add('hidden');
    if (cmdId === 'new-repo') showCreateRepoModal();
    if (cmdId === 'settings') alert('Ajustes en construcción...');
};

// Modal Crear Repo
function showCreateRepoModal() {
    const modal = document.getElementById('create-repo-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('repo-name').focus();
    }
}

function hideCreateRepoModal() {
    const modal = document.getElementById('create-repo-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('create-repo-form').reset();
        document.getElementById('create-repo-error').textContent = '';
    }
}

async function handleCreateRepoSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('repo-name').value.trim();
    const desc = document.getElementById('repo-desc').value.trim();
    const isPrivate = document.getElementById('repo-private').checked;
    const errorEl = document.getElementById('create-repo-error');
    const btn = document.getElementById('create-repo-submit-btn');
    
    if (!name) {
        if (errorEl) errorEl.textContent = 'Introduce el nombre del repositorio';
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creando...';
    }
    if (errorEl) errorEl.textContent = '';
    
    try {
        const newRepo = await createRepo(name, desc, isPrivate);
        hideCreateRepoModal();
        showToast('Repositorio Creado', `El repo '${name}' se ha creado correctamente.`, 'success');
        
        // Actualización optimista
        const state = getState();
        if (state.allRepos) {
            const updatedAll = [newRepo, ...state.allRepos];
            setState({ allRepos: updatedAll });
            if (state.user) saveToCache(state.user, updatedAll);
            runFilterAndSearch();
        }
    } catch(err) {
        if (errorEl) errorEl.textContent = err.message;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Crear';
        }
    }
}

// Modal Eliminar Repo (Doble Confirmación)
async function triggerDeleteRepo(repoName) {
    const confirmName = prompt(`⚠️ ATENCIÓN: Estás a punto de eliminar permanentemente el repositorio '${repoName}'.\nEsta acción no se puede deshacer.\n\nEscribe el nombre del repositorio para confirmar:`);
    if (!confirmName) return;
    
    if (confirmName !== repoName) {
        alert("Confirmación fallida: El nombre introducido no coincide.");
        return;
    }
    
    showToast('Eliminando...', 'Borrando repositorio en GitHub', 'info');
    try {
        await deleteRepo(repoName, confirmName);
        showToast('Repositorio Eliminado', `El repo '${repoName}' ha sido eliminado.`, 'success');
        
        // Actualización optimista
        const state = getState();
        if (state.allRepos) {
            const updatedAll = state.allRepos.filter(r => r.name !== repoName);
            setState({ allRepos: updatedAll });
            if (state.user) saveToCache(state.user, updatedAll);
            runFilterAndSearch();
        }
    } catch(err) {
        alert(`Error al eliminar: ${err.message}`);
    }
}

async function triggerToggleVisibility(repoName, isCurrentlyPrivate) {
    const newPrivateState = !isCurrentlyPrivate;
    const actionText = newPrivateState ? 'Privado' : 'Público';
    
    if (!confirm(`¿Estás seguro de que quieres hacer el repositorio '${repoName}' ${actionText}?`)) {
        return;
    }
    
    console.log(`\n=== DEPURACIÓN: TOGGLE VISIBILITY ===`);
    console.log(`[1] Repo seleccionado:`, repoName);
    console.log(`[2] isCurrentlyPrivate local:`, isCurrentlyPrivate);
    console.log(`[3] Intentando cambiar a:`, newPrivateState);

    showToast('Actualizando...', `Haciendo repositorio ${actionText.toLowerCase()}...`, 'info');
    try {
        const updatedRepo = await updateRepoVisibility(repoName, newPrivateState);
        console.log(`[4] Respuesta de la API recibida.`);
        console.log(`[5] Valor de 'private' devuelto por GitHub:`, updatedRepo.private);
        console.log(`[6] Objeto devuelto entero:`, updatedRepo);
        
        showToast('Repositorio Actualizado', `El repo '${repoName}' ahora es ${actionText.toLowerCase()}.`, 'success');
        
        // Actualización optimista del estado local para reflejar el cambio de inmediato
        const state = getState();
        console.log(`[7] Buscando repo en el estado local...`);
        const localRepo = state.allRepos.find(r => r.name === repoName);
        console.log(`[8] Estado local antes del cambio:`, localRepo ? localRepo.private : 'No encontrado');
        
        if (state.allRepos) {
            const updatedAll = state.allRepos.map(r => r.name === repoName ? updatedRepo : r);
            setState({ allRepos: updatedAll });
            console.log(`[9] Estado actualizado en memoria.`);
            
            // Check other repos state
            const debugList = updatedAll.filter(r => r.private).map(r => r.name);
            console.log(`[10] Lista de repositorios privados AHORA en memoria:`, debugList);

            if (state.user) {
                saveToCache(state.user, updatedAll);
                console.log(`[11] Caché guardada.`);
            }
            runFilterAndSearch();
        }
    } catch(err) {
        console.error(`[ERROR] Toggle Visibility:`, err);
        alert(`Error al actualizar: ${err.message}`);
    }
}

function initStaticListeners() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    document.getElementById('load-more-btn').onclick = handleLoadMore;
    document.getElementById('search-input').oninput = debounce((e) => {
        runFilterAndSearch();
    }, 300);
    const toggleBtn = document.getElementById('toggle-filters-btn');
    const filtersRow = document.getElementById('filters-row');
    if (toggleBtn && filtersRow) {
        toggleBtn.onclick = () => {
            filtersRow.classList.toggle('hidden');
            toggleBtn.classList.toggle('active');
        };
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            hideCreateRepoModal();
        }
    });
    
    // Listener para el botón de Guardar
    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) saveBtn.onclick = handleSaveFile;
    
    // Listeners File Tree Toolbar
    const btnNewFile = document.getElementById('btn-new-file');
    if (btnNewFile) btnNewFile.onclick = handleNewFile;
    const btnDelFile = document.getElementById('btn-delete-file');
    if (btnDelFile) btnDelFile.onclick = handleDeleteFile;
    
    // Modal Tabs
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Desactivar todos
            document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });
            // Activar actual
            tab.classList.add('active');
            const target = document.getElementById(`tab-${tab.dataset.tab}`);
            if (target) {
                target.classList.add('active');
                target.style.display = tab.dataset.tab === 'code' ? 'flex' : 'flex';
                
                if (tab.dataset.tab === 'kanban') loadKanbanIssues();
                if (tab.dataset.tab === 'actions') loadActions();
                if (tab.dataset.tab === 'preview') loadPreview();
            }
        });
    });
    
    // Preview Refresh
    const btnRefreshPreview = document.getElementById('btn-refresh-preview');
    if (btnRefreshPreview) btnRefreshPreview.onclick = loadPreview;
    
    // Kanban New Task
    const btnNewIssue = document.getElementById('btn-new-issue');
    if (btnNewIssue) btnNewIssue.onclick = handleNewIssue;
    setupKanbanDragAndDrop();
    
    // Command Palette
    initCommandPalette();
    
    // Listeners Login
    const loginBtn = document.getElementById('mac-login-github-btn');
    if (loginBtn) loginBtn.onclick = handleLoginSubmit;
    
    // Listeners Logout
    const logoutBtn = document.getElementById('mac-logout-btn');
    if (logoutBtn) logoutBtn.onclick = logout;
    
    // Listeners Crear Repo
    const openCreateBtn = document.getElementById('btn-open-create-repo');
    if (openCreateBtn) openCreateBtn.onclick = showCreateRepoModal;
    
    const cancelCreateBtn = document.getElementById('create-repo-cancel-btn');
    if (cancelCreateBtn) cancelCreateBtn.onclick = hideCreateRepoModal;
    
    document.getElementById('create-repo-form').onsubmit = handleCreateRepoSubmit;
}

function initScrollBtn() {
    const scrollBtn = document.getElementById('scroll-to-top');
    const winContent = document.getElementById('mac-window-content');
    const useWindowScroll = document.body.classList.contains('web-mode');
    if (winContent && !useWindowScroll) {
        scrollBtn.onclick = () => winContent.scrollTo({ top: 0, behavior: 'smooth' });
        setupScrollTimeout(winContent, scrollBtn);
    } else {
        scrollBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        setupScrollTimeout(window, scrollBtn);
    }
}

function setupScrollTimeout(target, btn) {
    let timeout;
    target.addEventListener('scroll', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const scrollY = target.scrollTop !== undefined ? target.scrollTop : window.scrollY;
            btn.style.opacity = scrollY > 300 ? '1' : '0';
            btn.style.pointerEvents = scrollY > 300 ? 'auto' : 'none';
        }, 100);
    });
}

function initClock() {
    updateMacClock();
    setInterval(updateMacClock, 30000);
}

function updateMacClock() {
    const el = document.getElementById('mac-clock');
    if (!el) return;
    const now = new Date();
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    el.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}  ${h}:${m}`;
}

function initWindowControls() {
    document.getElementById('mac-btn-close').onclick = () => {
        document.getElementById('mac-main-window').classList.add('mac-window--closed');
    };
    document.getElementById('mac-btn-minimize').onclick = () => {
        document.getElementById('mac-main-window').classList.toggle('mac-window--minimized');
    };
    document.getElementById('mac-btn-maximize').onclick = () => {
        document.getElementById('mac-main-window').classList.toggle('mac-window--fullscreen');
    };
}

function initDockActions() {
    document.getElementById('dock-home').onclick = () => {
        const winContent = document.getElementById('mac-window-content');
        if (winContent) winContent.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('mac-main-window').classList.remove('mac-window--closed', 'mac-window--minimized');
    };
    document.getElementById('dock-profile').onclick = () => {
        document.querySelector('.sidebar')?.scrollIntoView({ behavior: 'smooth' });
    };
    document.getElementById('dock-search').onclick = () => {
        const input = document.getElementById('search-input');
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input?.focus();
    };
    document.getElementById('dock-repos').onclick = () => {
        document.getElementById('repos-grid')?.scrollIntoView({ behavior: 'smooth' });
    };
}

function exposeGlobals() {
    window.closeModal = closeModal;
    window.applySorting = handleSortClick;
    window.filterByLang = handleFilterClick;
    window.forceRefreshData = () => {
        clearCache();
        location.reload();
    };
    window.deleteRepoGlobal = triggerDeleteRepo;
    window.toggleRepoVisibilityGlobal = triggerToggleVisibility;
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();
    initApp();
    initStaticListeners();
    initScrollBtn();
    initClock();
    initWindowControls();
    initDockActions();
    exposeGlobals();
});
