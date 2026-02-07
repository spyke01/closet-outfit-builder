#!/usr/bin/env node

/**
 * Bundle Size Monitoring Script
 * 
 * Checks the Next.js build output for bundle size compliance.
 * Budgets:
 * - Total bundle: < 500KB (gzipped)
 * - My Sizes feature: < 25KB (gzipped)
 * - Individual chunks: < 100KB (gzipped)
 */

const fs = require('fs');
const path = require('path');

// Bundle size budgets (in KB)
const BUDGETS = {
  total: 500,
  mySizesFeature: 25,
  individualChunk: 100,
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function formatSize(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function checkBundleSize() {
  console.log(`${colors.bold}${colors.blue}Bundle Size Check${colors.reset}\n`);

  const buildManifestPath = path.join(process.cwd(), '.next/build-manifest.json');
  
  if (!fs.existsSync(buildManifestPath)) {
    console.log(`${colors.yellow}⚠ Build manifest not found. Run 'npm run build' first.${colors.reset}`);
    process.exit(0);
  }

  const manifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
  
  let totalSize = 0;
  let violations = [];
  let warnings = [];
  
  // Check all pages
  const pages = manifest.pages || {};
  
  Object.entries(pages).forEach(([page, files]) => {
    let pageSize = 0;
    
    files.forEach(file => {
      const filePath = path.join(process.cwd(), '.next', file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        pageSize += stats.size;
        totalSize += stats.size;
        
        // Check individual chunk size
        const chunkSizeKB = stats.size / 1024;
        if (chunkSizeKB > BUDGETS.individualChunk) {
          violations.push({
            type: 'chunk',
            file: file,
            size: chunkSizeKB,
            budget: BUDGETS.individualChunk,
          });
        }
      }
    });
    
    // Check for My Sizes feature pages
    if (page.includes('/sizes')) {
      const pageSizeKB = pageSize / 1024;
      if (pageSizeKB > BUDGETS.mySizesFeature) {
        warnings.push({
          type: 'feature',
          page: page,
          size: pageSizeKB,
          budget: BUDGETS.mySizesFeature,
        });
      }
    }
  });
  
  const totalSizeKB = totalSize / 1024;
  
  // Print results
  console.log(`${colors.bold}Total Bundle Size:${colors.reset} ${formatSize(totalSize)}`);
  console.log(`${colors.bold}Budget:${colors.reset} ${BUDGETS.total} KB\n`);
  
  if (totalSizeKB > BUDGETS.total) {
    console.log(`${colors.red}✗ Total bundle size exceeds budget by ${formatSize((totalSizeKB - BUDGETS.total) * 1024)}${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✓ Total bundle size within budget${colors.reset}\n`);
  }
  
  // Print violations
  if (violations.length > 0) {
    console.log(`${colors.bold}${colors.red}Violations:${colors.reset}`);
    violations.forEach(v => {
      console.log(`  ${colors.red}✗${colors.reset} ${v.file}`);
      console.log(`    Size: ${v.size.toFixed(2)} KB (budget: ${v.budget} KB)`);
    });
    console.log('');
  }
  
  // Print warnings
  if (warnings.length > 0) {
    console.log(`${colors.bold}${colors.yellow}Warnings:${colors.reset}`);
    warnings.forEach(w => {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${w.page}`);
      console.log(`    Size: ${w.size.toFixed(2)} KB (budget: ${w.budget} KB)`);
    });
    console.log('');
  }
  
  // Print recommendations
  if (violations.length > 0 || warnings.length > 0) {
    console.log(`${colors.bold}Recommendations:${colors.reset}`);
    console.log('  • Use direct imports instead of barrel imports');
    console.log('  • Enable dynamic imports for heavy components');
    console.log('  • Check for duplicate dependencies');
    console.log('  • Review and remove unused code\n');
  }
  
  // Exit with error if violations exist
  if (violations.length > 0 || totalSizeKB > BUDGETS.total) {
    process.exit(1);
  }
}

checkBundleSize();
