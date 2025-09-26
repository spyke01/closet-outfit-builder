#!/usr/bin/env node

/**
 * Pre-commit Audit Script
 * Lightweight checks for code quality and accessibility before commits
 * Designed to be fast and catch issues early in development
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

/**
 * Execute command with timeout and error handling
 */
function executeCommand(command, description, timeout = 30000) {
  console.log(`🔍 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout,
      maxBuffer: 1024 * 1024 * 5 // 5MB buffer
    });
    console.log(`✅ ${description} passed`);
    return { success: true, output };
  } catch (error) {
    console.log(`❌ ${description} failed`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of staged files
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(file => file.length > 0);
  } catch (error) {
    console.log('Warning: Could not get staged files, running checks on all files');
    return [];
  }
}

/**
 * Check if staged files include specific types
 */
function hasStagedFiles(extensions, stagedFiles) {
  if (stagedFiles.length === 0) return true; // Check all if can't determine staged files
  return stagedFiles.some(file => 
    extensions.some(ext => file.endsWith(ext))
  );
}

/**
 * Run TypeScript type checking
 */
function runTypeCheck(stagedFiles) {
  if (!hasStagedFiles(['.ts', '.tsx'], stagedFiles)) {
    console.log('⏭️  Skipping TypeScript check (no TS files staged)');
    return { success: true, skipped: true };
  }
  
  return executeCommand('npx tsc --noEmit', 'TypeScript Type Check', 45000);
}

/**
 * Run ESLint on staged files
 */
function runESLint(stagedFiles) {
  const jsFiles = stagedFiles.filter(file => 
    file.endsWith('.js') || file.endsWith('.jsx') || 
    file.endsWith('.ts') || file.endsWith('.tsx')
  );
  
  if (jsFiles.length === 0 && stagedFiles.length > 0) {
    console.log('⏭️  Skipping ESLint (no JS/TS files staged)');
    return { success: true, skipped: true };
  }
  
  const command = jsFiles.length > 0 
    ? `npx eslint ${jsFiles.join(' ')}`
    : 'npm run lint';
    
  return executeCommand(command, 'ESLint Code Quality Check', 30000);
}

/**
 * Run accessibility linting
 */
function runA11yLint(stagedFiles) {
  if (!hasStagedFiles(['.tsx', '.jsx'], stagedFiles)) {
    console.log('⏭️  Skipping A11y lint (no React files staged)');
    return { success: true, skipped: true };
  }
  
  return executeCommand('npm run lint:a11y', 'Accessibility Linting', 20000);
}

/**
 * Run quick security check
 */
function runSecurityCheck() {
  return executeCommand('npm audit --audit-level=high', 'Security Vulnerability Check', 15000);
}

/**
 * Check for common issues in staged files
 */
function runFileContentChecks(stagedFiles) {
  console.log('🔍 File Content Checks...');
  
  const issues = [];
  
  stagedFiles.forEach(file => {
    try {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || 
          file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = readFileSync(file, 'utf8');
        
        // Check for console.log statements
        if (content.includes('console.log(') && !file.includes('.test.')) {
          issues.push(`${file}: Contains console.log statement`);
        }
        
        // Check for TODO comments
        if (content.includes('// TODO') || content.includes('/* TODO')) {
          issues.push(`${file}: Contains TODO comment`);
        }
        
        // Check for debugger statements
        if (content.includes('debugger;')) {
          issues.push(`${file}: Contains debugger statement`);
        }
      }
    } catch (error) {
      // File might be deleted or binary, skip
    }
  });
  
  if (issues.length > 0) {
    console.log('⚠️  File content issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
    return { success: false, issues };
  }
  
  console.log('✅ File Content Checks passed');
  return { success: true };
}

/**
 * Main pre-commit audit execution
 */
async function runPreCommitAudit() {
  console.log('🚀 Running Pre-commit Audit');
  console.log('===========================');
  
  const startTime = Date.now();
  const stagedFiles = getStagedFiles();
  
  console.log(`Staged files: ${stagedFiles.length > 0 ? stagedFiles.join(', ') : 'all files'}`);
  
  const results = {
    typeCheck: runTypeCheck(stagedFiles),
    eslint: runESLint(stagedFiles),
    a11yLint: runA11yLint(stagedFiles),
    security: runSecurityCheck(),
    fileContent: runFileContentChecks(stagedFiles)
  };
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Count results
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(r => r.success).length;
  const skippedChecks = Object.values(results).filter(r => r.skipped).length;
  const failedChecks = totalChecks - passedChecks - skippedChecks;
  
  console.log('\n📋 PRE-COMMIT AUDIT SUMMARY');
  console.log('===========================');
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Skipped: ${skippedChecks}`);
  console.log(`Failed: ${failedChecks}`);
  console.log(`Duration: ${duration}s`);
  
  if (failedChecks > 0) {
    console.log('\n❌ Pre-commit checks failed. Please fix the issues above before committing.');
    console.log('\nTips:');
    console.log('- Run "npm run lint" to fix ESLint issues');
    console.log('- Run "npx tsc --noEmit" to check TypeScript errors');
    console.log('- Run "npm audit fix" to resolve security vulnerabilities');
    console.log('- Remove console.log, debugger, and TODO comments from production code');
    
    process.exit(1);
  }
  
  console.log('\n✅ All pre-commit checks passed! Ready to commit.');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPreCommitAudit().catch(error => {
    console.error('Pre-commit audit failed:', error);
    process.exit(1);
  });
}

export { runPreCommitAudit };