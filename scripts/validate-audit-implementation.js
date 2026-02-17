#!/usr/bin/env node

/**
 * Validation Script for Audit Implementation
 * Ensures all audit components are working correctly and no regressions were introduced
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Execute command and capture result
 */
function executeCommand(command, description) {
  console.info(`🔍 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 5
    });
    console.info(`✅ ${description} - PASSED`);
    return { success: true, output };
  } catch (error) {
    console.info(`❌ ${description} - FAILED`);
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

/**
 * Check if file exists and has expected content
 */
function validateFile(filePath, description, expectedContent = null) {
  console.info(`🔍 ${description}...`);
  
  if (!existsSync(filePath)) {
    console.info(`❌ ${description} - FILE NOT FOUND: ${filePath}`);
    return { success: false, error: 'File not found' };
  }
  
  if (expectedContent) {
    try {
      const content = readFileSync(filePath, 'utf8');
      if (!content.includes(expectedContent)) {
        console.info(`❌ ${description} - CONTENT MISSING: ${expectedContent}`);
        return { success: false, error: 'Expected content not found' };
      }
    } catch (error) {
      console.info(`❌ ${description} - READ ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  console.info(`✅ ${description} - PASSED`);
  return { success: true };
}

/**
 * Validate NPM scripts are properly configured
 */
function validateNpmScripts() {
  console.info('\n📦 VALIDATING NPM SCRIPTS');
  console.info('==========================');
  
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const expectedScripts = [
    'audit:continuous',
    'audit:pre-commit',
    'audit:setup-hooks',
    'audit:schedule',
    'audit:trends',
    'audit:status'
  ];
  
  const results = [];
  
  expectedScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.info(`✅ NPM script '${script}' - CONFIGURED`);
      results.push({ success: true, script });
    } else {
      console.info(`❌ NPM script '${script}' - MISSING`);
      results.push({ success: false, script, error: 'Script not found' });
    }
  });
  
  return results;
}

/**
 * Validate audit scripts exist and are executable
 */
function validateAuditScripts() {
  console.info('\n📜 VALIDATING AUDIT SCRIPTS');
  console.info('============================');
  
  const scripts = [
    { path: 'scripts/continuous-audit.js', desc: 'Continuous Audit Script' },
    { path: 'scripts/pre-commit-audit.js', desc: 'Pre-commit Audit Script' },
    { path: 'scripts/setup-git-hooks.js', desc: 'Git Hooks Setup Script' },
    { path: 'scripts/audit-scheduler.js', desc: 'Audit Scheduler Script' },
    { path: 'scripts/validate-audit-implementation.js', desc: 'Validation Script' }
  ];
  
  return scripts.map(script => 
    validateFile(script.path, script.desc, '#!/usr/bin/env node')
  );
}

/**
 * Validate documentation files
 */
function validateDocumentation() {
  console.info('\n📚 VALIDATING DOCUMENTATION');
  console.info('============================');
  
  const docs = [
    { 
      path: 'audits/CONTINUOUS_AUDIT_PROCESS.md', 
      desc: 'Continuous Audit Process Documentation',
      content: 'Continuous Audit and Monitoring Process'
    },
    { 
      path: 'audits/AUDIT_QUICK_START.md', 
      desc: 'Audit Quick Start Guide',
      content: 'Getting Started (5 minutes)'
    }
  ];
  
  return docs.map(doc => 
    validateFile(doc.path, doc.desc, doc.content)
  );
}

/**
 * Test audit script functionality
 */
function testAuditFunctionality() {
  console.info('\n🧪 TESTING AUDIT FUNCTIONALITY');
  console.info('===============================');
  
  const tests = [
    {
      command: 'node scripts/audit-scheduler.js status',
      description: 'Audit Scheduler Status Check'
    },
    {
      command: 'npm run audit:status',
      description: 'NPM Audit Status Command'
    }
  ];
  
  return tests.map(test => 
    executeCommand(test.command, test.description)
  );
}

/**
 * Validate audit configuration files
 */
function validateConfiguration() {
  console.info('\n⚙️  VALIDATING CONFIGURATION');
  console.info('============================');
  
  // Check if audit schedule was created
  const scheduleResult = validateFile(
    'audits/audit-schedule.json', 
    'Audit Schedule Configuration',
    'daily'
  );
  
  // Validate JSON structure
  if (scheduleResult.success) {
    try {
      const config = JSON.parse(readFileSync('audits/audit-schedule.json', 'utf8'));
      if (config.daily && config.weekly && config.monthly && config.thresholds) {
        console.info('✅ Audit Schedule Structure - VALID');
        return [{ success: true, description: 'Configuration validation' }];
      } else {
        console.info('❌ Audit Schedule Structure - INVALID');
        return [{ success: false, description: 'Configuration validation', error: 'Invalid structure' }];
      }
    } catch (error) {
      console.info('❌ Audit Schedule JSON - MALFORMED');
      return [{ success: false, description: 'Configuration validation', error: 'Invalid JSON' }];
    }
  }
  
  return [scheduleResult];
}

/**
 * Check for potential regressions
 */
function checkForRegressions() {
  console.info('\n🔄 CHECKING FOR REGRESSIONS');
  console.info('============================');
  
  const regressionTests = [
    {
      command: 'npm run build',
      description: 'Production Build Still Works'
    },
    {
      command: 'npm run test:run',
      description: 'Test Suite Still Passes'
    }
  ];
  
  return regressionTests.map(test => 
    executeCommand(test.command, test.description)
  );
}

/**
 * Generate validation report
 */
function generateValidationReport(results) {
  const allResults = Object.values(results).flat();
  const totalTests = allResults.length;
  const passedTests = allResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.info('\n📋 VALIDATION SUMMARY');
  console.info('=====================');
  console.info(`Total Tests: ${totalTests}`);
  console.info(`Passed: ${passedTests}`);
  console.info(`Failed: ${failedTests}`);
  console.info(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.info('\n❌ FAILED TESTS:');
    allResults
      .filter(r => !r.success)
      .forEach((result, index) => {
        console.info(`${index + 1}. ${result.description || result.script || 'Unknown test'}`);
        if (result.error) {
          console.info(`   Error: ${result.error}`);
        }
      });
  }
  
  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100
  };
}

/**
 * Main validation execution
 */
async function validateAuditImplementation() {
  console.info('🚀 VALIDATING AUDIT IMPLEMENTATION');
  console.info('===================================');
  console.info('This script validates that all audit components are working correctly');
  console.info('and ensures no regressions were introduced.\n');
  
  const startTime = Date.now();
  
  // Run all validation tests
  const results = {
    npmScripts: validateNpmScripts(),
    auditScripts: validateAuditScripts(),
    documentation: validateDocumentation(),
    functionality: testAuditFunctionality(),
    configuration: validateConfiguration(),
    regressions: checkForRegressions()
  };
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Generate report
  const report = generateValidationReport(results);
  
  console.info(`\nValidation completed in ${duration}s`);
  
  if (report.failedTests === 0) {
    console.info('\n🎉 ALL VALIDATIONS PASSED!');
    console.info('The continuous audit and monitoring process has been successfully implemented.');
    console.info('\nNext steps:');
    console.info('1. Run "npm run audit:setup-hooks" to install Git hooks');
    console.info('2. Run "npm run audit:continuous" to perform your first audit');
    console.info('3. Review the documentation in audits/AUDIT_QUICK_START.md');
    
    process.exit(0);
  } else {
    console.info('\n❌ VALIDATION FAILED');
    console.info('Some components are not working correctly. Please review the failed tests above.');
    
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateAuditImplementation().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { validateAuditImplementation };