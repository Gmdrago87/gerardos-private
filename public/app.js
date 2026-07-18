import { USERNAME, debounce } from './modules/utils.js';
import { getState, setState, getCachedTree, setCachedTree, getCachedFile, setCachedFile } from './modules/state.js';
import { getCachedData, saveToCache, getExpiredCache, clearCache, fetchApiData, fetchFallbackData, fetchRepoTree, fetchFileContent, createRepo, deleteRepo, fetchCommits, fetchBranches } from './modules/api.js';
import { renderProfile, calculateStats, setupFilters, showDataSourceIndicator, showToast, renderRepos, prepareRepoViewer, renderRepoTree, showFileLoading, renderFileContent, showViewerError, renderReadme, closeModal, copyCloneCommand, hideLoading, showError, updateLoadingStatus } from './modules/ui.js';
import { checkSession, login, logout } from './modules/auth.js';

async function initApp() {
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
        const pwdInput = document.getElementById('mac-login-password');
        pwdInput?.focus();
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
    const pwdInput = document.getElementById('mac-login-password');
    const errorEl = document.getElementById('mac-login-error');
    const btn = document.getElementById('mac-login-btn');
    
    if (!pwdInput) return;
    const password = pwdInput.value;
    
    if (!password) {
        if (errorEl) errorEl.textContent = 'Introduce tu contraseña';
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="login-spinner"></span> Verificando...';
    }
    if (errorEl) errorEl.textContent = '';
    
    const result = await login(password);
    
    if (result.ok) {
        hideLoginScreen();
        // Mostrar cargador del sistema de nuevo
        const loadingScreen = document.getElementById('loading');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
        await initApp();
    } else {
        if (errorEl) errorEl.textContent = result.error || 'Contraseña incorrecta';
        pwdInput.value = '';
        pwdInput.focus();
        
        // Efecto de vibración (shake) en la ventana de login
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.classList.add('shake-anim');
            setTimeout(() => {
                loginCard.classList.remove('shake-anim');
            }, 500);
        }
    }
    
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Acceder';
    }
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
    setState({ allRepos: repos, filteredRepos: repos });
    renderProfile(user);
    calculateStats(repos);
    setupFilters(repos, handleFilterClick);
    renderRepos(repos, false, '', handleCardClick, handleCloneClick);
    showDataSourceIndicator(source);
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

async function handleCardClick(repo) {
    currentBranch = repo.default_branch || 'main';
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
        let data = getCachedTree(cacheKey);
        if (!data) {
            data = await fetchRepoTree(repo.name, branch);
            setCachedTree(cacheKey, data);
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
                        <p class="commit-msg">${c.commit.message}</p>
                        <p class="commit-meta">${c.commit.author.name} · ${date}</p>
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
    showFileLoading();
    try {
        const cacheKey = `${repo}:${branch}:${path}`;
        let content = getCachedFile(cacheKey);
        if (!content) {
            content = await fetchFileContent(repo, branch, path);
            setCachedFile(cacheKey, content);
        }
        renderFileContent(content, path, element);
    } catch (e) {
        showViewerError('Error al cargar archivo');
    }
}

async function loadReadme(repoName, branch, path) {
    try {
        const cacheKey = `readme:${repoName}:${branch}:${path}`;
        let content = getCachedFile(cacheKey);
        if (!content) {
            content = await fetchFileContent(repoName, branch, path);
            setCachedFile(cacheKey, content);
        }
        renderReadme(content);
    } catch (e) {
        showViewerError('No se pudo cargar el README.', 'warning');
    }
}

function handleCloneClick(url, btn) {
    copyCloneCommand(url, btn);
}

function handleLoadMore() {
    const s = getState();
    const newCount = s.visibleCount + 9;
    setState({ visibleCount: newCount });
    renderRepos(s.filteredRepos, true, '', handleCardClick, handleCloneClick);
}

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
        await createRepo(name, desc, isPrivate);
        hideCreateRepoModal();
        showToast('Repositorio Creado', `El repo '${name}' se ha creado correctamente.`, 'success');
        
        // Forzar actualización de datos
        clearCache();
        await fetchFreshOrFallback();
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
        
        // Forzar actualización de datos
        clearCache();
        await fetchFreshOrFallback();
    } catch(err) {
        alert(`Error al eliminar: ${err.message}`);
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
    
    // Listeners Login
    document.getElementById('mac-login-form').onsubmit = handleLoginSubmit;
    
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
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW registered:', reg))
                .catch(err => console.error('SW registration failed:', err));
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initStaticListeners();
    initScrollBtn();
    initClock();
    initWindowControls();
    initDockActions();
    exposeGlobals();
    registerServiceWorker();
});
