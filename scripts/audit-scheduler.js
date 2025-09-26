#!/usr/bin/env node

/**
 * Audit Scheduler Script
 * Manages scheduled audits and generates trend reports
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { runContinuousAudit } from './continuous-audit.js';

const AUDIT_DIR = 'audits';
const SCHEDULE_CONFIG = join(AUDIT_DIR, 'audit-schedule.json');
const TRENDS_REPORT = join(AUDIT_DIR, 'audit-trends.json');

/**
 * Default audit schedule configuration
 */
const DEFAULT_SCHEDULE = {
  daily: {
    enabled: true,
    time: '09:00',
    checks: ['security', 'quality']
  },
  weekly: {
    enabled: true,
    day: 'monday',
    time: '08:00',
    checks: ['security', 'quality', 'accessibility', 'build']
  },
  monthly: {
    enabled: true,
    day: 1,
    time: '07:00',
    checks: ['security', 'quality', 'accessibility', 'build', 'documentation']
  },
  notifications: {
    email: null,
    slack: null,
    webhook: null
  },
  thresholds: {
    criticalIssues: 0,
    failedChecks: 3,
    coverageThreshold: 80
  }
};

/**
 * Load or create schedule configuration
 */
function loadScheduleConfig() {
  if (!existsSync(SCHEDULE_CONFIG)) {
    writeFileSync(SCHEDULE_CONFIG, JSON.stringify(DEFAULT_SCHEDULE, null, 2));
    console.log('📅 Created default audit schedule configuration');
    return DEFAULT_SCHEDULE;
  }
  
  try {
    const config = JSON.parse(readFileSync(SCHEDULE_CONFIG, 'utf8'));
    return { ...DEFAULT_SCHEDULE, ...config };
  } catch (error) {
    console.log('⚠️  Invalid schedule config, using defaults');
    return DEFAULT_SCHEDULE;
  }
}

/**
 * Get all audit report files
 */
function getAuditReports() {
  if (!existsSync(AUDIT_DIR)) {
    return [];
  }
  
  return readdirSync(AUDIT_DIR)
    .filter(file => file.startsWith('continuous-audit-') && file.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first
}

/**
 * Load audit report
 */
function loadAuditReport(filename) {
  try {
    const content = readFileSync(join(AUDIT_DIR, filename), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.log(`⚠️  Could not load report: ${filename}`);
    return null;
  }
}

/**
 * Generate trends analysis
 */
function generateTrendsReport() {
  console.log('📊 Generating audit trends report...');
  
  const reportFiles = getAuditReports().slice(0, 30); // Last 30 reports
  const reports = reportFiles
    .map(loadAuditReport)
    .filter(report => report !== null);
  
  if (reports.length === 0) {
    console.log('⚠️  No audit reports found for trends analysis');
    return null;
  }
  
  const trends = {
    generatedAt: new Date().toISOString(),
    reportCount: reports.length,
    dateRange: {
      from: reports[reports.length - 1]?.timestamp,
      to: reports[0]?.timestamp
    },
    metrics: {
      averagePassRate: 0,
      criticalIssuesTrend: [],
      failedChecksTrend: [],
      coverageTrend: []
    },
    insights: []
  };
  
  // Calculate trends
  let totalPassRate = 0;
  
  reports.forEach((report, index) => {
    const passRate = report.summary.totalChecks > 0 
      ? (report.summary.passedChecks / report.summary.totalChecks) * 100 
      : 0;
    
    totalPassRate += passRate;
    
    trends.metrics.criticalIssuesTrend.push({
      date: report.timestamp,
      value: report.summary.criticalIssues
    });
    
    trends.metrics.failedChecksTrend.push({
      date: report.timestamp,
      value: report.summary.failedChecks
    });
    
    // Extract coverage if available
    const coverage = extractCoverageFromReport(report);
    if (coverage) {
      trends.metrics.coverageTrend.push({
        date: report.timestamp,
        value: coverage
      });
    }
  });
  
  trends.metrics.averagePassRate = totalPassRate / reports.length;
  
  // Generate insights
  generateInsights(trends, reports);
  
  // Save trends report
  writeFileSync(TRENDS_REPORT, JSON.stringify(trends, null, 2));
  console.log(`✅ Trends report saved: ${TRENDS_REPORT}`);
  
  return trends;
}

/**
 * Extract coverage percentage from report
 */
function extractCoverageFromReport(report) {
  try {
    if (report.quality?.testCoverage?.output) {
      const coverageData = JSON.parse(report.quality.testCoverage.output);
      return coverageData.total?.statements?.pct || null;
    }
  } catch (error) {
    // Coverage data not available or malformed
  }
  return null;
}

/**
 * Generate insights from trends data
 */
function generateInsights(trends, reports) {
  const recent = reports.slice(0, 5);
  const older = reports.slice(-5);
  
  // Critical issues trend
  const recentCritical = recent.reduce((sum, r) => sum + r.summary.criticalIssues, 0) / recent.length;
  const olderCritical = older.reduce((sum, r) => sum + r.summary.criticalIssues, 0) / older.length;
  
  if (recentCritical > olderCritical) {
    trends.insights.push('⚠️  Critical issues are increasing over time');
  } else if (recentCritical < olderCritical) {
    trends.insights.push('✅ Critical issues are decreasing over time');
  }
  
  // Pass rate trend
  if (trends.metrics.averagePassRate > 90) {
    trends.insights.push('🎉 Excellent audit pass rate (>90%)');
  } else if (trends.metrics.averagePassRate < 70) {
    trends.insights.push('🔴 Low audit pass rate (<70%) - needs attention');
  }
  
  // Coverage trend
  const coverageData = trends.metrics.coverageTrend;
  if (coverageData.length >= 2) {
    const latestCoverage = coverageData[0].value;
    const previousCoverage = coverageData[1].value;
    
    if (latestCoverage > previousCoverage) {
      trends.insights.push('📈 Test coverage is improving');
    } else if (latestCoverage < previousCoverage) {
      trends.insights.push('📉 Test coverage is declining');
    }
  }
  
  // Consistency check
  const failedChecksVariance = calculateVariance(
    trends.metrics.failedChecksTrend.map(t => t.value)
  );
  
  if (failedChecksVariance > 5) {
    trends.insights.push('🔄 Inconsistent audit results - consider process improvements');
  } else {
    trends.insights.push('✅ Consistent audit performance');
  }
}

/**
 * Calculate variance for trend analysis
 */
function calculateVariance(values) {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Run scheduled audit
 */
async function runScheduledAudit(scheduleType = 'manual') {
  console.log(`🚀 Running ${scheduleType} scheduled audit`);
  console.log('=====================================');
  
  try {
    // Run the continuous audit
    await runContinuousAudit();
    
    // Generate trends report
    generateTrendsReport();
    
    console.log(`✅ ${scheduleType} audit completed successfully`);
    
    // Check thresholds and send notifications if needed
    const config = loadScheduleConfig();
    await checkThresholdsAndNotify(config);
    
  } catch (error) {
    console.error(`❌ ${scheduleType} audit failed:`, error.message);
    throw error;
  }
}

/**
 * Check audit thresholds and send notifications
 */
async function checkThresholdsAndNotify(config) {
  if (!existsSync(join(AUDIT_DIR, 'latest-audit-report.json'))) {
    return;
  }
  
  const latestReport = loadAuditReport('latest-audit-report.json');
  if (!latestReport) return;
  
  const alerts = [];
  
  // Check critical issues threshold
  if (latestReport.summary.criticalIssues > config.thresholds.criticalIssues) {
    alerts.push(`Critical issues detected: ${latestReport.summary.criticalIssues}`);
  }
  
  // Check failed checks threshold
  if (latestReport.summary.failedChecks > config.thresholds.failedChecks) {
    alerts.push(`Too many failed checks: ${latestReport.summary.failedChecks}`);
  }
  
  // Check coverage threshold
  const coverage = extractCoverageFromReport(latestReport);
  if (coverage && coverage < config.thresholds.coverageThreshold) {
    alerts.push(`Test coverage below threshold: ${coverage}%`);
  }
  
  if (alerts.length > 0) {
    console.log('\n🚨 AUDIT ALERTS');
    console.log('===============');
    alerts.forEach(alert => console.log(`⚠️  ${alert}`));
    
    // TODO: Implement actual notification sending (email, Slack, webhook)
    // This would require additional configuration and service integration
  }
}

/**
 * Display audit schedule status
 */
function showScheduleStatus() {
  const config = loadScheduleConfig();
  
  console.log('📅 AUDIT SCHEDULE STATUS');
  console.log('========================');
  console.log(`Daily audits: ${config.daily.enabled ? '✅ Enabled' : '❌ Disabled'} (${config.daily.time})`);
  console.log(`Weekly audits: ${config.weekly.enabled ? '✅ Enabled' : '❌ Disabled'} (${config.weekly.day} ${config.weekly.time})`);
  console.log(`Monthly audits: ${config.monthly.enabled ? '✅ Enabled' : '❌ Disabled'} (day ${config.monthly.day} ${config.monthly.time})`);
  
  console.log('\n🎯 THRESHOLDS');
  console.log('=============');
  console.log(`Critical issues: ${config.thresholds.criticalIssues}`);
  console.log(`Failed checks: ${config.thresholds.failedChecks}`);
  console.log(`Coverage: ${config.thresholds.coverageThreshold}%`);
  
  const reportFiles = getAuditReports();
  console.log(`\n📊 AUDIT HISTORY: ${reportFiles.length} reports available`);
  
  if (reportFiles.length > 0) {
    console.log(`Latest: ${reportFiles[0]}`);
  }
}

/**
 * Main scheduler execution
 */
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      await runScheduledAudit('manual');
      break;
    case 'trends':
      generateTrendsReport();
      break;
    case 'status':
      showScheduleStatus();
      break;
    case 'daily':
      await runScheduledAudit('daily');
      break;
    case 'weekly':
      await runScheduledAudit('weekly');
      break;
    case 'monthly':
      await runScheduledAudit('monthly');
      break;
    default:
      console.log('🔧 Audit Scheduler Usage:');
      console.log('=========================');
      console.log('node scripts/audit-scheduler.js run     - Run manual audit');
      console.log('node scripts/audit-scheduler.js trends  - Generate trends report');
      console.log('node scripts/audit-scheduler.js status  - Show schedule status');
      console.log('node scripts/audit-scheduler.js daily   - Run daily audit');
      console.log('node scripts/audit-scheduler.js weekly  - Run weekly audit');
      console.log('node scripts/audit-scheduler.js monthly - Run monthly audit');
      break;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Scheduler failed:', error);
    process.exit(1);
  });
}

export { runScheduledAudit, generateTrendsReport, loadScheduleConfig };