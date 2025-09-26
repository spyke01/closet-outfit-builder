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
  console.log(`🔍 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 5
    });
    console.log(`✅ ${description} - PASSED`);
    return { success: true, output };
  } catch (error) {
    console.log(`❌ ${description} - FAILED`);
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

/**
 * Check if file exists and has expected content
 */
function validateFile(filePath, description, expectedContent = null) {
  console.log(`🔍 ${description}...`);
  
  if (!existsSync(filePath)) {
    console.log(`❌ ${description} - FILE NOT FOUND: ${filePath}`);
    return { success: false, error: 'File not found' };
  }
  
  if (expectedContent) {
    try {
      const content = readFileSync(filePath, 'utf8');
      if (!content.includes(expectedContent)) {
        console.log(`❌ ${description} - CONTENT MISSING: ${expectedContent}`);
        return { success: false, error: 'Expected content not found' };
      }
    } catch (error) {
      console.log(`❌ ${description} - READ ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  console.log(`✅ ${description} - PASSED`);
  return { success: true };
}

/**
 * Validate NPM scripts are properly configured
 */
function validateNpmScripts() {
  console.log('\n📦 VALIDATING NPM SCRIPTS');
  console.log('==========================');
  
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
      console.log(`✅ NPM script '${script}' - CONFIGURED`);
      results.push({ success: true, script });
    } else {
      console.log(`❌ NPM script '${script}' - MISSING`);
      results.push({ success: false, script, error: 'Script not found' });
    }
  });
  
  return results;
}

/**
 * Validate audit scripts exist and are executable
 */
function validateAuditScripts() {
  console.log('\n📜 VALIDATING AUDIT SCRIPTS');
  console.log('============================');
  
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
  console.log('\n📚 VALIDATING DOCUMENTATION');
  console.log('============================');
  
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
  console.log('\n🧪 TESTING AUDIT FUNCTIONALITY');
  console.log('===============================');
  
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
  console.log('\n⚙️  VALIDATING CONFIGURATION');
  console.log('============================');
  
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
        console.log('✅ Audit Schedule Structure - VALID');
        return [{ success: true, description: 'Configuration validation' }];
      } else {
        console.log('❌ Audit Schedule Structure - INVALID');
        return [{ success: false, description: 'Configuration validation', error: 'Invalid structure' }];
      }
    } catch (error) {
      console.log('❌ Audit Schedule JSON - MALFORMED');
      return [{ success: false, description: 'Configuration validation', error: 'Invalid JSON' }];
    }
  }
  
  return [scheduleResult];
}

/**
 * Check for potential regressions
 */
function checkForRegressions() {
  console.log('\n🔄 CHECKING FOR REGRESSIONS');
  console.log('============================');
  
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
  
  console.log('\n📋 VALIDATION SUMMARY');
  console.log('=====================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    allResults
      .filter(r => !r.success)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${result.description || result.script || 'Unknown test'}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
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
  console.log('🚀 VALIDATING AUDIT IMPLEMENTATION');
  console.log('===================================');
  console.log('This script validates that all audit components are working correctly');
  console.log('and ensures no regressions were introduced.\n');
  
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
  
  console.log(`\nValidation completed in ${duration}s`);
  
  if (report.failedTests === 0) {
    console.log('\n🎉 ALL VALIDATIONS PASSED!');
    console.log('The continuous audit and monitoring process has been successfully implemented.');
    console.log('\nNext steps:');
    console.log('1. Run "npm run audit:setup-hooks" to install Git hooks');
    console.log('2. Run "npm run audit:continuous" to perform your first audit');
    console.log('3. Review the documentation in audits/AUDIT_QUICK_START.md');
    
    process.exit(0);
  } else {
    console.log('\n❌ VALIDATION FAILED');
    console.log('Some components are not working correctly. Please review the failed tests above.');
    
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