/**
 * Main Build Script
 * Runs all build tasks
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function runBuild() {
    console.log('🏗️  Starting full build process...\n');
    
    const startTime = Date.now();
    
    try {
        // Build JavaScript
        console.log('1️⃣ Building JavaScript...');
        execSync('node scripts/build-js.js', { 
            cwd: rootDir,
            stdio: 'inherit'
        });
        
        // Build CSS
        console.log('\n2️⃣ Building CSS...');
        execSync('node scripts/build-css.js', { 
            cwd: rootDir,
            stdio: 'inherit'
        });
        
        // Update index.html to use bundled files in production
        console.log('\n3️⃣ Updating HTML references...');
        await updateHtmlReferences();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('\n✅ Build completed successfully!');
        console.log(`   Time: ${duration}s`);
        
    } catch (error) {
        console.error('\n❌ Build failed:', error);
        process.exit(1);
    }
}

async function updateHtmlReferences() {
    const publicDir = path.join(rootDir, 'public');
    const indexFile = path.join(publicDir, 'index.html');
    
    try {
        let html = await fs.readFile(indexFile, 'utf-8');
        
        // Replace individual module scripts with bundle
        // Keep this as an option - for now, we'll keep modules for development
        // In production, you can uncomment this:
        
        /*
        html = html.replace(
            /<script type="module" src="\/modules\/[^"]+"><\/script>/g,
            ''
        );
        
        html = html.replace(
            /<script type="module" src="\/app\.js"><\/script>/,
            '<script type="module" src="/bundle.js"></script>'
        );
        
        // Replace CSS reference
        html = html.replace(
            /<link rel="stylesheet" href="\/style\.css">/,
            '<link rel="stylesheet" href="/style.min.css">'
        );
        */
        
        // For now, just add the service worker registration if not present
        if (!html.includes('serviceWorker')) {
            const swRegistration = `
<script>
// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[SW] Registered:', reg.scope))
            .catch(err => console.error('[SW] Registration failed:', err));
    });
}
</script>`;
            
            // Insert before closing body tag
            html = html.replace(/<\/body>/, `${swRegistration}\n</body>`);
        }
        
        await fs.writeFile(indexFile, html);
        console.log('   ✓ Updated index.html');
        
    } catch (error) {
        console.error('   ⚠️  Could not update HTML references:', error.message);
    }
}

// Run build
runBuild().catch(() => process.exit(1));
