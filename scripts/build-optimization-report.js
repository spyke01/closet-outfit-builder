#!/usr/bin/env node

/**
 * Build Optimization Report Generator
 * Analyzes build output and provides optimization recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function analyzeBundle() {
  const distPath = path.join(projectRoot, 'dist');
  
  if (!fs.existsSync(distPath)) {
    log('❌ Build directory not found. Run "npm run build" first.', 'red');
    return false;
  }

  log('\n📊 Bundle Analysis Report', 'bold');
  log('=' .repeat(50), 'blue');

  const files = fs.readdirSync(distPath, { recursive: true });
  const assets = files.filter(file => 
    typeof file === 'string' && 
    (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html'))
  );

  let totalSize = 0;
  const fileAnalysis = [];

  assets.forEach(file => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalSize += stats.size;
    
    fileAnalysis.push({
      name: file,
      size: stats.size,
      sizeKB: parseFloat(sizeKB)
    });
  });

  // Sort by size descending
  fileAnalysis.sort((a, b) => b.size - a.size);

  log('\n📁 Asset Breakdown:', 'blue');
  fileAnalysis.forEach(file => {
    const color = file.sizeKB > 100 ? 'red' : file.sizeKB > 50 ? 'yellow' : 'green';
    log(`  ${file.name}: ${file.sizeKB} KB`, color);
  });

  const totalSizeKB = (totalSize / 1024).toFixed(2);
  log(`\n📦 Total Bundle Size: ${totalSizeKB} KB`, 'bold');

  // Recommendations
  log('\n💡 Optimization Recommendations:', 'blue');
  
  const jsFiles = fileAnalysis.filter(f => f.name.endsWith('.js'));
  const largestJS = jsFiles[0];
  
  if (largestJS && largestJS.sizeKB > 150) {
    log('  ⚠️  Large JavaScript bundle detected. Consider code splitting.', 'yellow');
  } else {
    log('  ✅ JavaScript bundle size is optimized.', 'green');
  }

  const cssFiles = fileAnalysis.filter(f => f.name.endsWith('.css'));
  const largestCSS = cssFiles[0];
  
  if (largestCSS && largestCSS.sizeKB > 50) {
    log('  ⚠️  Large CSS bundle detected. Consider purging unused styles.', 'yellow');
  } else {
    log('  ✅ CSS bundle size is optimized.', 'green');
  }

  // Check for chunk splitting
  const chunkCount = jsFiles.length;
  if (chunkCount >= 3) {
    log('  ✅ Good chunk splitting detected for better caching.', 'green');
  } else {
    log('  ⚠️  Consider implementing chunk splitting for better caching.', 'yellow');
  }

  return true;
}

function checkPWAAssets() {
  log('\n🔧 PWA Configuration Check', 'bold');
  log('=' .repeat(50), 'blue');

  const publicPath = path.join(projectRoot, 'public');
  const distPath = path.join(projectRoot, 'dist');

  // Check manifest
  const manifestPath = path.join(publicPath, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    log('  ✅ Web App Manifest found', 'green');
    
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      if (manifest.icons && manifest.icons.length > 0) {
        log(`  ✅ ${manifest.icons.length} icons configured`, 'green');
      } else {
        log('  ⚠️  No icons found in manifest', 'yellow');
      }
      
      if (manifest.start_url) {
        log('  ✅ Start URL configured', 'green');
      } else {
        log('  ⚠️  Start URL not configured', 'yellow');
      }
      
    } catch (error) {
      log('  ❌ Invalid manifest.json format', 'red');
    }
  } else {
    log('  ❌ Web App Manifest not found', 'red');
  }

  // Check service worker
  const swPath = path.join(publicPath, 'sw.js');
  if (fs.existsSync(swPath)) {
    log('  ✅ Service Worker found', 'green');
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    if (swContent.includes('caches.open')) {
      log('  ✅ Caching strategy implemented', 'green');
    } else {
      log('  ⚠️  No caching strategy detected', 'yellow');
    }
  } else {
    log('  ❌ Service Worker not found', 'red');
  }

  // Check if service worker is copied to dist
  const distSwPath = path.join(distPath, 'sw.js');
  if (fs.existsSync(distSwPath)) {
    log('  ✅ Service Worker copied to build output', 'green');
  } else {
    log('  ⚠️  Service Worker not found in build output', 'yellow');
  }
}

function checkNetlifyConfig() {
  log('\n🌐 Netlify Configuration Check', 'bold');
  log('=' .repeat(50), 'blue');

  const netlifyTomlPath = path.join(projectRoot, 'netlify.toml');
  
  if (!fs.existsSync(netlifyTomlPath)) {
    log('  ❌ netlify.toml not found', 'red');
    return;
  }

  const config = fs.readFileSync(netlifyTomlPath, 'utf8');
  
  // Check build configuration
  if (config.includes('[build]')) {
    log('  ✅ Build configuration found', 'green');
  } else {
    log('  ⚠️  Build configuration missing', 'yellow');
  }

  // Check functions configuration
  if (config.includes('[functions]')) {
    log('  ✅ Functions configuration found', 'green');
  } else {
    log('  ⚠️  Functions configuration missing', 'yellow');
  }

  // Check security headers
  if (config.includes('X-Frame-Options')) {
    log('  ✅ Security headers configured', 'green');
  } else {
    log('  ⚠️  Security headers not configured', 'yellow');
  }

  // Check caching headers
  if (config.includes('Cache-Control')) {
    log('  ✅ Caching headers configured', 'green');
  } else {
    log('  ⚠️  Caching headers not configured', 'yellow');
  }

  // Check CSP
  if (config.includes('Content-Security-Policy')) {
    log('  ✅ Content Security Policy configured', 'green');
  } else {
    log('  ⚠️  Content Security Policy not configured', 'yellow');
  }
}

function checkTypeScriptConfig() {
  log('\n📝 TypeScript Configuration Check', 'bold');
  log('=' .repeat(50), 'blue');

  const tsconfigPath = path.join(projectRoot, 'tsconfig.app.json');
  
  if (!fs.existsSync(tsconfigPath)) {
    log('  ❌ tsconfig.app.json not found', 'red');
    return;
  }

  try {
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    // Remove comments from JSON (basic approach)
    const cleanedContent = tsconfigContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const tsconfig = JSON.parse(cleanedContent);
    const compilerOptions = tsconfig.compilerOptions || {};

    // Check strict mode
    if (compilerOptions.strict) {
      log('  ✅ Strict mode enabled', 'green');
    } else {
      log('  ⚠️  Strict mode not enabled', 'yellow');
    }

    // Check target
    if (compilerOptions.target === 'ES2020' || compilerOptions.target === 'ES2022') {
      log('  ✅ Modern ES target configured', 'green');
    } else {
      log('  ⚠️  Consider updating ES target for better performance', 'yellow');
    }

    // Check module resolution
    if (compilerOptions.moduleResolution === 'bundler') {
      log('  ✅ Bundler module resolution configured', 'green');
    } else {
      log('  ⚠️  Consider using bundler module resolution', 'yellow');
    }

    // Check incremental compilation
    if (compilerOptions.incremental) {
      log('  ✅ Incremental compilation enabled', 'green');
    } else {
      log('  ⚠️  Incremental compilation not enabled', 'yellow');
    }

  } catch (error) {
    log('  ❌ Invalid tsconfig.app.json format', 'red');
  }
}

function generateReport() {
  log('\n🚀 Build Optimization Report', 'bold');
  log('Generated at: ' + new Date().toISOString(), 'blue');
  
  const success = analyzeBundle();
  if (!success) return;
  
  checkPWAAssets();
  checkNetlifyConfig();
  checkTypeScriptConfig();
  
  log('\n✨ Report Complete!', 'bold');
  log('\nFor detailed bundle analysis, consider using:', 'blue');
  log('  npm install --save-dev rollup-plugin-visualizer', 'yellow');
  log('  Add visualizer plugin to vite.config.ts', 'yellow');
}

// Run the report
generateReport();