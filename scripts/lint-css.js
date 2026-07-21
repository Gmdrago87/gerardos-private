/**
 * CSS Linter
 * Basic linting for CSS files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Files to lint
const filesToLint = [
    'public/style.css'
];

// Lint rules
const rules = {
    maxLineLength: 120,
    maxFileLength: 5000, // lines
    disallowImportant: true,
    disallowDuplicateProperties: true
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
        
        // Check for !important
        if (rules.disallowImportant) {
            const importantMatches = content.match(/!important/gi);
            if (importantMatches && importantMatches.length > 0) {
                console.log(`  ⚠️  Found ${importantMatches.length} !important declarations`);
                warnings += importantMatches.length;
            }
        }
        
        // Check for duplicate properties (simple check)
        if (rules.disallowDuplicateProperties) {
            const propMatches = content.match(/([a-z-]+)\s*:/gi) || [];
            const props = propMatches.map(m => m.split(':')[0].trim());
            const duplicates = props.filter((p, i) => props.indexOf(p) !== i);
            
            if (duplicates.length > 0) {
                console.log(`  ⚠️  Found duplicate properties: ${[...new Set(duplicates)].join(', ')}`);
                warnings++;
            }
        }
        
    } catch (error) {
        console.error(`  ❌ Error reading ${filePath}:`, error.message);
        errors++;
    }
}

async function lintAll() {
    console.log('🔍 Starting CSS linting...\n');
    
    const startTime = Date.now();
    
    // Lint each file
    for (const file of filesToLint) {
        await lintFile(file);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n📊 Linting complete!');
    console.log(`   Time: ${duration}s`);
    console.log(`   Files: ${filesToLint.length}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Warnings: ${warnings}`);
    
    if (errors > 0) {
        process.exit(1);
    }
}

// Run linter
lintAll().catch(() => process.exit(1));
