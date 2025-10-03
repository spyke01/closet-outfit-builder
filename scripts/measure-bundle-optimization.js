#!/usr/bin/env node

/**
 * Script to measure CSS bundle optimization and performance improvements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.warn(`Could not get size for ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Find files by pattern
 */
function findFiles(directory, pattern) {
  try {
    const files = fs.readdirSync(directory);
    return files.filter(file => pattern.test(file));
  } catch (error) {
    console.warn(`Could not read directory ${directory}:`, error.message);
    return [];
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate gzip size estimate
 */
function estimateGzipSize(size) {
  // Typical gzip compression ratio for CSS is around 80-85%
  return Math.round(size * 0.16);
}

/**
 * Measure bundle sizes
 */
function measureBundleSizes() {
  console.log('📦 Bundle Size Analysis');
  console.log('========================\n');

  // Find CSS files
  const cssFiles = findFiles(ASSETS_DIR, /\.css$/);
  const jsFiles = findFiles(ASSETS_DIR, /\.js$/);

  let totalCssSize = 0;
  let totalJsSize = 0;

  console.log('CSS Files:');
  cssFiles.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const size = getFileSize(filePath);
    const gzipEstimate = estimateGzipSize(size);
    totalCssSize += size;
    
    console.log(`  ${file}: ${formatBytes(size)} (${formatBytes(gzipEstimate)} gzipped)`);
  });

  console.log('\nJavaScript Files:');
  jsFiles.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const size = getFileSize(filePath);
    const gzipEstimate = estimateGzipSize(size);
    totalJsSize += size;
    
    console.log(`  ${file}: ${formatBytes(size)} (${formatBytes(gzipEstimate)} gzipped)`);
  });

  const totalSize = totalCssSize + totalJsSize;
  const totalGzipEstimate = estimateGzipSize(totalSize);

  console.log('\n📊 Summary:');
  console.log(`  Total CSS: ${formatBytes(totalCssSize)} (${formatBytes(estimateGzipSize(totalCssSize))} gzipped)`);
  console.log(`  Total JS: ${formatBytes(totalJsSize)} (${formatBytes(estimateGzipSize(totalJsSize))} gzipped)`);
  console.log(`  Total Bundle: ${formatBytes(totalSize)} (${formatBytes(totalGzipEstimate)} gzipped)`);

  return {
    css: {
      size: totalCssSize,
      gzipSize: estimateGzipSize(totalCssSize),
    },
    javascript: {
      size: totalJsSize,
      gzipSize: estimateGzipSize(totalJsSize),
    },
    total: {
      size: totalSize,
      gzipSize: totalGzipEstimate,
    },
  };
}

/**
 * Analyze Tailwind optimization
 */
function analyzeTailwindOptimization(bundleMetrics) {
  console.log('\n🎨 Tailwind CSS Optimization Analysis');
  console.log('=====================================\n');

  // Baseline estimates for comparison
  const baselineTailwindSize = 3500000; // ~3.5MB unoptimized Tailwind
  const optimizedSize = bundleMetrics.css.size;
  const reduction = ((baselineTailwindSize - optimizedSize) / baselineTailwindSize) * 100;

  console.log(`  Baseline Tailwind CSS: ${formatBytes(baselineTailwindSize)}`);
  console.log(`  Optimized CSS Bundle: ${formatBytes(optimizedSize)}`);
  console.log(`  Size Reduction: ${reduction.toFixed(1)}%`);
  
  // Performance targets
  const targets = {
    css: 100000, // 100KB target for CSS
    total: 500000, // 500KB target for total bundle
  };

  console.log('\n🎯 Performance Targets:');
  console.log(`  CSS Target: ${formatBytes(targets.css)}`);
  console.log(`  CSS Actual: ${formatBytes(bundleMetrics.css.size)} ${bundleMetrics.css.size <= targets.css ? '✅' : '❌'}`);
  console.log(`  Total Target: ${formatBytes(targets.total)}`);
  console.log(`  Total Actual: ${formatBytes(bundleMetrics.total.size)} ${bundleMetrics.total.size <= targets.total ? '✅' : '❌'}`);

  return {
    reduction,
    meetsTargets: {
      css: bundleMetrics.css.size <= targets.css,
      total: bundleMetrics.total.size <= targets.total,
    },
  };
}

/**
 * Generate optimization report
 */
function generateOptimizationReport(bundleMetrics, optimization) {
  const report = {
    timestamp: new Date().toISOString(),
    bundleMetrics,
    optimization,
    recommendations: [],
  };

  // Generate recommendations
  if (!optimization.meetsTargets.css) {
    report.recommendations.push('Consider further CSS optimization and unused class removal');
  }

  if (!optimization.meetsTargets.total) {
    report.recommendations.push('Consider code splitting and lazy loading for JavaScript bundles');
  }

  if (optimization.reduction < 90) {
    report.recommendations.push('Review Tailwind purging configuration for better optimization');
  }

  console.log('\n💡 Recommendations:');
  if (report.recommendations.length === 0) {
    console.log('  ✅ Bundle is well optimized!');
  } else {
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  // Save report
  const reportPath = path.join(__dirname, '..', 'bundle-optimization-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  return report;
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Design System Bundle Optimization Analysis\n');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Build directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  try {
    const bundleMetrics = measureBundleSizes();
    const optimization = analyzeTailwindOptimization(bundleMetrics);
    const report = generateOptimizationReport(bundleMetrics, optimization);

    console.log('\n✅ Analysis complete!');
    
    // Exit with appropriate code
    const allTargetsMet = Object.values(optimization.meetsTargets).every(Boolean);
    process.exit(allTargetsMet ? 0 : 1);
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { measureBundleSizes, analyzeTailwindOptimization, generateOptimizationReport };