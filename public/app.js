/**
 * GerardOS Private Dashboard - Main Application
 * Unified and cleaned version - Removed macOS design code
 */

import { USERNAME, debounce, escapeHtml } from './modules/utils.js';
import { getState, setState, getCachedTree, setCachedTree, getCachedFile, setCachedFile } from './modules/state.js';
import { getCachedData, saveToCache, getExpiredCache, clearCache, fetchApiData, fetchFallbackData, fetchRepoTree, fetchFileContent, createRepo, deleteRepo, updateRepoVisibility, fetchCommits, fetchBranches, saveFileContent, deleteFile, fetchIssues, createIssue, updateIssue, fetchActions } from './modules/api.js';
import { renderProfile, calculateStats, setupFilters, showDataSourceIndicator, showToast, renderRepos, prepareRepoViewer, renderRepoTree, showFileLoading, renderFileContent, showViewerError, renderReadme, renderPortfolioIntelligence, closeModal, copyCloneCommand, hideLoading, showError, updateLoadingStatus, getCurrentEditorContent, showCustomAlert, showCustomConfirm, showCustomPrompt } from './modules/ui.js';
import { checkSession, login, logout } from './modules/auth.js';
import { initShortcuts } from './modules/shortcuts.js';
import { initAI } from './modules/ai_ui.js';
import { initFuturisticEngine } from './modules/futuristic.js';

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

function initShaderBackground() {
    const canvas = document.getElementById('shader-canvas-bg');
    if (!canvas) return;

    function syncSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }
    window.addEventListener('resize', syncSize);
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    vec2 uv = v_texCoord;
    float time = u_time * 0.15;
    
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;
    
    float noise = 0.0;
    for(float i = 1.0; i < 4.0; i++) {
        p += vec2(sin(p.y * 1.5 + time * i), cos(p.x * 1.5 + time * i)) * 0.5;
        noise += abs(sin(p.x + p.y + time)) / i;
    }
    
    vec3 color1 = vec3(0.055, 0.055, 0.06);
    vec3 color2 = vec3(0.075, 0.075, 0.08);
    vec3 accent = vec3(0.0, 0.48, 1.0) * 0.15;
    
    vec3 finalColor = mix(color1, color2, noise * 0.5);
    finalColor += accent * (sin(time + uv.y * 2.0) * 0.5 + 0.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
}`;

    function cs(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');

    function render(t) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (uTime) gl.uniform1f(uTime, t * 0.001);
        if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function initThreeJsHero() {
    const container = document.getElementById('threejs-hero-canvas');
    if (!container || !window.THREE) return;
    container.innerHTML = '';

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 250;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(1.2, 12);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0x007aff,
        metalness: 0.85,
        roughness: 0.15,
        transmission: 0.4,
        thickness: 0.5,
        clearcoat: 1.0
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const light = new THREE.DirectionalLight(0x4b8eff, 1.5);
    light.position.set(2, 2, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    camera.position.z = 2.8;

    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.001;
        mesh.rotation.y += 0.005;
        mesh.rotation.z += 0.003;
        mesh.scale.setScalar(1 + Math.sin(time) * 0.04);
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        if (!container) return;
        const w = container.clientWidth || 600;
        const h = container.clientHeight || 250;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    animate();
}

async function initApp() {
    initShaderBackground();
    setTimeout(() => initThreeJsHero(), 300);
    initShortcuts();
    initAI();
    initFuturisticEngine();
    loadVersionInfo();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
        const errType = urlParams.get('error');
        const details = urlParams.get('details');
        
        let msg = 'Ocurrió un error durante la autenticación.';
        if (errType === 'missing_config') msg = `Faltan variables de entorno en el servidor (${details}). Configúralas en Cloudflare Pages.`;
        if (errType === 'missing_code') msg = 'No se recibió el código de autorización de GitHub.';
        if (errType === 'invalid_state') msg = 'Error de seguridad: estado de sesión inválido o expirado.';
        
        showCustomAlert({ title: 'Error de Autenticación', message: msg, type: 'error' });
        
        if (errType === 'missing_config') {
            const loginView = document.getElementById('login-view');
            if (loginView) {
                const btn = document.getElementById('login-github-btn') || document.getElementById('mac-login-github-btn');
                if (btn && btn.parentElement) {
                    const errorBox = document.createElement('div');
                    errorBox.className = 'mt-4 p-4 rounded-lg bg-error/10 border border-error/30 text-error text-sm text-left shadow-inner';
                    errorBox.innerHTML = `<strong>⚠️ Configuración Faltante:</strong><br>La app no funcionará en este entorno hasta que añadas las variables de entorno en la pestaña <em>Production</em> de Cloudflare Pages.`;
                    btn.parentElement.appendChild(errorBox);
                }
            }
        }
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
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
    const loginScreen = document.getElementById('login-view');
    const hubView = document.getElementById('hub-view');
    const ideView = document.getElementById('ide-view');
    const loadingScreen = document.getElementById('loading');

    if (loadingScreen) loadingScreen.style.opacity = '0';
    setTimeout(() => {
        if (loadingScreen) loadingScreen.style.display = 'none';
    }, 300);

    if (hubView) hubView.classList.add('hidden');
    if (ideView) ideView.classList.add('hidden');
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
}

function hideLoginScreen() {
    const loginScreen = document.getElementById('login-view');
    const hubView = document.getElementById('hub-view');

    if (loginScreen) loginScreen.classList.add('hidden');
    if (hubView) hubView.classList.remove('hidden');
}

window.openIdeView = function() {
    const hubView = document.getElementById('hub-view');
    const ideView = document.getElementById('ide-view');
    if (hubView) hubView.classList.add('hidden');
    if (ideView) ideView.classList.remove('hidden');
};

window.closeIdeView = function() {
    closeModal();
};

async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('login-github-btn') || document.getElementById('mac-login-github-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="login-spinner"></span> Redirigiendo a GitHub...';
    }
    login();
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
        console.warn('Fallo la API o caché expirada, intentando fallback...', apiError);
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
    const indexedRepos = repos.map(repo => ({
        ...repo,
        _lowerName: repo.name ? repo.name.toLowerCase() : '',
        _lowerDesc: repo.description ? repo.description.toLowerCase() : '',
        _pushedTime: repo.pushed_at ? new Date(repo.pushed_at).getTime() : 0,
        _updatedTime: (repo.updated_at || repo.pushed_at) ? new Date(repo.updated_at || repo.pushed_at).getTime() : 0
    }));

    setState({ user: user, allRepos: indexedRepos, filteredRepos: indexedRepos });
    renderProfile(user);
    calculateStats(indexedRepos);
    renderPortfolioIntelligence(indexedRepos);
    setupFilters(indexedRepos, handleFilterClick);
    renderRepos(indexedRepos, false, '', handleCardClick, handleCloneClick);
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
    const input = document.getElementById('search-input');
    const term = input ? input.value.toLowerCase().trim() : '';
    const lang = s.currentLangFilter;

    const filtered = s.allRepos.filter(repo => {
        if (lang !== 'all' && repo.language !== lang) return false;
        if (!term) return true;
        return repo._lowerName.includes(term) || repo._lowerDesc.includes(term);
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
    if (sortBy === 'updated') return sorted.sort((a, b) => b._updatedTime - a._updatedTime);
    return sorted.sort((a, b) => b._pushedTime - a._pushedTime);
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

    try {
        const branches = await fetchBranches(repo.name);
        renderBranchDropdown(repo, branches);
    } catch (e) {
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
        const blobs = renderRepoTree(repo, data, (fileNode) => handleFileClick(fileNode, branch), branch);

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
    const titleRow = document.querySelector('.modal__title-row') || document.getElementById('ide-header');
    if (!titleRow) return;

    document.getElementById('branch-select-container')?.remove();

    const container = document.createElement('div');
    container.id = 'branch-select-container';
    container.className = 'branch-select-wrapper';

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'git-branch');
    icon.className = 'branch-icon';

    const select = document.createElement('select');
    select.id = 'branch-select';
    branches.forEach(b => {
        const option = document.createElement('option');
        option.value = b.name;
        option.textContent = b.name;
        option.selected = b.name === currentBranch;
        select.appendChild(option);
    });

    container.appendChild(icon);
    container.appendChild(select);
    titleRow.appendChild(container);
    if (window.lucide) window.lucide.createIcons();

    select.onchange = async (e) => {
        currentBranch = e.target.value;
        const viewer = document.getElementById('code-viewer');
        viewer.innerHTML = '<div class="modal__loading"><span class="material-symbols-outlined" style="font-size: 2rem; animation: spin 1s linear infinite;">progress_activity</span><p class="modal__loading-text">Cargando rama...</p></div>';
        await loadRepoTreeAndReadme(repo, currentBranch);
    };
}

async function loadCommitsList(repoName, branch) {
    const codeArea = document.getElementById('code-container');
    if (!codeArea) return;

    document.getElementById('commits-sidebar')?.remove();

    const commitsSidebar = document.createElement('div');
    commitsSidebar.id = 'commits-sidebar';
    commitsSidebar.className = 'commits-sidebar';
    commitsSidebar.innerHTML = '<div class="commits-loading">Cargando historial...</div>';

    const modalBody = document.querySelector('.modal__body') || document.getElementById('ide-view');
    if (modalBody) {
        modalBody.appendChild(commitsSidebar);
    }

    try {
        const commits = await fetchCommits(repoName, branch);
        let listHtml = '<div class="commits-title"><span class="material-symbols-outlined">history</span> Commits</div><div class="commits-list">';

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
    } catch (e) {
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

    const message = await showCustomPrompt({
        title: 'Guardar Cambios (Commit)',
        icon: 'git-commit',
        message: `Introduce un mensaje para guardar los cambios en "${currentFilePath}":`,
        fields: [{ name: 'commitMsg', label: 'Mensaje de commit', value: `Update ${currentFilePath}`, required: true }],
        confirmText: 'Guardar Commit',
        cancelText: 'Cancelar'
    });

    if (!message) return;

    btn.classList.add('is-saving');
    btn.disabled = true;

    try {
        const treeData = await getCachedTree(`${currentRepoInfo.name}:${currentBranch}`);
        let sha = null;
        if (treeData) {
            const blob = treeData.tree.find(i => i.path === currentFilePath);
            if (blob) sha = blob.sha;
        }

        await saveFileContent(currentRepoInfo.name, currentBranch, currentFilePath, content, message, sha);

        const cacheKey = `${currentRepoInfo.name}:${currentBranch}:${currentFilePath}`;
        await setCachedFile(cacheKey, content);

        btn.innerHTML = '<span class="material-symbols-outlined">check</span> Guardado';
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.classList.remove('is-saving');
            btn.disabled = false;
        }, 2000);

        loadCommitsList(currentRepoInfo.name, currentBranch);
        showToast('Guardado', `Cambios en '${currentFilePath}' guardados con éxito.`, 'success');

    } catch (err) {
        await showCustomAlert({
            title: 'Error al Guardar',
            icon: 'alert-circle',
            message: `No se pudo guardar el archivo: ${err.message}`,
            type: 'error'
        });
        btn.innerHTML = originalContent;
        btn.classList.remove('is-saving');
        btn.disabled = false;
    }
}

async function handleNewFile() {
    if (!currentRepoInfo) return;
    const path = await showCustomPrompt({
        title: 'Crear Nuevo Archivo',
        icon: 'file-plus',
        message: 'Introduce la ruta completa y nombre del nuevo archivo:',
        fields: [{ name: 'filePath', label: 'Ruta del archivo', placeholder: 'ej. src/utils.js', required: true }],
        confirmText: 'Crear Archivo',
        cancelText: 'Cancelar'
    });
    if (!path) return;

    try {
        await saveFileContent(currentRepoInfo.name, currentBranch, path, "// Nuevo archivo creado desde GerardOS\n", "Create " + path, null);
        const cacheKey = `${currentRepoInfo.name}:${currentBranch}`;
        await setCachedTree(cacheKey, null);
        await loadRepoTreeAndReadme(currentRepoInfo, currentBranch);
        showToast('Archivo Creado', `El archivo '${path}' ha sido creado con éxito.`, 'success');
    } catch (err) {
        await showCustomAlert({
            title: 'Error al Crear Archivo',
            icon: 'alert-circle',
            message: `No se pudo crear el archivo: ${err.message}`,
            type: 'error'
        });
    }
}

async function handleDeleteFile() {
    if (!currentRepoInfo || !currentFilePath) {
        await showCustomAlert({
            title: 'Archivo no Seleccionado',
            icon: 'info',
            message: 'Selecciona primero un archivo para poder eliminarlo.',
            type: 'warning'
        });
        return;
    }

    const confirmDelete = await showCustomConfirm({
        title: 'Eliminar Archivo',
        icon: 'trash-2',
        message: `¿Estás seguro de eliminar PERMANENTEMENTE el archivo '${currentFilePath}'?`,
        confirmText: 'Eliminar Archivo',
        cancelText: 'Cancelar',
        isDanger: true
    });
    if (!confirmDelete) return;

    try {
        const treeData = await getCachedTree(`${currentRepoInfo.name}:${currentBranch}`);
        let sha = null;
        if (treeData) {
            const blob = treeData.tree.find(i => i.path === currentFilePath);
            if (blob) sha = blob.sha;
        }

        if (!sha) {
            await showCustomAlert({
                title: 'SHA no Encontrado',
                icon: 'alert-circle',
                message: 'No se pudo obtener el hash SHA del archivo para eliminarlo.',
                type: 'error'
            });
            return;
        }

        await deleteFile(currentRepoInfo.name, currentBranch, currentFilePath, "Delete " + currentFilePath, sha);
        await setCachedTree(`${currentRepoInfo.name}:${currentBranch}`, null);
        await setCachedFile(`${currentRepoInfo.name}:${currentBranch}:${currentFilePath}`, null);

        document.getElementById('code-viewer').innerHTML = '<span class="material-symbols-outlined">mouse_pointer</span><p>Selecciona un archivo</p>';
        currentFilePath = null;

        await loadRepoTreeAndReadme(currentRepoInfo, currentBranch);
        showToast('Archivo Eliminado', `El archivo ha sido eliminado.`, 'success');

    } catch (err) {
        await showCustomAlert({
            title: 'Error al Eliminar',
            icon: 'alert-circle',
            message: `No se pudo eliminar el archivo: ${err.message}`,
            type: 'error'
        });
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
            if (issue.pull_request) return;

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
    const taskData = await showCustomPrompt({
        title: 'Nueva Tarea (Issue)',
        icon: 'plus-circle',
        message: 'Introduce los detalles de la nueva tarea para el tablero Kanban:',
        fields: [
            { name: 'title', label: 'Título de la tarea', placeholder: 'ej. Implementar autenticación', required: true },
            { name: 'body', label: 'Descripción (opcional)', placeholder: 'Detalles adicionales...', textarea: true }
        ],
        confirmText: 'Crear Tarea',
        cancelText: 'Cancelar'
    });

    if (!taskData || !taskData.title) return;

    try {
        await createIssue(currentRepoInfo.name, taskData.title, taskData.body || '');
        await loadKanbanIssues();
        showToast('Tarea Creada', `La tarea "${taskData.title}" se ha creado con éxito.`, 'success');
    } catch (e) {
        await showCustomAlert({
            title: 'Error al Crear Tarea',
            icon: 'alert-circle',
            message: `No se pudo crear la tarea: ${e.message}`,
            type: 'error'
        });
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
                    await updateIssue(currentRepoInfo.name, number, 'open', []);
                }
            } catch (err) {
                await showCustomAlert({
                    title: 'Error al Mover Tarea',
                    icon: 'alert-circle',
                    message: `No se pudo actualizar el estado de la tarea: ${err.message}`,
                    type: 'error'
                });
                if (dragging && originalParent) originalParent.appendChild(dragging);
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
            const logLine = `\n[${date}] ${escapeHtml(run.name)} #${run.run_number}\n> Estado: <span style="color:${statusColor}">${run.status} - ${run.conclusion || 'pending'}</span>\n> Actor: ${escapeHtml(run.actor.login)}\n> Mensaje: ${escapeHtml(run.head_commit.message.split('\n')[0])}\n----------------------------------------`;
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

        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.referrerPolicy = 'no-referrer';

        if (!htmlContent) {
            iframe.srcdoc = "<h3>No se encontró ningún archivo .html en el repositorio.</h3>";
            return;
        }

        let finalHtml = htmlContent;
        if (cssContent) {
            finalHtml = finalHtml.replace('</head>', `<style>${cssContent}</style></head>`);
        }
        if (jsContent) {
            finalHtml = finalHtml.replace('</body>', `<script>${jsContent}</script></body>`);
        }

        const previewCsp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'">`;
        iframe.srcdoc = finalHtml.includes('<head>') ? finalHtml.replace('<head>', `<head>${previewCsp}`) : `${previewCsp}${finalHtml}`;

    } catch (e) {
        iframe.srcdoc = '<h3>Error al cargar preview.</h3>';
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

        repos.forEach(r => {
            if (count > 5) return;
            if (r.name.toLowerCase().includes(query)) {
                html += `
                <div class="palette-item" data-repo-name="${escapeHtml(r.name).replace(/\"/g, '&quot;')}" onclick="window.openRepoFromPalette(this.getAttribute('data-repo-name'))">
                    <span class="material-symbols-outlined palette-item-icon" style="width:16px;height:16px">book</span>
                    <span class="palette-item-title">${escapeHtml(r.name)}</span>
                </div>`;
                count++;
            }
        });

        const commands = [
            { id: 'settings', icon: 'settings', title: 'Abrir Ajustes' },
            { id: 'new-repo', icon: 'plus', title: 'Crear Repositorio' }
        ];

        commands.forEach(c => {
            if (c.title.toLowerCase().includes(query)) {
                html += `
                <div class="palette-item" onclick="window.runCommandFromPalette('${c.id}')">
                    <span class="material-symbols-outlined palette-item-icon" style="width:16px;height:16px">${c.icon}</span>
                    <span class="palette-item-title">${c.title}</span>
                </div>`;
            }
        });

        resultsContainer.innerHTML = html;
    });
}

// Exponer funciones globales para el Command Palette
window.openRepoFromPalette = (repoName) => {
    document.getElementById('command-palette').classList.add('hidden');
    const s = getState();
    const repo = s.allRepos.find(r => r.name === repoName);
    if (repo) handleCardClick(repo);
};

window.runCommandFromPalette = (cmdId) => {
    document.getElementById('command-palette').classList.add('hidden');
    if (cmdId === 'new-repo') showCreateRepoModal();
    if (cmdId === 'settings') {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.remove('hidden');
    }
};

// Modal Crear Repo
function showCreateRepoModal() {
    const modal = document.getElementById('create-repo-modal');
    if (modal) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => document.getElementById('repo-name')?.focus());
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

        const state = getState();
        if (state.allRepos) {
            const updatedAll = [newRepo, ...state.allRepos];
            setState({ allRepos: updatedAll });
            if (state.user) saveToCache(state.user, updatedAll);
            runFilterAndSearch();
        }
    } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Crear';
        }
    }
}

// Modal Eliminar Repo
async function triggerDeleteRepo(repoName) {
    const confirmName = await showCustomPrompt({
        title: 'Eliminar Repositorio',
        icon: 'trash-2',
        message: `ATENCIÓN: Estás a punto de eliminar permanentemente el repositorio '${repoName}'. Esta acción no se puede deshacer.`,
        fields: [
            { name: 'repoConfirm', label: `Escribe "${repoName}" para confirmar:`, placeholder: repoName, required: true }
        ],
        confirmText: 'Eliminar Repositorio',
        cancelText: 'Cancelar',
        isDanger: true,
        validate: (value) => {
            if (value !== repoName) {
                return `El nombre introducido ("${value}") no coincide con "${repoName}".`;
            }
            return null;
        }
    });

    if (!confirmName) return;

    showToast('Eliminando...', 'Borrando repositorio en GitHub', 'info');
    try {
        await deleteRepo(repoName, confirmName);
        showToast('Repositorio Eliminado', `El repo '${repoName}' ha sido eliminado.`, 'success');

        const state = getState();
        if (state.allRepos) {
            const updatedAll = state.allRepos.filter(r => r.name !== repoName);
            setState({ allRepos: updatedAll });
            if (state.user) saveToCache(state.user, updatedAll);
            runFilterAndSearch();
        }
    } catch (err) {
        if (err.message.includes('delete_repo') || err.message.includes('403') || err.message.includes('permiso') || err.message.includes('admin')) {
            const relogin = await showCustomConfirm({
                title: 'Renovar Permisos en GitHub',
                icon: 'key',
                message: `GitHub ha denegado la solicitud de borrado por permisos:\n${err.message}\n\n¿Deseas volver a iniciar sesión con GitHub para otorgar el nuevo permiso 'delete_repo'?`,
                confirmText: 'Re-iniciar Sesión',
                cancelText: 'Cerrar'
            });
            if (relogin) {
                login();
                return;
            }
        } else {
            await showCustomAlert({
                title: 'Error al Eliminar Repositorio',
                icon: 'alert-circle',
                message: err.message,
                type: 'error'
            });
        }
    }
}

async function triggerToggleVisibility(repoName, isCurrentlyPrivate) {
    const newPrivateState = !isCurrentlyPrivate;
    const actionText = newPrivateState ? 'Privado 🔒' : 'Público 🌐';

    const confirmToggle = await showCustomConfirm({
        title: 'Cambiar Visibilidad',
        icon: newPrivateState ? 'lock' : 'globe',
        message: `¿Estás seguro de que quieres hacer el repositorio '${repoName}' ${actionText}?`,
        confirmText: `Hacer ${newPrivateState ? 'Privado' : 'Público'}`,
        cancelText: 'Cancelar'
    });

    if (!confirmToggle) return;

    showToast('Actualizando...', `Haciendo repositorio ${newPrivateState ? 'privado' : 'público'}...`, 'info');
    try {
        const updatedRepo = await updateRepoVisibility(repoName, newPrivateState);
        showToast('Repositorio Actualizado', `El repo '${repoName}' ahora es ${newPrivateState ? 'privado' : 'público'}.`, 'success');

        const state = getState();
        if (state.allRepos) {
            const updatedAll = state.allRepos.map(r => r.name === repoName ? updatedRepo : r);
            setState({ allRepos: updatedAll });
            if (state.user) saveToCache(state.user, updatedAll);
            runFilterAndSearch();
        }
    } catch (err) {
        await showCustomAlert({
            title: 'Error de Visibilidad',
            icon: 'alert-circle',
            message: `No se pudo cambiar la visibilidad: ${err.message}`,
            type: 'error'
        });
    }
}

function initStaticListeners() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.onclick = handleLoadMore;

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.oninput = debounce(() => runFilterAndSearch(), 300);

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

    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) saveBtn.onclick = handleSaveFile;

    const btnNewFile = document.getElementById('btn-new-file');
    if (btnNewFile) btnNewFile.onclick = handleNewFile;

    const btnDelFile = document.getElementById('btn-delete-file');
    if (btnDelFile) btnDelFile.onclick = handleDeleteFile;

    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });
            tab.classList.add('active');
            const target = document.getElementById(`tab-${tab.dataset.tab}`);
            if (target) {
                target.classList.add('active');
                target.style.display = 'flex';

                if (tab.dataset.tab === 'kanban') loadKanbanIssues();
                if (tab.dataset.tab === 'actions') loadActions();
                if (tab.dataset.tab === 'preview') loadPreview();
            }
        });
    });

    const btnRefreshPreview = document.getElementById('btn-refresh-preview');
    if (btnRefreshPreview) btnRefreshPreview.onclick = loadPreview;

    const btnNewIssue = document.getElementById('btn-new-issue');
    if (btnNewIssue) btnNewIssue.onclick = handleNewIssue;
    setupKanbanDragAndDrop();

    initCommandPalette();

    const loginBtn = document.getElementById('login-github-btn') || document.getElementById('mac-login-github-btn');
    if (loginBtn) loginBtn.onclick = handleLoginSubmit;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = logout;

    const logoutBtnDesktop = document.getElementById('logout-btn-desktop');
    if (logoutBtnDesktop) logoutBtnDesktop.onclick = logout;

    const openCreateBtn = document.getElementById('btn-open-create-repo');
    if (openCreateBtn) openCreateBtn.onclick = showCreateRepoModal;

    const cancelCreateBtn = document.getElementById('create-repo-cancel-btn');
    if (cancelCreateBtn) cancelCreateBtn.onclick = hideCreateRepoModal;

    const createForm = document.getElementById('create-repo-form');
    if (createForm) createForm.onsubmit = handleCreateRepoSubmit;

    // Initialize scroll to top button
    initScrollToTop();
}

function initScrollToTop() {
    const scrollBtn = document.getElementById('scroll-to-top');
    if (!scrollBtn) return;

    scrollBtn.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    let timeout;
    window.addEventListener('scroll', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const scrollY = window.scrollY;
            scrollBtn.style.opacity = scrollY > 300 ? '1' : '0';
            scrollBtn.style.pointerEvents = scrollY > 300 ? 'auto' : 'none';
        }, 100);
    });
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
    window.clearAppCache = async () => {
        const confirmed = await showCustomConfirm({
            title: 'Borrar Caché Local',
            icon: 'database',
            message: '¿Estás seguro de que deseas borrar toda la caché local de IndexedDB? La página se recargará.',
            confirmText: 'Borrar Caché',
            cancelText: 'Cancelar',
            isDanger: true
        });
        if (confirmed) {
            clearCache();
            const req = indexedDB.deleteDatabase('keyval-store');
            req.onsuccess = () => location.reload();
            req.onerror = () => location.reload();
            req.onblocked = () => location.reload();
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();
    initApp();
    initStaticListeners();
    exposeGlobals();
});
