#!/usr/bin/env node

/**
 * Git Hooks Setup Script
 * Installs pre-commit hooks for automated quality checks
 */

import { writeFileSync, chmodSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const GIT_HOOKS_DIR = '.git/hooks';
const PRE_COMMIT_HOOK = join(GIT_HOOKS_DIR, 'pre-commit');

/**
 * Create pre-commit hook script
 */
function createPreCommitHook() {
  const hookContent = `#!/bin/sh
#
# Pre-commit hook for What to Wear
# Runs automated quality and accessibility checks
#

echo "🔍 Running pre-commit quality checks..."

# Run the pre-commit audit script
node scripts/pre-commit-audit.js

# Exit with the same code as the audit script
exit $?
`;

  // Ensure .git/hooks directory exists
  if (!existsSync(GIT_HOOKS_DIR)) {
    console.log('⚠️  .git/hooks directory not found. Are you in a git repository?');
    return false;
  }

  // Write the hook file
  writeFileSync(PRE_COMMIT_HOOK, hookContent);
  
  // Make it executable
  chmodSync(PRE_COMMIT_HOOK, 0o755);
  
  console.log('✅ Pre-commit hook installed successfully');
  return true;
}

/**
 * Test the pre-commit hook
 */
function testPreCommitHook() {
  try {
    console.log('🧪 Testing pre-commit hook...');
    execSync('node scripts/pre-commit-audit.js', { stdio: 'inherit' });
    console.log('✅ Pre-commit hook test passed');
    return true;
  } catch (error) {
    console.log('❌ Pre-commit hook test failed');
    console.log('This is expected if there are code quality issues to fix');
    return false;
  }
}

/**
 * Main setup execution
 */
function setupGitHooks() {
  console.log('🚀 Setting up Git Hooks');
  console.log('=======================');
  
  // Check if we're in a git repository
  if (!existsSync('.git')) {
    console.log('❌ Not in a git repository. Please run this from the project root.');
    process.exit(1);
  }
  
  // Create pre-commit hook
  const hookCreated = createPreCommitHook();
  
  if (!hookCreated) {
    console.log('❌ Failed to create pre-commit hook');
    process.exit(1);
  }
  
  // Test the hook
  console.log('\n🧪 Testing the installed hook...');
  testPreCommitHook();
  
  console.log('\n📋 Git Hooks Setup Complete');
  console.log('============================');
  console.log('✅ Pre-commit hook installed and ready');
  console.log('\nThe hook will now run automatically before each commit to:');
  console.log('- Check TypeScript types');
  console.log('- Run ESLint code quality checks');
  console.log('- Verify accessibility compliance');
  console.log('- Check for security vulnerabilities');
  console.log('- Scan for common code issues');
  console.log('\nTo bypass the hook (not recommended), use: git commit --no-verify');
  console.log('To test the hook manually, run: node scripts/pre-commit-audit.js');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupGitHooks();
}

export { setupGitHooks };