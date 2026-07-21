/**
 * JavaScript Linter
 * Basic linting for JavaScript files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Files to lint
const filesToLint = [
    'public/app.js',
    'public/modules/*.js',
    'functions/**/*.js'
];

// Lint rules
const rules = {
    maxLineLength: 120,
    maxFileLength: 2000, // lines
    disallowConsole: false, // Allow console in development
    requireStrict: true
};

let errors = 0;
let warnings = 0;

async function lintFile(filePath) {
    const fullPath = path.join(rootDir, filePath);
    
    try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        console.log(`📄 Linting: ${filePath}`);
        
        // Check line length
        lines.forEach((line, index) => {
            if (line.length > rules.maxLineLength) {
                console.log(`  ⚠️  Line ${index + 1}: Line exceeds ${rules.maxLineLength} characters (${line.length})`);
                warnings++;
            }
        });
        
        // Check file length
        if (lines.length > rules.maxFileLength) {
            console.log(`  ⚠️  File exceeds ${rules.maxFileLength} lines (${lines.length})`);
            warnings++;
        }
        
        // Check for common issues
        if (!content.includes('use strict') && !content.includes("'use strict'")) {
            console.log('  ⚠️  Missing "use strict" directive');
            warnings++;
        }
        
        // Check for console.log in production code
        if (rules.disallowConsole) {
            const consoleMatches = content.match(/console\.(log|warn|error|info)/g);
            if (consoleMatches && consoleMatches.length > 0) {
                console.log(`  ⚠️  Found ${consoleMatches.length} console statements`);
                warnings += consoleMatches.length;
            }
        }
        
    } catch (error) {
        console.error(`  ❌ Error reading ${filePath}:`, error.message);
        errors++;
    }
}

async function lintAll() {
    console.log('🔍 Starting JavaScript linting...\n');
    
    const startTime = Date.now();
    
    // Expand glob patterns
    const allFiles = [];
    
    for (const pattern of filesToLint) {
        if (pattern.includes('*')) {
            // Simple glob expansion
            const dir = pattern.split('/').slice(0, -1).join('/');
            const ext = pattern.split('*')[1] || '.js';
            
            try {
                const dirPath = path.join(rootDir, dir);
                const files = await fs.readdir(dirPath);
                files.forEach(f => {
                    if (f.endsWith(ext)) {
                        allFiles.push(path.join(dir, f));
                    }
                });
            } catch (e) {
                // Directory doesn't exist, skip
            }
        } else {
            allFiles.push(pattern);
        }
    }
    
    // Lint each file
    for (const file of allFiles) {
        await lintFile(file);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n📊 Linting complete!');
    console.log(`   Time: ${duration}s`);
    console.log(`   Files: ${allFiles.length}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Warnings: ${warnings}`);
    
    if (errors > 0) {
        process.exit(1);
    }
}

// Run linter
lintAll().catch(() => process.exit(1));
