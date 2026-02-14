#!/usr/bin/env node

/**
 * Bundle Analysis CI/CD Integration
 * 
 * Automates bundle analysis in CI/CD pipeline:
 * - Generates bundle reports on each build
 * - Tracks bundle size trends over time
 * - Alerts on size regressions
 * 
 * **Validates: Requirements 13.2**
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRENDS_DIR = path.join(__dirname, '..', '.bundle-trends');
const CURRENT_STATS = path.join(__dirname, '..', 'bundle-stats.json');
const SIZE_LIMIT_CONFIG = path.join(__dirname, '..', '.bundle-size-limits.json');
const NEXT_DIR = path.join(__dirname, '..', '.next');
const MANIFEST_CANDIDATES = [
  path.join(NEXT_DIR, 'build-manifest.json'),
  path.join(NEXT_DIR, 'app-build-manifest.json'),
];
const BUILD_CHUNKS_DIR = path.join(NEXT_DIR, 'build', 'chunks');

// Default size limits (in bytes)
const DEFAULT_LIMITS = {
  totalJs: 500 * 1024,      // 500KB
  totalCss: 100 * 1024,     // 100KB
  totalAssets: 1024 * 1024, // 1MB
  maxAssetSize: 200 * 1024  // 200KB per asset
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function loadSizeLimits() {
  if (fs.existsSync(SIZE_LIMIT_CONFIG)) {
    return JSON.parse(fs.readFileSync(SIZE_LIMIT_CONFIG, 'utf8'));
  }
  return DEFAULT_LIMITS;
}

function analyzeBundleStats(statsPath) {
  if (!fs.existsSync(statsPath)) {
    throw new Error(`Stats file not found: ${statsPath}`);
  }

  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  
  let totalJsSize = 0;
  let totalCssSize = 0;
  let totalAssetSize = 0;
  let maxAssetSize = 0;
  const largeAssets = [];

  stats.assets.forEach(asset => {
    totalAssetSize += asset.size;
    maxAssetSize = Math.max(maxAssetSize, asset.size);
    
    if (asset.name.endsWith('.js')) {
      totalJsSize += asset.size;
      if (asset.size > 100 * 1024) {
        largeAssets.push({ name: asset.name, size: asset.size, type: 'js' });
      }
    } else if (asset.name.endsWith('.css')) {
      totalCssSize += asset.size;
    }
  });

  return {
    totalJsSize,
    totalCssSize,
    totalAssetSize,
    maxAssetSize,
    largeAssets,
    assetCount: stats.assets.length,
    buildTime: stats.time,
    timestamp: Date.now(),
    builtAt: new Date(stats.builtAt).toISOString()
  };
}

function analyzeBundleFromManifest() {
  const manifestPath = MANIFEST_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!manifestPath) {
    throw new Error(
      `Stats file not found: ${CURRENT_STATS}, and no build manifest found in ${NEXT_DIR}`
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const files = new Set();

  // Legacy/pages manifest shape.
  if (manifest.pages && typeof manifest.pages === 'object') {
    Object.values(manifest.pages).forEach((pageFiles) => {
      if (Array.isArray(pageFiles)) {
        pageFiles.forEach((file) => files.add(file));
      }
    });
  }

  // Newer Next.js manifest fields.
  ['rootMainFiles', 'polyfillFiles', 'lowPriorityFiles'].forEach((key) => {
    const value = manifest[key];
    if (Array.isArray(value)) {
      value.forEach((file) => files.add(file));
    }
  });

  let totalJsSize = 0;
  let totalCssSize = 0;
  let totalAssetSize = 0;
  let maxAssetSize = 0;
  const largeAssets = [];
  let assetCount = 0;

  files.forEach((assetName) => {
    const assetPath = path.join(NEXT_DIR, assetName);
    if (!fs.existsSync(assetPath)) {
      return;
    }

    const size = fs.statSync(assetPath).size;
    assetCount++;
    totalAssetSize += size;
    maxAssetSize = Math.max(maxAssetSize, size);

    if (assetName.endsWith('.js')) {
      totalJsSize += size;
      if (size > 100 * 1024) {
        largeAssets.push({ name: assetName, size, type: 'js' });
      }
    } else if (assetName.endsWith('.css')) {
      totalCssSize += size;
    }
  });

  return {
    totalJsSize,
    totalCssSize,
    totalAssetSize,
    maxAssetSize,
    largeAssets,
    assetCount,
    buildTime: 0,
    timestamp: Date.now(),
    builtAt: new Date().toISOString(),
    source: `manifest:${path.basename(manifestPath)}`
  };
}

function analyzeBundleFromBuildChunks() {
  if (!fs.existsSync(BUILD_CHUNKS_DIR)) {
    throw new Error(`Build chunks directory not found: ${BUILD_CHUNKS_DIR}`);
  }

  const chunkFiles = fs.readdirSync(BUILD_CHUNKS_DIR)
    .filter((name) => !name.endsWith('.map'));

  let totalJsSize = 0;
  let totalCssSize = 0;
  let totalAssetSize = 0;
  let maxAssetSize = 0;
  const largeAssets = [];

  chunkFiles.forEach((assetName) => {
    const assetPath = path.join(BUILD_CHUNKS_DIR, assetName);
    const size = fs.statSync(assetPath).size;
    totalAssetSize += size;
    maxAssetSize = Math.max(maxAssetSize, size);

    if (assetName.endsWith('.js')) {
      totalJsSize += size;
      if (size > 100 * 1024) {
        largeAssets.push({ name: `build/chunks/${assetName}`, size, type: 'js' });
      }
    } else if (assetName.endsWith('.css')) {
      totalCssSize += size;
    }
  });

  return {
    totalJsSize,
    totalCssSize,
    totalAssetSize,
    maxAssetSize,
    largeAssets,
    assetCount: chunkFiles.length,
    buildTime: 0,
    timestamp: Date.now(),
    builtAt: new Date().toISOString(),
    source: 'build-chunks'
  };
}

function saveTrend(analysis) {
  // Ensure trends directory exists
  if (!fs.existsSync(TRENDS_DIR)) {
    fs.mkdirSync(TRENDS_DIR, { recursive: true });
  }

  // Save current analysis with timestamp
  const trendFile = path.join(TRENDS_DIR, `${analysis.timestamp}.json`);
  fs.writeFileSync(trendFile, JSON.stringify(analysis, null, 2));

  // Keep only last 30 builds
  const trendFiles = fs.readdirSync(TRENDS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(TRENDS_DIR, f),
      timestamp: parseInt(f.replace('.json', ''))
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  // Remove old files
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

  const jsDelta = current.totalJsSize - previous.totalJsSize;
  const cssDelta = current.totalCssSize - previous.totalCssSize;
  const totalDelta = current.totalAssetSize - previous.totalAssetSize;

  const jsPercent = (jsDelta / previous.totalJsSize) * 100;
  const cssPercent = (cssDelta / previous.totalCssSize) * 100;
  const totalPercent = (totalDelta / previous.totalAssetSize) * 100;

  // Calculate trend over last 7 builds
  const recentTrends = trends.slice(0, Math.min(7, trends.length));
  const sizes = recentTrends.map(t => {
    const data = JSON.parse(fs.readFileSync(t.path, 'utf8'));
    return data.totalAssetSize;
  });

  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const isIncreasing = sizes[0] > avgSize;

  return {
    jsDelta,
    cssDelta,
    totalDelta,
    jsPercent,
    cssPercent,
    totalPercent,
    isIncreasing,
    avgSize,
    buildCount: trends.length
  };
}

function checkSizeLimits(analysis, limits) {
  const violations = [];

  if (analysis.totalJsSize > limits.totalJs) {
    violations.push({
      type: 'totalJs',
      current: analysis.totalJsSize,
      limit: limits.totalJs,
      excess: analysis.totalJsSize - limits.totalJs
    });
  }

  if (analysis.totalCssSize > limits.totalCss) {
    violations.push({
      type: 'totalCss',
      current: analysis.totalCssSize,
      limit: limits.totalCss,
      excess: analysis.totalCssSize - limits.totalCss
    });
  }

  if (analysis.totalAssetSize > limits.totalAssets) {
    violations.push({
      type: 'totalAssets',
      current: analysis.totalAssetSize,
      limit: limits.totalAssets,
      excess: analysis.totalAssetSize - limits.totalAssets
    });
  }

  if (analysis.maxAssetSize > limits.maxAssetSize) {
    violations.push({
      type: 'maxAssetSize',
      current: analysis.maxAssetSize,
      limit: limits.maxAssetSize,
      excess: analysis.maxAssetSize - limits.maxAssetSize
    });
  }

  return violations;
}

function generateCIReport(analysis, trends, trendAnalysis, violations) {
  console.log('\n📊 Bundle Analysis Report\n');
  console.log('═'.repeat(60));
  
  console.log('\n📦 Current Bundle Size:');
  console.log(`  Total Assets: ${formatBytes(analysis.totalAssetSize)}`);
  console.log(`  JavaScript:   ${formatBytes(analysis.totalJsSize)}`);
  console.log(`  CSS:          ${formatBytes(analysis.totalCssSize)}`);
  console.log(`  Asset Count:  ${analysis.assetCount}`);
  console.log(`  Build Time:   ${analysis.buildTime}ms`);

  if (trendAnalysis) {
    console.log('\n📈 Trend Analysis:');
    console.log(`  vs Previous:  ${trendAnalysis.totalDelta > 0 ? '+' : ''}${formatBytes(trendAnalysis.totalDelta)} (${trendAnalysis.totalPercent.toFixed(2)}%)`);
    console.log(`  JS Change:    ${trendAnalysis.jsDelta > 0 ? '+' : ''}${formatBytes(trendAnalysis.jsDelta)} (${trendAnalysis.jsPercent.toFixed(2)}%)`);
    console.log(`  CSS Change:   ${trendAnalysis.cssDelta > 0 ? '+' : ''}${formatBytes(trendAnalysis.cssDelta)} (${trendAnalysis.cssPercent.toFixed(2)}%)`);
    console.log(`  7-Build Avg:  ${formatBytes(trendAnalysis.avgSize)}`);
    console.log(`  Trend:        ${trendAnalysis.isIncreasing ? '📈 Increasing' : '📉 Decreasing'}`);
  }

  if (violations.length > 0) {
    console.log('\n⚠️  Size Limit Violations:');
    violations.forEach(v => {
      console.log(`  ${v.type}: ${formatBytes(v.current)} (limit: ${formatBytes(v.limit)}, excess: ${formatBytes(v.excess)})`);
    });
  } else {
    console.log('\n✅ All size limits passed');
  }

  if (analysis.largeAssets.length > 0) {
    console.log('\n⚠️  Large Assets (>100KB):');
    analysis.largeAssets.slice(0, 5).forEach(asset => {
      console.log(`  ${asset.name}: ${formatBytes(asset.size)}`);
    });
    if (analysis.largeAssets.length > 5) {
      console.log(`  ... and ${analysis.largeAssets.length - 5} more`);
    }
  }

  console.log('\n' + '═'.repeat(60));
}

function main() {
  try {
    console.log('🔍 Running bundle analysis for CI/CD...\n');

    // Load size limits
    const limits = loadSizeLimits();

    // Analyze current bundle
    let analysis;
    if (fs.existsSync(CURRENT_STATS)) {
      analysis = analyzeBundleStats(CURRENT_STATS);
    } else {
      try {
        analysis = analyzeBundleFromManifest();
      } catch {
        analysis = analyzeBundleFromBuildChunks();
      }
    }
    console.log(`📁 Bundle data source: ${analysis.source || 'webpack-stats'}`);

    // Save to trends
    const trends = saveTrend(analysis);
    console.log(`✅ Saved trend data (${trends.length} builds tracked)`);

    // Analyze trends
    const trendAnalysis = analyzeTrends(trends);

    // Check size limits
    const violations = checkSizeLimits(analysis, limits);

    // Generate report
    generateCIReport(analysis, trends, trendAnalysis, violations);

    // Exit with appropriate code
    if (violations.length > 0) {
      console.log('\n❌ Bundle size check failed: Size limit violations detected');
      console.log('   Review the violations above and optimize bundle size\n');
      process.exit(1);
    }

    // Warn about significant increases
    if (trendAnalysis && trendAnalysis.totalPercent > 5) {
      console.log('\n⚠️  Warning: Bundle size increased by more than 5%');
      console.log('   Consider reviewing recent changes for optimization opportunities\n');
      // Don't fail, just warn
    }

    console.log('\n✅ Bundle size check passed\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

main();
