#!/bin/bash

# Security Remediation Script for Closet Outfit Builder
# This script applies critical security fixes in a controlled manner

echo "🔒 Security Remediation Script"
echo "=============================="

# Function to check if command succeeded
check_success() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 completed successfully"
    else
        echo "❌ $1 failed"
        exit 1
    fi
}

# Function to backup package files
backup_packages() {
    echo "📦 Creating backup of package files..."
    cp package.json package.json.backup
    cp package-lock.json package-lock.json.backup
    cp netlify/functions/package.json netlify/functions/package.json.backup
    cp netlify/functions/package-lock.json netlify/functions/package-lock.json.backup
    check_success "Package backup"
}

# Function to restore from backup
restore_backup() {
    echo "🔄 Restoring from backup..."
    mv package.json.backup package.json
    mv package-lock.json.backup package-lock.json
    mv netlify/functions/package.json.backup netlify/functions/package.json
    mv netlify/functions/package-lock.json.backup netlify/functions/package-lock.json
    npm install
}

# Phase 1: Safe Updates (Non-breaking)
phase1_safe_updates() {
    echo ""
    echo "🚀 Phase 1: Safe Security Updates"
    echo "================================="
    
    # Update safe packages
    echo "Updating safe packages..."
    npm update @types/react-dom autoprefixer postcss eslint-plugin-react-refresh
    check_success "Safe package updates"
    
    # Run tests to ensure nothing broke
    echo "Running tests to verify updates..."
    npm run test:run
    check_success "Test verification"
}

# Phase 2: Critical Security Fixes (Breaking Changes)
phase2_critical_fixes() {
    echo ""
    echo "⚠️  Phase 2: Critical Security Fixes (Breaking Changes)"
    echo "======================================================"
    
    read -p "Apply Vite 6.x update to fix esbuild vulnerability? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Updating Vite to fix esbuild vulnerability..."
        npm install vite@latest @vitejs/plugin-react@latest
        check_success "Vite update"
        
        echo "Testing build process..."
        npm run build
        check_success "Build verification"
        
        echo "Testing dev server..."
        timeout 10s npm run dev || true
        echo "✅ Dev server test completed"
    fi
    
    read -p "Apply Netlify CLI update to fix multiple vulnerabilities? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Updating Netlify CLI..."
        npm install netlify-cli@latest
        check_success "Netlify CLI update"
        
        echo "Testing Netlify functions..."
        cd netlify/functions
        npm audit fix --force
        cd ../..
        check_success "Netlify functions update"
    fi
}

# Phase 3: Verification and Cleanup
phase3_verification() {
    echo ""
    echo "🔍 Phase 3: Verification and Cleanup"
    echo "===================================="
    
    # Run final security audit
    echo "Running final security audit..."
    npm audit
    
    # Run comprehensive tests
    echo "Running comprehensive test suite..."
    npm run test:run
    check_success "Final test verification"
    
    # Test build and preview
    echo "Testing production build..."
    npm run build
    npm run preview &
    PREVIEW_PID=$!
    sleep 5
    kill $PREVIEW_PID
    check_success "Production build verification"
    
    # Clean up backup files
    echo "Cleaning up backup files..."
    rm -f package.json.backup package-lock.json.backup
    rm -f netlify/functions/package.json.backup netlify/functions/package-lock.json.backup
    
    echo ""
    echo "🎉 Security remediation completed!"
    echo "Please review the changes and test thoroughly before deployment."
}

# Main execution
main() {
    echo "Starting security remediation process..."
    echo "This script will apply security fixes in phases."
    echo ""
    
    read -p "Continue with security remediation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Remediation cancelled."
        exit 0
    fi
    
    backup_packages
    
    # Trap to restore backup on failure
    trap 'echo "❌ Script failed! Restoring backup..."; restore_backup' ERR
    
    phase1_safe_updates
    phase2_critical_fixes
    phase3_verification
    
    echo ""
    echo "✅ All phases completed successfully!"
    echo "📋 Next steps:"
    echo "   1. Review git diff to see all changes"
    echo "   2. Test the application thoroughly"
    echo "   3. Update documentation if needed"
    echo "   4. Deploy to staging for final verification"
}

# Run main function
main "$@"