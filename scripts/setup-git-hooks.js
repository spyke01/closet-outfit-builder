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
# Pre-commit hook for My AI Outfit
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
    console.info('⚠️  .git/hooks directory not found. Are you in a git repository?');
    return false;
  }

  // Write the hook file
  writeFileSync(PRE_COMMIT_HOOK, hookContent);
  
  // Make it executable
  chmodSync(PRE_COMMIT_HOOK, 0o755);
  
  console.info('✅ Pre-commit hook installed successfully');
  return true;
}

/**
 * Test the pre-commit hook
 */
function testPreCommitHook() {
  try {
    console.info('🧪 Testing pre-commit hook...');
    execSync('node scripts/pre-commit-audit.js', { stdio: 'inherit' });
    console.info('✅ Pre-commit hook test passed');
    return true;
  } catch (error) {
    console.info('❌ Pre-commit hook test failed');
    console.info('This is expected if there are code quality issues to fix');
    return false;
  }
}

/**
 * Main setup execution
 */
function setupGitHooks() {
  console.info('🚀 Setting up Git Hooks');
  console.info('=======================');
  
  // Check if we're in a git repository
  if (!existsSync('.git')) {
    console.info('❌ Not in a git repository. Please run this from the project root.');
    process.exit(1);
  }
  
  // Create pre-commit hook
  const hookCreated = createPreCommitHook();
  
  if (!hookCreated) {
    console.info('❌ Failed to create pre-commit hook');
    process.exit(1);
  }
  
  // Test the hook
  console.info('\n🧪 Testing the installed hook...');
  testPreCommitHook();
  
  console.info('\n📋 Git Hooks Setup Complete');
  console.info('============================');
  console.info('✅ Pre-commit hook installed and ready');
  console.info('\nThe hook will now run automatically before each commit to:');
  console.info('- Check TypeScript types');
  console.info('- Run ESLint code quality checks');
  console.info('- Verify accessibility compliance');
  console.info('- Check for security vulnerabilities');
  console.info('- Scan for common code issues');
  console.info('\nTo bypass the hook (not recommended), use: git commit --no-verify');
  console.info('To test the hook manually, run: node scripts/pre-commit-audit.js');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupGitHooks();
}

export { setupGitHooks };