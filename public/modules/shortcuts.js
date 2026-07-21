export function initShortcuts() {
    if (window._globalListenersAttached) return;
    window._globalListenersAttached = true;

    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + S to Save
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            const saveBtn = document.getElementById('modal-save-btn');
            if (saveBtn && !saveBtn.disabled) {
                saveBtn.click();
            }
        }
        
        // Cmd/Ctrl + P or Cmd/Ctrl + K to open Command Palette
        if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'k')) {
            e.preventDefault();
            const palette = document.getElementById('command-palette');
            if (palette) {
                palette.classList.toggle('hidden');
                if (!palette.classList.contains('hidden')) {
                    const cmdInput = document.getElementById('cmd-input');
                    if (cmdInput) cmdInput.focus();
                }
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const palette = document.getElementById('command-palette');
            if (palette && !palette.classList.contains('hidden')) {
                palette.classList.add('hidden');
            }
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal && !settingsModal.classList.contains('hidden')) {
                settingsModal.classList.add('hidden');
            }
            const createRepoModal = document.getElementById('create-repo-modal');
            if (createRepoModal && !createRepoModal.classList.contains('hidden')) {
                createRepoModal.classList.add('hidden');
            }
        }
    });
}
