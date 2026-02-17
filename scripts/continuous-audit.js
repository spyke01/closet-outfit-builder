#!/usr/bin/env node

/**
 * Continuous Audit Script
 * Runs comprehensive security, quality, and accessibility audits
 * Can be executed manually or scheduled via CI/CD
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const AUDIT_DIR = 'audits';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure audits directory exists
if (!existsSync(AUDIT_DIR)) {
  mkdirSync(AUDIT_DIR, { recursive: true });
}

/**
 * Execute command and capture output
 */
function executeCommand(command, description) {
  console.info(`\n🔍 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    console.info(`✅ ${description} completed`);
    return { success: true, output, error: null };
  } catch (error) {
    console.info(`❌ ${description} failed: ${error.message}`);
    return { success: false, output: error.stdout || '', error: error.message };
  }
}

/**
 * Security Audit
 */
function runSecurityAudit() {
  console.info('\n🛡️  SECURITY AUDIT');
  console.info('==================');
  
  const results = {
    npmAudit: executeCommand('npm audit --json', 'NPM Security Audit'),
    outdatedPackages: executeCommand('npm outdated --json', 'Outdated Package Check')
  };
  
  return results;
}

/**
 * Code Quality Audit
 */
function runQualityAudit() {
  console.info('\n📊 CODE QUALITY AUDIT');
  console.info('=====================');
  
  const results = {
    eslint: executeCommand('npm run lint', 'ESLint Analysis'),
    typescript: executeCommand('npx tsc --noEmit', 'TypeScript Type Check'),
    testCoverage: executeCommand('npm run test:run -- --coverage --reporter=json', 'Test Coverage Analysis')
  };
  
  return results;
}

/**
 * Accessibility Audit
 */
function runAccessibilityAudit() {
  console.info('\n♿ ACCESSIBILITY AUDIT');
  console.info('=====================');
  
  const results = {
    a11yLint: executeCommand('npm run lint:a11y', 'Accessibility Linting'),
    a11yTests: executeCommand('npm run test:a11y', 'Accessibility Tests'),
    keyboardTests: executeCommand('npm run test:keyboard', 'Keyboard Navigation Tests')
  };
  
  return results;
}

/**
 * Build and Performance Audit
 */
function runBuildAudit() {
  console.info('\n🏗️  BUILD & PERFORMANCE AUDIT');
  console.info('=============================');
  
  const results = {
    build: executeCommand('npm run build', 'Production Build Test'),
    bundleAnalysis: executeCommand('npx vite-bundle-analyzer dist --json', 'Bundle Size Analysis')
  };
  
  return results;
}

/**
 * Generate comprehensive audit report
 */
function generateAuditReport(auditResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      criticalIssues: 0
    },
    security: auditResults.security,
    quality: auditResults.quality,
    accessibility: auditResults.accessibility,
    build: auditResults.build,
    recommendations: []
  };
  
  // Calculate summary statistics
  Object.values(auditResults).forEach(category => {
    Object.values(category).forEach(result => {
      report.summary.totalChecks++;
      if (result.success) {
        report.summary.passedChecks++;
      } else {
        report.summary.failedChecks++;
        // Check for critical issues (security vulnerabilities, build failures)
        if (result.error && (
          result.error.includes('critical') || 
          result.error.includes('high') ||
          result.error.includes('build failed')
        )) {
          report.summary.criticalIssues++;
        }
      }
    });
  });
  
  // Generate recommendations based on failures
  if (report.summary.failedChecks > 0) {
    report.recommendations.push('Review failed audit checks and implement fixes');
  }
  if (report.summary.criticalIssues > 0) {
    report.recommendations.push('Address critical security vulnerabilities immediately');
  }
  if (!auditResults.security.npmAudit.success) {
    report.recommendations.push('Run npm audit fix to resolve security vulnerabilities');
  }
  if (!auditResults.quality.eslint.success) {
    report.recommendations.push('Fix ESLint violations to improve code quality');
  }
  if (!auditResults.accessibility.a11yLint.success) {
    report.recommendations.push('Address accessibility violations for WCAG compliance');
  }
  
  return report;
}

/**
 * Main audit execution
 */
async function runContinuousAudit() {
  console.info('🚀 Starting Continuous Audit Process');
  console.info('====================================');
  
  const startTime = Date.now();
  
  // Run all audit categories
  const auditResults = {
    security: runSecurityAudit(),
    quality: runQualityAudit(),
    accessibility: runAccessibilityAudit(),
    build: runBuildAudit()
  };
  
  // Generate comprehensive report
  const report = generateAuditReport(auditResults);
  
  // Save report to file
  const reportPath = join(AUDIT_DIR, `continuous-audit-${TIMESTAMP}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Save latest report (for CI/CD integration)
  const latestReportPath = join(AUDIT_DIR, 'latest-audit-report.json');
  writeFileSync(latestReportPath, JSON.stringify(report, null, 2));
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.info('\n📋 AUDIT SUMMARY');
  console.info('================');
  console.info(`Total Checks: ${report.summary.totalChecks}`);
  console.info(`Passed: ${report.summary.passedChecks}`);
  console.info(`Failed: ${report.summary.failedChecks}`);
  console.info(`Critical Issues: ${report.summary.criticalIssues}`);
  console.info(`Duration: ${duration}s`);
  console.info(`Report saved: ${reportPath}`);
  
  if (report.recommendations.length > 0) {
    console.info('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, index) => {
      console.info(`${index + 1}. ${rec}`);
    });
  }
  
  // Exit with error code if critical issues found
  if (report.summary.criticalIssues > 0) {
    console.info('\n❌ Critical issues detected. Exiting with error code 1.');
    process.exit(1);
  }
  
  console.info('\n✅ Continuous audit completed successfully!');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runContinuousAudit().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

export { runContinuousAudit };