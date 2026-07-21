/**
 * CSS Processor
 * Minifies and optimizes CSS for production
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// Simple CSS minifier
function minifyCSS(css) {
    // Remove comments
    let minified = css.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove whitespace
    minified = minified.replace(/\s+/g, ' ');
    
    // Remove spaces around special characters
    minified = minified.replace(/\s*([{};,:])\s*/g, '$1');
    
    // Remove trailing semicolons
    minified = minified.replace(/;}/g, '}');
    
    // Remove leading/trailing spaces
    minified = minified.trim();
    
    return minified;
}

async function buildCSS() {
    console.log('🎨 Starting CSS build...');
    
    try {
        const inputFile = path.join(publicDir, 'style.css');
        const outputFile = path.join(publicDir, 'style.min.css');
        
        // Read input
        const css = await fs.readFile(inputFile, 'utf-8');
        
        // Minify
        const minified = minifyCSS(css);
        
        // Write output
        await fs.writeFile(outputFile, minified);
        
        const originalSize = (await fs.stat(inputFile)).size;
        const minifiedSize = (await fs.stat(outputFile)).size;
        const reduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
        
        console.log('✅ CSS build completed successfully!');
        console.log(`   Input:  ${inputFile} (${originalSize / 1024} KB)`);
        console.log(`   Output: ${outputFile} (${minifiedSize / 1024} KB)`);
        console.log(`   Reduction: ${reduction}%`);
        
        return { originalSize, minifiedSize };
        
    } catch (error) {
        console.error('❌ CSS build failed:', error);
        process.exit(1);
    }
}

// Run build
buildCSS().catch(() => process.exit(1));
