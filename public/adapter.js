/**
 * DevRepo - Apple Style Adapter
 * This file adapts the existing functionality to work with the new Apple-style UI
 */

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
    const mainContent = document.querySelector('main');
    
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
    if (mainContent) {
        mainContent.style.opacity = '0.3';
    }
}

function hideLoginScreen() {
    const loginScreen = document.getElementById('mac-login-screen');
    const mainContent = document.querySelector('main');
    
    if (loginScreen) {
        loginScreen.classList.add('hidden');
    }
    if (mainContent) {
        mainContent.style.opacity = '1';
    }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastPanel = toast?.querySelector('.toast__panel');
    
    if (!toast || !toastPanel) return;
    
    const iconMap = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error_outline'
    };
    
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

// ===== SECTION NAVIGATION =====
function showSection(sectionName) {
    // This would be implemented based on your routing logic
    console.log('Showing section:', sectionName);
    // For now, just log - you can implement actual navigation later
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
        return;
    }
    
    // Render each repo card
    repos.forEach(repo => {
        const repoCard = createRepoCard(repo);
        reposGrid.appendChild(repoCard);
    });
}

function createRepoCard(repo) {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-xl p-6 magnetic-hover glass-panel-hover flex flex-col group cursor-pointer relative overflow-hidden h-48';
    card.onclick = () => openRepoModal(repo);
    
    // Add decorative gradient
    card.innerHTML = `
        <div class="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500 pointer-events-none"></div>
        <div class="flex justify-between items-start z-10">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 squircle-sm bg-surface-container-high flex items-center justify-center border border-white/5">
                    <span class="material-symbols-outlined text-primary text-[24px]">api</span>
                </div>
                <div>
                    <h3 class="font-headline-sm text-headline-sm text-white group-hover:text-primary transition-colors truncate">${repo.name || 'Untitled'}</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant truncate">${repo.language || 'Unknown'} • ${repo.description || 'No description'}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-label-mono text-label-mono text-on-surface-variant bg-white/5 px-2 py-1 rounded">v${repo.version || '1.0.0'}</span>
                <div class="flex items-center gap-1 text-secondary">
                    <span class="w-2 h-2 rounded-full status-dot-success"></span>
                    <span class="font-label-mono text-label-mono">Passing</span>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-4 mt-2 z-10 border-t border-white/5 pt-4">
            <div>
                <p class="font-label-mono text-label-mono text-on-surface-variant opacity-70 mb-1">LAST COMMIT</p>
                <p class="font-body-sm text-body-sm truncate text-white">${repo.lastCommit || 'Initial commit'}</p>
            </div>
            <div>
                <p class="font-label-mono text-label-mono text-on-surface-variant opacity-70 mb-1">LATENCY</p>
                <p class="font-body-sm text-body-sm text-white flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px] text-tertiary-container">trending_down</span> ${repo.latency || '12ms'}
                </p>
            </div>
            <div class="flex justify-end items-end">
                <div class="flex -space-x-2">
                    ${repo.contributors ? repo.contributors.map(c => `
                        <img alt="Contributor" class="w-6 h-6 rounded-full border border-surface-container-highest" src="${c.avatar}">
                    `).join('') : ''}
                    ${repo.contributors && repo.contributors.length > 3 ? `
                        <div class="w-6 h-6 rounded-full border border-surface-container-highest bg-surface-container-high flex items-center justify-center text-[10px] text-on-surface-variant">+${repo.contributors.length - 3}</div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// ===== MODAL FUNCTIONS =====
function openRepoModal(repo) {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Load repo data into modal
        loadRepoData(repo);
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function loadRepoData(repo) {
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
    
    // In a real implementation, you would fetch the repo tree here
    console.log('Loading repo data for:', repo.name);
}

// ===== STATS UPDATES =====
function updateStats(stats) {
    const totalRepos = document.getElementById('total-repos');
    const totalIssues = document.getElementById('total-issues');
    const cicdSuccess = document.getElementById('cicd-success');
    
    if (totalRepos) totalRepos.textContent = stats.repos || 0;
    if (totalIssues) totalIssues.textContent = stats.issues || 0;
    if (cicdSuccess) cicdSuccess.textContent = stats.cicd || '0%';
}

// ===== FILTERS AND SORTING =====
function applyFilters() {
    const langFilter = document.getElementById('filter-lang')?.value || 'all';
    console.log('Applying language filter:', langFilter);
    // Implement filtering logic here
}

function applySorting() {
    const sortBy = document.getElementById('sort-select')?.value || 'updated';
    console.log('Applying sort:', sortBy);
    // Implement sorting logic here
}

// ===== REFRESH DATA =====
function forceRefreshData() {
    console.log('Refreshing data...');
    // Show loading state
    const refreshBtn = document.getElementById('refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="loading-spinner"></span> Refreshing...';
    }
    
    // In a real implementation, this would call your API refresh function
    setTimeout(() => {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<span class="material-symbols-outlined">refresh</span> Refresh';
        }
    }, 2000);
}

// ===== AI ASSISTANT =====
function initAIAssistant() {
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
            <p class="font-body-md text-body-md text-on-surface">${message}</p>
        </div>
        <div class="w-8 h-8 rounded-full bg-surface-container-high/50 flex-shrink-0 flex items-center justify-center border border-outline-variant/30 mt-1">
            <img alt="User" class="w-full h-full rounded-full object-cover" src="https://avatars.githubusercontent.com/u/195803064?v=4">
        </div>
    `;
    messagesContainer.appendChild(userMsg);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simulate AI response (in real implementation, call your AI API)
    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-chat-msg ai-chat-msg--ai flex gap-3 mb-4';
        aiMsg.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center border border-primary/30 mt-1">
                <span class="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
            </div>
            <div class="ai-msg-bubble bg-surface-container-high/50 p-3 squircle-sm border border-white/5 rounded-xl">
                <p class="font-body-md text-body-md text-on-surface">Estoy procesando tu solicitud. Un momento, por favor...</p>
            </div>
        `;
        messagesContainer.appendChild(aiMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
}

// ===== CREATE REPO MODAL =====
function initCreateRepoModal() {
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
        form.onsubmit = (e) => {
            e.preventDefault();
            createNewRepo();
        };
    }
}

function createNewRepo() {
    const name = document.getElementById('repo-name')?.value || '';
    const desc = document.getElementById('repo-desc')?.value || '';
    const isPrivate = document.getElementById('repo-private')?.checked || false;
    const errorEl = document.getElementById('create-repo-error');
    
    if (!name) {
        if (errorEl) errorEl.textContent = 'El nombre del repositorio es obligatorio';
        return;
    }
    
    if (errorEl) errorEl.textContent = '';
    
    console.log('Creating repo:', { name, desc, isPrivate });
    
    // In a real implementation, call your create repo API
    const submitBtn = document.getElementById('create-repo-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Creando...';
    }
    
    setTimeout(() => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">create</span> Crear';
        }
        document.getElementById('create-repo-modal')?.classList.add('hidden');
        showToast('Repositorio creado con éxito', 'success');
    }, 2000);
}

// ===== SETTINGS MODAL =====
function initSettingsModal() {
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
function initLogout() {
    const logoutBtn = document.getElementById('mac-logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                // In a real implementation, call your logout function
                console.log('Logging out...');
                window.location.href = '/api/logout';
            }
        };
    }
}

// ===== SCROLL TO TOP =====
function initScrollToTop() {
    const btn = document.getElementById('scroll-to-top');
    if (btn) {
        btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        });
    }
}

// ===== COMMAND PALETTE =====
function initCommandPalette() {
    const input = document.getElementById('cmd-input');
    const palette = document.getElementById('command-palette');
    
    if (input && palette) {
        input.onfocus = () => {
            // Show palette results
        };
        
        input.onkeypress = (e) => {
            if (e.key === 'Escape') {
                palette.classList.add('hidden');
            }
        };
    }
    
    // Keyboard shortcut for command palette
    document.addEventListener('keydown', (e) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (palette) palette.classList.remove('hidden');
            if (input) input.focus();
        }
        
        if (e.key === 'Escape') {
            if (palette) palette.classList.add('hidden');
        }
    });
}

// ===== TAB SWITCHING =====
function initModalTabs() {
    const tabs = document.querySelectorAll('.modal-tab');
    const panes = document.querySelectorAll('.modal__body');
    
    tabs.forEach(tab => {
        tab.onclick = () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs and panes
            tabs.forEach(t => t.classList.remove('active', 'text-primary'));
            tabs.forEach(t => t.classList.add('text-on-surface-variant'));
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

// ===== INITIALIZE =====
function initAdapter() {
    // Initialize all components
    initAIAssistant();
    initCreateRepoModal();
    initSettingsModal();
    initLogout();
    initScrollToTop();
    initCommandPalette();
    initModalTabs();
    
    // Set current year
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
    
    console.log('DevRepo Apple Style Adapter initialized');
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdapter);
} else {
    initAdapter();
}

// Export functions for use in other modules
window DevRepoAdapter = {
    hideLoading,
    updateLoadingStatus,
    showLoginScreen,
    hideLoginScreen,
    showToast,
    renderRepos,
    updateStats,
    openRepoModal,
    closeModal
};
