export function initShortcuts() {
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
                    document.getElementById('cmd-input').focus();
                }
            }
        }
        
        // Escape
        if (e.key === 'Escape') {
            const palette = document.getElementById('command-palette');
            if (palette && !palette.classList.contains('hidden')) {
                palette.classList.add('hidden');
            }
        }
    });
}
