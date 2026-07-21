// Module: layout.js
// Handles dynamic injection of global header, footer, settings modal, command palette, and toast container.

export function injectLayout() {
    const path = window.location.pathname;
    const isRepos = path.includes('/repos');
    const isWorkspace = path.includes('/workspace');
    const isHome = !isRepos && !isWorkspace;

    // 1. Inject Header if missing
    if (!document.querySelector('.web-header')) {
        const headerHTML = `
    <header class="web-header animate-on-scroll">
        <div class="web-header__container">
            <div class="web-header__left">
                <a href="/index.html" class="web-header__logo" style="text-decoration:none;">
                    <i data-lucide="git-branch"></i>
                    <span class="web-header__logo-text">RepoManager</span>
                </a>
                <nav class="web-header__nav">
                    <a href="/index.html" class="web-header__nav-link ${isHome ? 'web-header__nav-link--active' : ''}">Inicio</a>
                    <a href="/repos/index.html" class="web-header__nav-link ${isRepos ? 'web-header__nav-link--active' : ''}">Repositorios</a>
                    <a href="/workspace/index.html" class="web-header__nav-link ${isWorkspace ? 'web-header__nav-link--active' : ''}">Entorno de Trabajo</a>
                </nav>
            </div>
            <div class="web-header__right">
                <a id="github-link-header" href="#" target="_blank" rel="noopener noreferrer" class="web-header__github-btn">
                    <i data-lucide="github"></i>
                    <span id="username-header">Perfil</span>
                </a>
                <button id="logout-btn" class="web-header__icon-btn" title="Cerrar Sesión">
                    <i data-lucide="log-out"></i>
                </button>
                <button id="settings-btn" class="web-header__icon-btn" title="Ajustes">
                    <i data-lucide="settings"></i>
                </button>
            </div>
        </div>
    </header>`;
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }

    // 2. Inject Loading Screen if missing
    if (!document.getElementById('loading')) {
        const loadingHTML = `
    <div id="loading" class="loading-screen">
        <div class="loading-content">
            <div class="loading-spinner">
                <div class="spinner-ring spinner-ring--outer"></div>
                <div class="spinner-ring spinner-ring--middle"></div>
                <div class="spinner-ring spinner-ring--inner"></div>
            </div>
            <div class="loading-info">
                <p id="loading-text" class="loading-label">
                    <span class="loading-gradient-text">Cargando RepoManager</span>
                </p>
                <p id="loading-status" class="loading-status">Preparando plataforma...</p>
                <div class="loading-dots">
                    <span class="loading-dot loading-dot--purple"></span>
                    <span class="loading-dot loading-dot--blue"></span>
                    <span class="loading-dot loading-dot--cyan"></span>
                </div>
            </div>
        </div>
    </div>`;
        const main = document.querySelector('main');
        if (main) {
            main.insertAdjacentHTML('afterbegin', loadingHTML);
        } else {
            document.body.insertAdjacentHTML('afterbegin', loadingHTML);
        }
    }

    // 3. Inject Toast if missing
    if (!document.getElementById('toast')) {
        const toastHTML = `
    <div id="toast" class="toast hidden">
        <div class="toast__panel glass-panel">
            <div class="toast__content">
                <div class="toast__icon-wrapper">
                    <i data-lucide="wifi-off"></i>
                </div>
                <div class="toast__text">
                    <p class="toast__title">Modo Caché</p>
                    <p class="toast__message">Datos almacenados localmente</p>
                </div>
                <button class="toast__close" onclick="document.getElementById('toast').classList.add('hidden')">
                    <i data-lucide="x"></i>
                </button>
            </div>
        </div>
    </div>`;
        document.body.insertAdjacentHTML('beforeend', toastHTML);
    }

    // 4. Inject Scroll to Top button if missing
    if (!document.getElementById('scroll-to-top')) {
        const scrollTopHTML = `
    <button id="scroll-to-top" class="btn-scroll-top" aria-label="Volver arriba">
        <i data-lucide="arrow-up"></i>
    </button>`;
        document.body.insertAdjacentHTML('beforeend', scrollTopHTML);
    }

    // 5. Inject Settings Modal if missing
    if (!document.getElementById('settings-modal')) {
        const settingsHTML = `
    <div id="settings-modal" class="modal hidden">
        <div class="modal-backdrop"></div>
        <div class="modal-container glass-panel">
            <div class="modal-header">
                <h2 class="modal-title">Ajustes</h2>
                <button class="modal-close" onclick="document.getElementById('settings-modal').classList.add('hidden');">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div class="form-group">
                    <label class="form-label">Caché Local</label>
                    <button onclick="window.clearAppCache();" class="btn-submit"
                        style="width: 100%; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--error-400);">
                        <i data-lucide="database"></i> Borrar Caché
                    </button>
                </div>
            </div>
        </div>
    </div>`;
        document.body.insertAdjacentHTML('beforeend', settingsHTML);
    }

    // 6. Inject Command Palette if missing
    if (!document.getElementById('command-palette')) {
        const paletteHTML = `
    <div id="command-palette" class="command-palette hidden">
        <div class="palette-backdrop" onclick="document.getElementById('command-palette').classList.add('hidden');">
        </div>
        <div class="palette-container glass-panel">
            <div class="search-form" style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding: 1rem;">
                <div class="search-field" style="width: 100%;">
                    <i data-lucide="search" class="search-field-icon"></i>
                    <input type="text" id="cmd-input" placeholder="Buscar repositorios o comandos...">
                </div>
            </div>
            <div id="palette-results" class="palette-results" style="max-height: 400px; overflow-y: auto;"></div>
        </div>
    </div>`;
        document.body.insertAdjacentHTML('beforeend', paletteHTML);
    }

    // 7. Inject Footer if missing
    if (!document.querySelector('.site-footer')) {
        const currentYear = new Date().getFullYear();
        const footerHTML = `
    <footer class="site-footer">
        <div class="footer-content">
            <p class="footer-author">Diseñado y desarrollado por Gerard Maestre</p>
            <p class="footer-copyright">&copy; <span id="year">${currentYear}</span> RepoManager</p>
            <p id="footer-version" class="footer-version">v2.0.0</p>
        </div>
    </footer>`;
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
