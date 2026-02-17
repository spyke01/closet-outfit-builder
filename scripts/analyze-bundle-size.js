#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Analyzes webpack bundle stats and compares with baseline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASELINE_FILE = path.join(__dirname, '..', 'baseline-bundle-stats.json');
const CURRENT_FILE = path.join(__dirname, '..', 'bundle-stats.json');
const REPORT_FILE = path.join(__dirname, '..', 'docs', 'bundle-size-validation.md');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundleStats(statsPath) {
  if (!fs.existsSync(statsPath)) {
    console.error(`Stats file not found: ${statsPath}`);
    return null;
  }

  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  
  // Calculate total size of JavaScript assets
  let totalJsSize = 0;
  let totalCssSize = 0;
  let totalAssetSize = 0;
  const jsAssets = [];
  const cssAssets = [];
  const largeAssets = [];

  stats.assets.forEach(asset => {
    totalAssetSize += asset.size;
    
    if (asset.name.endsWith('.js')) {
      totalJsSize += asset.size;
      jsAssets.push({ name: asset.name, size: asset.size });
      
      // Flag assets over 100KB
      if (asset.size > 100 * 1024) {
        largeAssets.push({ name: asset.name, size: asset.size, type: 'js' });
      }
    } else if (asset.name.endsWith('.css')) {
      totalCssSize += asset.size;
      cssAssets.push({ name: asset.name, size: asset.size });
    }
  });

  // Sort by size descending
  jsAssets.sort((a, b) => b.size - a.size);
  cssAssets.sort((a, b) => b.size - a.size);
  largeAssets.sort((a, b) => b.size - a.size);

  return {
    totalJsSize,
    totalCssSize,
    totalAssetSize,
    jsAssets: jsAssets.slice(0, 20), // Top 20
    cssAssets,
    largeAssets,
    assetCount: stats.assets.length,
    buildTime: stats.time,
    builtAt: new Date(stats.builtAt).toISOString()
  };
}

function compareWithBaseline(current, baseline) {
  const jsSizeReduction = baseline.totalJsSize - current.totalJsSize;
  const jsSizeReductionPercent = (jsSizeReduction / baseline.totalJsSize) * 100;
  
  const cssSizeReduction = baseline.totalCssSize - current.totalCssSize;
  const cssSizeReductionPercent = (cssSizeReduction / baseline.totalCssSize) * 100;
  
  const totalReduction = baseline.totalAssetSize - current.totalAssetSize;
  const totalReductionPercent = (totalReduction / baseline.totalAssetSize) * 100;

  return {
    jsSizeReduction,
    jsSizeReductionPercent,
    cssSizeReduction,
    cssSizeReductionPercent,
    totalReduction,
    totalReductionPercent,
    meetsTarget: totalReductionPercent >= 20
  };
}

function generateReport(current, baseline, comparison) {
  const timestamp = new Date().toISOString();
  
  let report = `# Bundle Size Validation Report

**Generated:** ${timestamp}
**Task:** 1.7 Validate bundle size reduction
**Target:** 20% reduction in total bundle size

## Summary

`;

  if (baseline) {
    report += `### Comparison with Baseline

| Metric | Baseline | Current | Change | % Change |
|--------|----------|---------|--------|----------|
| **Total JS Size** | ${formatBytes(baseline.totalJsSize)} | ${formatBytes(current.totalJsSize)} | ${comparison.jsSizeReduction > 0 ? '-' : '+'}${formatBytes(Math.abs(comparison.jsSizeReduction))} | ${comparison.jsSizeReductionPercent.toFixed(2)}% |
| **Total CSS Size** | ${formatBytes(baseline.totalCssSize)} | ${formatBytes(current.totalCssSize)} | ${comparison.cssSizeReduction > 0 ? '-' : '+'}${formatBytes(Math.abs(comparison.cssSizeReduction))} | ${comparison.cssSizeReductionPercent.toFixed(2)}% |
| **Total Assets** | ${formatBytes(baseline.totalAssetSize)} | ${formatBytes(current.totalAssetSize)} | ${comparison.totalReduction > 0 ? '-' : '+'}${formatBytes(Math.abs(comparison.totalReduction))} | ${comparison.totalReductionPercent.toFixed(2)}% |

### Target Achievement

- **Target:** 20% reduction in total bundle size
- **Achieved:** ${comparison.totalReductionPercent.toFixed(2)}%
- **Status:** ${comparison.meetsTarget ? '✅ **PASSED**' : '❌ **NOT MET**'}

`;
  } else {
    report += `### Current Bundle Size (Baseline)

| Metric | Size |
|--------|------|
| **Total JS Size** | ${formatBytes(current.totalJsSize)} |
| **Total CSS Size** | ${formatBytes(current.totalCssSize)} |
| **Total Assets** | ${formatBytes(current.totalAssetSize)} |
| **Asset Count** | ${current.assetCount} |
| **Build Time** | ${current.buildTime}ms |

*This is the baseline measurement. Run optimizations and re-analyze to compare.*

`;
  }

  report += `## Current Bundle Analysis

### JavaScript Assets (Top 20)

| Asset | Size | Notes |
|-------|------|-------|
`;

  current.jsAssets.forEach(asset => {
    const isLarge = asset.size > 100 * 1024;
    const warning = isLarge ? ' ⚠️ Large' : '';
    report += `| \`${asset.name}\` | ${formatBytes(asset.size)} |${warning} |\n`;
  });

  if (current.cssAssets.length > 0) {
    report += `\n### CSS Assets\n\n| Asset | Size |\n|-------|------|\n`;
    current.cssAssets.forEach(asset => {
      report += `| \`${asset.name}\` | ${formatBytes(asset.size)} |\n`;
    });
  }

  if (current.largeAssets.length > 0) {
    report += `\n## Large Assets (>100KB)

The following assets exceed 100KB and may benefit from further optimization:

| Asset | Size | Type |
|-------|------|------|
`;
    current.largeAssets.forEach(asset => {
      report += `| \`${asset.name}\` | ${formatBytes(asset.size)} | ${asset.type.toUpperCase()} |\n`;
    });
  }

  report += `\n## Optimization Recommendations

`;

  if (baseline && comparison.meetsTarget) {
    report += `### ✅ Target Achieved

The bundle size has been successfully reduced by ${comparison.totalReductionPercent.toFixed(2)}%, exceeding the 20% target.

**Key Improvements:**
- JavaScript size reduced by ${formatBytes(Math.abs(comparison.jsSizeReduction))} (${Math.abs(comparison.jsSizeReductionPercent).toFixed(2)}%)
- CSS size ${comparison.cssSizeReduction > 0 ? 'reduced' : 'increased'} by ${formatBytes(Math.abs(comparison.cssSizeReduction))} (${Math.abs(comparison.cssSizeReductionPercent).toFixed(2)}%)

`;
  } else if (baseline && !comparison.meetsTarget) {
    report += `### ❌ Target Not Met

Current reduction: ${comparison.totalReductionPercent.toFixed(2)}% (Target: 20%)
Additional reduction needed: ${(20 - comparison.totalReductionPercent).toFixed(2)}%

**Recommendations:**
1. Review large assets (>100KB) for further optimization opportunities
2. Ensure all lucide-react imports use direct imports instead of barrel imports
3. Verify dynamic imports are properly configured for heavy components
4. Check that third-party libraries are deferred until after hydration
5. Review webpack bundle analyzer report for duplicate dependencies

`;
  }

  if (current.largeAssets.length > 0) {
    report += `### Large Asset Optimization

Consider the following for assets over 100KB:
- **Code splitting:** Use dynamic imports for large components
- **Tree shaking:** Ensure proper ES module imports
- **Compression:** Verify gzip/brotli compression is enabled
- **Lazy loading:** Defer non-critical code until needed

`;
  }

  report += `## Build Information

- **Build Time:** ${current.buildTime}ms
- **Built At:** ${current.builtAt}
- **Total Assets:** ${current.assetCount}

## Next Steps

`;

  if (baseline && comparison.meetsTarget) {
    report += `1. ✅ Bundle size target achieved
2. Monitor bundle size in CI/CD to prevent regressions
3. Continue to task 2.1 (Waterfall Elimination)
4. Document optimization techniques for team reference
`;
  } else if (baseline) {
    report += `1. Review optimization recommendations above
2. Implement additional optimizations
3. Re-run bundle analysis
4. Verify 20% reduction target is met
`;
  } else {
    report += `1. This baseline has been saved to \`baseline-bundle-stats.json\`
2. Implement bundle size optimizations (tasks 1.1-1.6)
3. Re-run this analysis to compare results
4. Verify 20% reduction target is achieved
`;
  }

  return report;
}

function main() {
  console.info('🔍 Analyzing bundle size...\n');

  // Analyze current bundle
  const current = analyzeBundleStats(CURRENT_FILE);
  if (!current) {
    console.error('❌ Failed to analyze current bundle stats');
    process.exit(1);
  }

  console.info(`Current bundle size: ${formatBytes(current.totalAssetSize)}`);
  console.info(`  - JavaScript: ${formatBytes(current.totalJsSize)}`);
  console.info(`  - CSS: ${formatBytes(current.totalCssSize)}`);
  console.info(`  - Assets: ${current.assetCount}\n`);

  // Check for baseline
  let baseline = null;
  let comparison = null;

  if (fs.existsSync(BASELINE_FILE)) {
    console.info('📊 Comparing with baseline...\n');
    baseline = analyzeBundleStats(BASELINE_FILE);
    
    if (baseline) {
      comparison = compareWithBaseline(current, baseline);
      
      console.info(`Baseline bundle size: ${formatBytes(baseline.totalAssetSize)}`);
      console.info(`  - JavaScript: ${formatBytes(baseline.totalJsSize)}`);
      console.info(`  - CSS: ${formatBytes(baseline.totalCssSize)}\n`);
      
      console.info(`📉 Size change: ${comparison.totalReduction > 0 ? '-' : '+'}${formatBytes(Math.abs(comparison.totalReduction))} (${comparison.totalReductionPercent.toFixed(2)}%)`);
      console.info(`   Target: 20% reduction`);
      console.info(`   Status: ${comparison.meetsTarget ? '✅ PASSED' : '❌ NOT MET'}\n`);
    }
  } else {
    console.info('📝 No baseline found. Saving current stats as baseline...\n');
    fs.copyFileSync(CURRENT_FILE, BASELINE_FILE);
    console.info(`✅ Baseline saved to ${BASELINE_FILE}\n`);
  }

  // Generate report
  const report = generateReport(current, baseline, comparison);
  
  // Ensure docs directory exists
  const docsDir = path.dirname(REPORT_FILE);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  fs.writeFileSync(REPORT_FILE, report);
  console.info(`📄 Report generated: ${REPORT_FILE}\n`);

  // Exit with appropriate code
  if (baseline && !comparison.meetsTarget) {
    console.info('❌ Bundle size reduction target not met');
    process.exit(1);
  } else if (baseline && comparison.meetsTarget) {
    console.info('✅ Bundle size reduction target achieved!');
    process.exit(0);
  } else {
    console.info('✅ Baseline established');
    process.exit(0);
  }
}

main();
