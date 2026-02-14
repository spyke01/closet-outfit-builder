#!/usr/bin/env node

/**
 * TypeScript Error Monitoring
 * 
 * Monitors TypeScript compilation errors:
 * - Tracks any type usage over time
 * - Monitors compilation errors
 * - Sets up alerts for type safety regressions
 * 
 * **Validates: Requirements 13.3**
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRENDS_DIR = path.join(__dirname, '..', '.typescript-trends');
const REPORT_FILE = path.join(__dirname, '..', 'tmp', 'typescript-errors.md');
const DEFAULT_BASELINE_TOTAL_ERRORS = 368;
const DEFAULT_BASELINE_ANY_TYPE_ERRORS = 48;

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runTypeScriptCheck() {
  try {
    // Run TypeScript compiler in noEmit mode
    const output = execSync('npx tsc --noEmit --pretty false', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output: '', errors: [] };
  } catch (error) {
    // TypeScript errors are returned via stderr
    const output = error.stdout || error.stderr || '';
    return { success: false, output, errors: parseTypeScriptErrors(output) };
  }
}

function loadBaseline() {
  const totalErrorsRaw = process.env.TS_ERROR_BASELINE_TOTAL;
  const anyTypeErrorsRaw = process.env.TS_ERROR_BASELINE_ANY;

  const totalErrors = Number.isFinite(Number(totalErrorsRaw))
    ? Number(totalErrorsRaw)
    : DEFAULT_BASELINE_TOTAL_ERRORS;
  const anyTypeErrors = Number.isFinite(Number(anyTypeErrorsRaw))
    ? Number(anyTypeErrorsRaw)
    : DEFAULT_BASELINE_ANY_TYPE_ERRORS;

  return {
    totalErrors,
    anyTypeErrors
  };
}

function evaluateGate(analysis, baseline) {
  if (!baseline) {
    return {
      status: analysis.totalErrors === 0 ? 'pass' : 'fail',
      reasons: analysis.totalErrors === 0
        ? []
        : ['No TypeScript baseline found and errors are present'],
    };
  }

  const reasons = [];
  const allowedAnyTypeErrors = baseline.anyTypeErrors ?? 0;
  const allowedTotalErrors = baseline.totalErrors ?? 0;

  if (analysis.anyTypeErrors > allowedAnyTypeErrors) {
    reasons.push(
      `Any-type errors increased (${analysis.anyTypeErrors} > ${allowedAnyTypeErrors})`
    );
  }

  if (analysis.totalErrors > allowedTotalErrors) {
    reasons.push(
      `Total TypeScript errors increased (${analysis.totalErrors} > ${allowedTotalErrors})`
    );
  }

  return {
    status: reasons.length > 0 ? 'fail' : 'pass',
    reasons,
  };
}

function parseTypeScriptErrors(output) {
  const errors = [];
  const lines = output.split('\n');
  
  let currentError = null;
  
  for (const line of lines) {
    // Match error lines: file.ts(line,col): error TS####: message
    const errorMatch = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    
    if (errorMatch) {
      if (currentError) {
        errors.push(currentError);
      }
      
      currentError = {
        file: errorMatch[1],
        line: parseInt(errorMatch[2]),
        column: parseInt(errorMatch[3]),
        code: errorMatch[4],
        message: errorMatch[5],
        isAnyType: errorMatch[5].includes('any') || errorMatch[4] === 'TS7006'
      };
    } else if (currentError && line.trim()) {
      // Continuation of error message
      currentError.message += ' ' + line.trim();
    }
  }
  
  if (currentError) {
    errors.push(currentError);
  }
  
  return errors;
}

function analyzeErrors(errors) {
  const analysis = {
    totalErrors: errors.length,
    anyTypeErrors: 0,
    strictNullErrors: 0,
    implicitAnyErrors: 0,
    otherErrors: 0,
    errorsByFile: {},
    errorsByCode: {}
  };

  errors.forEach(error => {
    // Count by type
    if (error.isAnyType || error.code === 'TS7006' || error.code === 'TS7031') {
      analysis.anyTypeErrors++;
    } else if (error.code === 'TS2531' || error.code === 'TS2532' || error.code === 'TS2533') {
      analysis.strictNullErrors++;
    } else if (error.code === 'TS7006') {
      analysis.implicitAnyErrors++;
    } else {
      analysis.otherErrors++;
    }

    // Count by file
    if (!analysis.errorsByFile[error.file]) {
      analysis.errorsByFile[error.file] = 0;
    }
    analysis.errorsByFile[error.file]++;

    // Count by error code
    if (!analysis.errorsByCode[error.code]) {
      analysis.errorsByCode[error.code] = 0;
    }
    analysis.errorsByCode[error.code]++;
  });

  return analysis;
}

function saveTrend(analysis) {
  ensureDirectoryExists(TRENDS_DIR);

  const trend = {
    timestamp: Date.now(),
    date: new Date().toISOString(),
    ...analysis
  };

  // Save current analysis
  const trendFile = path.join(TRENDS_DIR, `${trend.timestamp}.json`);
  fs.writeFileSync(trendFile, JSON.stringify(trend, null, 2));

  // Keep only last 30 builds
  const trendFiles = fs.readdirSync(TRENDS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(TRENDS_DIR, f),
      timestamp: parseInt(f.replace('.json', ''))
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  if (trendFiles.length > 30) {
    trendFiles.slice(30).forEach(file => {
      fs.unlinkSync(file.path);
    });
  }

  return trendFiles.slice(0, 30);
}

function analyzeTrends(trends) {
  if (trends.length < 2) {
    return null;
  }

  const current = JSON.parse(fs.readFileSync(trends[0].path, 'utf8'));
  const previous = JSON.parse(fs.readFileSync(trends[1].path, 'utf8'));

  const totalDelta = current.totalErrors - previous.totalErrors;
  const anyTypeDelta = current.anyTypeErrors - previous.anyTypeErrors;

  // Calculate trend over last 7 builds
  const recentTrends = trends.slice(0, Math.min(7, trends.length));
  const errorCounts = recentTrends.map(t => {
    const data = JSON.parse(fs.readFileSync(t.path, 'utf8'));
    return data.totalErrors;
  });

  const avgErrors = errorCounts.reduce((a, b) => a + b, 0) / errorCounts.length;
  const isIncreasing = errorCounts[0] > avgErrors;

  return {
    totalDelta,
    anyTypeDelta,
    isIncreasing,
    avgErrors,
    buildCount: trends.length
  };
}

function generateReport(analysis, trends, trendAnalysis, errors, baseline, gate) {
  let report = `# TypeScript Error Monitoring Report

**Generated:** ${new Date().toISOString()}
**Task:** 16.3 Add TypeScript error monitoring
**Target:** Zero \`any\` types and minimal TypeScript errors

## Summary

`;

  report += `### Current Status

| Metric | Count |
|--------|-------|
| **Total Errors** | ${analysis.totalErrors} |
| **Any Type Errors** | ${analysis.anyTypeErrors} |
| **Strict Null Errors** | ${analysis.strictNullErrors} |
| **Implicit Any Errors** | ${analysis.implicitAnyErrors} |
| **Other Errors** | ${analysis.otherErrors} |

`;

  if (trendAnalysis) {
    report += `### Trend Analysis

| Metric | Value |
|--------|-------|
| **vs Previous Build** | ${trendAnalysis.totalDelta > 0 ? '+' : ''}${trendAnalysis.totalDelta} errors |
| **Any Type Change** | ${trendAnalysis.anyTypeDelta > 0 ? '+' : ''}${trendAnalysis.anyTypeDelta} |
| **7-Build Average** | ${trendAnalysis.avgErrors.toFixed(1)} errors |
| **Trend** | ${trendAnalysis.isIncreasing ? '📈 Increasing' : '📉 Decreasing'} |
| **Builds Tracked** | ${trendAnalysis.buildCount} |

`;
  }

  // Status indicator
  if (gate.status === 'pass' && analysis.totalErrors === 0) {
    report += `### ✅ Status: PASSED

No TypeScript errors detected. Excellent type safety!

`;
  } else if (gate.status === 'pass') {
    const baselineSummary = baseline
      ? `Baseline allows up to ${baseline.totalErrors} total errors and ${baseline.anyTypeErrors} any-type errors.`
      : 'No baseline required because there are no errors.';

    report += `### ✅ Status: PASSED (No Regression)

Current TypeScript debt is at or below the established baseline.
${baselineSummary}

`;
  } else if (analysis.anyTypeErrors === 0) {
    report += `### ⚠️ Status: NEEDS IMPROVEMENT

No \`any\` type errors, but ${analysis.totalErrors} other TypeScript errors exist.

`;
  } else {
    report += `### ❌ Status: FAILED

${analysis.anyTypeErrors} \`any\` type errors detected. Target is zero.

`;
  }

  // Top files with errors
  if (Object.keys(analysis.errorsByFile).length > 0) {
    report += `## Files with Most Errors

| File | Error Count |
|------|-------------|
`;
    const sortedFiles = Object.entries(analysis.errorsByFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedFiles.forEach(([file, count]) => {
      report += `| \`${file}\` | ${count} |\n`;
    });
    report += '\n';
  }

  // Error codes breakdown
  if (Object.keys(analysis.errorsByCode).length > 0) {
    report += `## Error Codes Breakdown

| Error Code | Count | Description |
|------------|-------|-------------|
`;
    const sortedCodes = Object.entries(analysis.errorsByCode)
      .sort((a, b) => b[1] - a[1]);

    const codeDescriptions = {
      'TS7006': 'Parameter implicitly has an "any" type',
      'TS7031': 'Binding element implicitly has an "any" type',
      'TS2531': 'Object is possibly "null"',
      'TS2532': 'Object is possibly "undefined"',
      'TS2533': 'Object is possibly "null" or "undefined"',
      'TS2345': 'Argument type not assignable to parameter type',
      'TS2322': 'Type not assignable to type',
      'TS2339': 'Property does not exist on type'
    };

    sortedCodes.forEach(([code, count]) => {
      const description = codeDescriptions[code] || 'TypeScript error';
      report += `| \`${code}\` | ${count} | ${description} |\n`;
    });
    report += '\n';
  }

  if (gate.reasons.length > 0) {
    report += `## Gate Failures

`;
    gate.reasons.forEach((reason) => {
      report += `- ${reason}\n`;
    });
    report += '\n';
  }

  // Sample errors
  if (errors.length > 0) {
    report += `## Sample Errors (First 10)

\`\`\`
`;
    errors.slice(0, 10).forEach(error => {
      report += `${error.file}(${error.line},${error.column}): error ${error.code}: ${error.message}\n`;
    });
    report += `\`\`\`

`;
  }

  report += `## Recommendations

`;

  if (analysis.anyTypeErrors > 0) {
    report += `### Fix Any Type Errors

Priority: **HIGH**

${analysis.anyTypeErrors} files contain \`any\` types. These should be replaced with proper TypeScript types:

1. Review files with most \`any\` type errors
2. Create proper interfaces and types
3. Use generic types for reusable functions
4. Add type definitions for external libraries
5. Enable strict mode in tsconfig.json

`;
  }

  if (analysis.strictNullErrors > 0) {
    report += `### Fix Strict Null Errors

Priority: **MEDIUM**

${analysis.strictNullErrors} strict null check errors detected:

1. Add null checks before accessing properties
2. Use optional chaining (\`?.\`)
3. Use nullish coalescing (\`??\`)
4. Add proper type guards

`;
  }

  if (trendAnalysis && trendAnalysis.isIncreasing) {
    report += `### ⚠️ Increasing Error Trend

The number of TypeScript errors is increasing over recent builds. This indicates:

1. New code is being added without proper types
2. Type safety is regressing
3. Code review process may need strengthening

**Action:** Review recent changes and ensure all new code has proper types.

`;
  }

  report += `## Next Steps

`;

  if (analysis.totalErrors === 0) {
    report += `1. ✅ Maintain zero TypeScript errors
2. Set up pre-commit hooks to prevent new errors
3. Monitor trends to catch regressions early
4. Document type patterns for team reference
`;
  } else {
    report += `1. Fix high-priority \`any\` type errors first
2. Address strict null check errors
3. Enable stricter TypeScript settings incrementally
4. Set up pre-commit hooks to prevent new errors
5. Re-run this analysis to track progress
`;
  }

  return report;
}

function generateConsoleReport(analysis, trendAnalysis, baseline, gate) {
  console.log('\n📊 TypeScript Error Monitoring Report\n');
  console.log('═'.repeat(60));
  
  console.log('\n📝 Current Status:');
  console.log(`  Total Errors:        ${analysis.totalErrors}`);
  console.log(`  Any Type Errors:     ${analysis.anyTypeErrors}`);
  console.log(`  Strict Null Errors:  ${analysis.strictNullErrors}`);
  console.log(`  Implicit Any Errors: ${analysis.implicitAnyErrors}`);
  console.log(`  Other Errors:        ${analysis.otherErrors}`);

  if (trendAnalysis) {
    console.log('\n📈 Trend Analysis:');
    console.log(`  vs Previous:  ${trendAnalysis.totalDelta > 0 ? '+' : ''}${trendAnalysis.totalDelta} errors`);
    console.log(`  Any Type Δ:   ${trendAnalysis.anyTypeDelta > 0 ? '+' : ''}${trendAnalysis.anyTypeDelta}`);
    console.log(`  7-Build Avg:  ${trendAnalysis.avgErrors.toFixed(1)} errors`);
    console.log(`  Trend:        ${trendAnalysis.isIncreasing ? '📈 Increasing' : '📉 Decreasing'}`);
  }

  if (gate.status === 'pass' && analysis.totalErrors === 0) {
    console.log('\n✅ Status: PASSED - No TypeScript errors!');
  } else if (gate.status === 'pass') {
    if (baseline) {
      console.log(
        `\n✅ Status: PASSED (No Regression) - within baseline (total ${analysis.totalErrors}/${baseline.totalErrors}, any ${analysis.anyTypeErrors}/${baseline.anyTypeErrors})`
      );
    } else {
      console.log('\n✅ Status: PASSED (No Regression)');
    }
  } else if (analysis.anyTypeErrors === 0) {
    console.log('\n⚠️  Status: NEEDS IMPROVEMENT - No any types, but other errors exist');
  } else {
    console.log(`\n❌ Status: FAILED - ${analysis.anyTypeErrors} any type errors detected`);
  }

  console.log('\n' + '═'.repeat(60));
}

function main() {
  console.log('🔍 Running TypeScript error monitoring...\n');
  const baseline = loadBaseline();

  // Run TypeScript check
  const result = runTypeScriptCheck();

  if (result.success) {
    console.log('✅ No TypeScript errors detected!\n');
    
    const analysis = {
      totalErrors: 0,
      anyTypeErrors: 0,
      strictNullErrors: 0,
      implicitAnyErrors: 0,
      otherErrors: 0,
      errorsByFile: {},
      errorsByCode: {}
    };

    // Save trend
    const trends = saveTrend(analysis);
    const trendAnalysis = analyzeTrends(trends);

    // Generate reports
    const gate = evaluateGate(analysis, baseline);
    generateConsoleReport(analysis, trendAnalysis, baseline, gate);
    const report = generateReport(analysis, trends, trendAnalysis, [], baseline, gate);
    
    ensureDirectoryExists(path.dirname(REPORT_FILE));
    fs.writeFileSync(REPORT_FILE, report);
    console.log(`\n📄 Report saved: ${REPORT_FILE}\n`);

    process.exit(0);
  }

  // Analyze errors
  const analysis = analyzeErrors(result.errors);
  const gate = evaluateGate(analysis, baseline);

  // Save trend
  const trends = saveTrend(analysis);
  const trendAnalysis = analyzeTrends(trends);

  // Generate reports
  generateConsoleReport(analysis, trendAnalysis, baseline, gate);
  const report = generateReport(
    analysis,
    trends,
    trendAnalysis,
    result.errors,
    baseline,
    gate
  );
  
  ensureDirectoryExists(path.dirname(REPORT_FILE));
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`\n📄 Report saved: ${REPORT_FILE}\n`);

  // Fail only when strict gate regresses vs baseline (or baseline is missing with errors present)
  if (gate.status === 'fail') {
    console.log('❌ TypeScript strict gate failed:');
    gate.reasons.forEach((reason) => {
      console.log(`   - ${reason}`);
    });
    console.log('');
    process.exit(1);
  }

  // Warn about existing debt, but pass when not regressing.
  if (analysis.totalErrors > 0) {
    if (baseline) {
      console.log(
        `⚠️  TypeScript debt present but within baseline (${analysis.totalErrors}/${baseline.totalErrors} total, ${analysis.anyTypeErrors}/${baseline.anyTypeErrors} any-type)\n`
      );
    } else {
      console.log(`⚠️  Warning: ${analysis.totalErrors} TypeScript errors exist\n`);
    }
  }

  process.exit(0);
}

main();
