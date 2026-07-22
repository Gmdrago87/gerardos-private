#!/bin/bash

# DevRepo - Integration Verification Script
# This script verifies that all files are properly created and connected

echo "🔍 DevRepo Integration Verification"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Function to check file existence
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing"
        ((FAILED++))
    fi
}

# Function to check directory existence
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 directory exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 directory missing"
        ((FAILED++))
    fi
}

# Function to check file content (fixed to handle CSS variables)
check_content() {
    if grep -F "$2" "$1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $1 contains '$2'"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing '$2'"
        ((FAILED++))
    fi
}

echo "📁 Checking file structure..."
echo ""

# Check new files
check_file "public/index_new.html"
check_file "public/style_new.css"
check_file "public/app_new.js"
check_file "public/adapter.js"
check_file "INTEGRATION_GUIDE.md"
check_file "DESIGN_INTEGRATION_SUMMARY.md"

echo ""
echo "📁 Checking existing files (should still exist)..."
echo ""

# Check existing files that should still be there
check_file "public/modules/utils.js"
check_file "public/modules/state.js"
check_file "public/modules/api.js"
check_file "public/modules/auth.js"
check_file "public/modules/shortcuts.js"
check_file "public/modules/ai_ui.js"
check_file "public/modules/futuristic.js"
check_file "public/sw.js"
check_file "public/manifest.json"

echo ""
echo "🔍 Checking content of new files..."
echo ""

# Check index_new.html content
check_content "public/index_new.html" "DevRepo - Repository Hub"
check_content "public/index_new.html" "glass-panel"
check_content "public/index_new.html" "squircle"
check_content "public/index_new.html" "Material+Symbols+Outlined"
check_content "public/index_new.html" "app.js"  # References /app.js (will be renamed)
check_content "public/index_new.html" "tailwindcss.com"  # Uses Tailwind via CDN

echo ""

# Check style_new.css content
check_content "public/style_new.css" "glass-panel"
check_content "public/style_new.css" "squircle"
check_content "public/style_new.css" "backdrop-filter"
check_content "public/style_new.css" "bg-primary"
check_content "public/style_new.css" "text-primary"

echo ""

# Check app_new.js content
check_content "public/app_new.js" "from './modules/utils.js'"
check_content "public/app_new.js" "from './modules/state.js'"
check_content "public/app_new.js" "from './modules/api.js'"
check_content "public/app_new.js" "from './modules/auth.js'"
check_content "public/app_new.js" "function initApp"
check_content "public/app_new.js" "function renderRepos"

echo ""

# Check adapter.js content
check_content "public/adapter.js" "function hideLoading"
check_content "public/adapter.js" "function showLoginScreen"
check_content "public/adapter.js" "function showToast"
check_content "public/adapter.js" "function renderRepos"

echo ""
echo "📊 Verification Summary"
echo "======================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Integration is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review the INTEGRATION_GUIDE.md"
    echo "2. Rename files: index_new.html -> index.html, app_new.js -> app.js"
    echo "3. Test the new files in your browser"
    echo "4. Deploy when ready"
    exit 0
else
    echo -e "${YELLOW}⚠ Some checks failed. Please review the issues above.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure you're in the correct directory"
    echo "2. Check that all files were created successfully"
    echo "3. Verify file permissions"
    exit 1
fi
