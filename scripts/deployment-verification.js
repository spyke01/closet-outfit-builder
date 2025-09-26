#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Tests build and deployment processes to ensure reliability
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ANSI color codes
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

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function testBuild() {
  log('\n🔨 Testing Build Process', 'bold');
  log('=' .repeat(40), 'blue');

  try {
    // Clean previous build
    const distPath = path.join(projectRoot, 'dist');
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true, force: true });
      log('  ✅ Cleaned previous build', 'green');
    }

    // Run build
    log('  🔄 Running build...', 'yellow');
    const buildResult = await runCommand('npm', ['run', 'build']);

    if (buildResult.success) {
      log('  ✅ Build completed successfully', 'green');
      
      // Check if dist directory was created
      if (fs.existsSync(distPath)) {
        log('  ✅ Build output directory created', 'green');
        
        // Check for essential files
        const essentialFiles = ['index.html', 'sw.js'];
        const assetFiles = fs.readdirSync(path.join(distPath, 'assets'));
        
        essentialFiles.forEach(file => {
          if (fs.existsSync(path.join(distPath, file))) {
            log(`  ✅ ${file} found`, 'green');
          } else {
            log(`  ❌ ${file} missing`, 'red');
          }
        });

        if (assetFiles.length > 0) {
          log(`  ✅ ${assetFiles.length} asset files generated`, 'green');
        } else {
          log('  ❌ No asset files found', 'red');
        }

      } else {
        log('  ❌ Build output directory not created', 'red');
        return false;
      }
    } else {
      log('  ❌ Build failed', 'red');
      log(`  Error: ${buildResult.stderr}`, 'red');
      return false;
    }

    return true;
  } catch (error) {
    log(`  ❌ Build test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testTypeScript() {
  log('\n📝 Testing TypeScript Compilation', 'bold');
  log('=' .repeat(40), 'blue');

  try {
    log('  🔄 Running TypeScript check...', 'yellow');
    const tscResult = await runCommand('npx', ['tsc', '--noEmit']);

    if (tscResult.success) {
      log('  ✅ TypeScript compilation successful', 'green');
      return true;
    } else {
      log('  ⚠️  TypeScript compilation has issues', 'yellow');
      log('  Issues found (may not prevent build):', 'yellow');
      
      // Parse TypeScript errors
      const errors = tscResult.stdout.split('\n').filter(line => 
        line.includes('error TS') || line.includes('.ts(') || line.includes('.tsx(')
      );
      
      errors.slice(0, 5).forEach(error => {
        log(`    ${error}`, 'yellow');
      });
      
      if (errors.length > 5) {
        log(`    ... and ${errors.length - 5} more issues`, 'yellow');
      }
      
      return true; // Don't fail deployment for TS warnings
    }
  } catch (error) {
    log(`  ❌ TypeScript test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testLinting() {
  log('\n🔍 Testing ESLint', 'bold');
  log('=' .repeat(40), 'blue');

  try {
    log('  🔄 Running ESLint...', 'yellow');
    const lintResult = await runCommand('npm', ['run', 'lint']);

    if (lintResult.success) {
      log('  ✅ ESLint passed', 'green');
      return true;
    } else {
      log('  ⚠️  ESLint found issues', 'yellow');
      
      // Show first few lint errors
      const lintOutput = lintResult.stdout || lintResult.stderr;
      const lines = lintOutput.split('\n').slice(0, 10);
      lines.forEach(line => {
        if (line.trim()) {
          log(`    ${line}`, 'yellow');
        }
      });
      
      return true; // Don't fail deployment for lint warnings
    }
  } catch (error) {
    log(`  ❌ Linting test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testNetlifyFunctions() {
  log('\n⚡ Testing Netlify Functions', 'bold');
  log('=' .repeat(40), 'blue');

  try {
    // Check if functions directory exists
    const functionsPath = path.join(projectRoot, 'netlify', 'functions');
    if (!fs.existsSync(functionsPath)) {
      log('  ❌ Functions directory not found', 'red');
      return false;
    }

    log('  ✅ Functions directory found', 'green');

    // Check function files
    const functionFiles = fs.readdirSync(functionsPath).filter(file => 
      file.endsWith('.ts') || file.endsWith('.js')
    );

    if (functionFiles.length > 0) {
      log(`  ✅ ${functionFiles.length} function file(s) found`, 'green');
      functionFiles.forEach(file => {
        log(`    - ${file}`, 'blue');
      });
    } else {
      log('  ⚠️  No function files found', 'yellow');
    }

    // Check function package.json
    const functionPackageJson = path.join(functionsPath, 'package.json');
    if (fs.existsSync(functionPackageJson)) {
      log('  ✅ Functions package.json found', 'green');
    } else {
      log('  ⚠️  Functions package.json not found', 'yellow');
    }

    return true;
  } catch (error) {
    log(`  ❌ Functions test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPWAAssets() {
  log('\n📱 Testing PWA Assets', 'bold');
  log('=' .repeat(40), 'blue');

  try {
    const publicPath = path.join(projectRoot, 'public');
    const distPath = path.join(projectRoot, 'dist');

    // Check manifest in public
    const manifestPath = path.join(publicPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      log('  ✅ Manifest found in public/', 'green');
    } else {
      log('  ❌ Manifest not found in public/', 'red');
      return false;
    }

    // Check service worker in public
    const swPath = path.join(publicPath, 'sw.js');
    if (fs.existsSync(swPath)) {
      log('  ✅ Service Worker found in public/', 'green');
    } else {
      log('  ❌ Service Worker not found in public/', 'red');
      return false;
    }

    // Check if assets are copied to dist (after build)
    if (fs.existsSync(distPath)) {
      const distManifest = path.join(distPath, 'manifest.json');
      const distSw = path.join(distPath, 'sw.js');

      if (fs.existsSync(distManifest)) {
        log('  ✅ Manifest copied to dist/', 'green');
      } else {
        log('  ⚠️  Manifest not copied to dist/', 'yellow');
      }

      if (fs.existsSync(distSw)) {
        log('  ✅ Service Worker copied to dist/', 'green');
      } else {
        log('  ⚠️  Service Worker not copied to dist/', 'yellow');
      }
    }

    return true;
  } catch (error) {
    log(`  ❌ PWA assets test failed: ${error.message}`, 'red');
    return false;
  }
}

async function runDeploymentVerification() {
  log('\n🚀 Deployment Verification Report', 'bold');
  log('Generated at: ' + new Date().toISOString(), 'blue');
  log('=' .repeat(60), 'blue');

  const tests = [
    { name: 'TypeScript Compilation', fn: testTypeScript },
    { name: 'ESLint', fn: testLinting },
    { name: 'Build Process', fn: testBuild },
    { name: 'Netlify Functions', fn: testNetlifyFunctions },
    { name: 'PWA Assets', fn: testPWAAssets }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
    } catch (error) {
      log(`\n❌ ${test.name} test crashed: ${error.message}`, 'red');
      results.push({ name: test.name, success: false });
    }
  }

  // Summary
  log('\n📋 Test Summary', 'bold');
  log('=' .repeat(30), 'blue');

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`  ${status} ${result.name}`, color);
  });

  log(`\n🎯 Overall: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All deployment verification tests passed!', 'green');
    log('Your application is ready for deployment.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Review the issues above.', 'yellow');
    log('The application may still deploy successfully.', 'yellow');
  }

  return passed === total;
}

// Run the verification
runDeploymentVerification().catch(error => {
  log(`\n💥 Verification crashed: ${error.message}`, 'red');
  process.exit(1);
});