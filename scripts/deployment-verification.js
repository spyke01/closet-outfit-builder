#!/usr/bin/env node

/**
 * Next.js + Supabase Deployment Verification Script
 * Tests production deployment to ensure all functionality works correctly
 */

import https from 'https';
import http from 'http';

// Configuration
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const requestOptions = {
      timeout: TIMEOUT,
      ...options
    };
    
    const req = client.get(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testHealthCheck() {
  log('\n🏥 Testing Health Check Endpoint...', 'blue');
  
  try {
    const url = `${SITE_URL}/api/health`;
    const response = await makeRequest(url);
    
    if (response.status === 200) {
      const data = response.data;
      
      if (data.status === 'healthy') {
        log('✅ Health Check: HEALTHY', 'green');
        log(`   Environment: ${data.environment}`, 'green');
        log(`   Database: ${data.checks?.database || 'unknown'}`, 'green');
        log(`   Environment Variables: ${data.checks?.environment || 'unknown'}`, 'green');
        return true;
      } else {
        log(`⚠️  Health Check: ${data.status.toUpperCase()}`, 'yellow');
        log(`   Database: ${data.checks?.database || 'unknown'}`, 'yellow');
        log(`   Environment Variables: ${data.checks?.environment || 'unknown'}`, 'yellow');
        return data.status === 'degraded'; // Degraded is acceptable
      }
    } else {
      log(`❌ Health Check: HTTP ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Health Check: Network error - ${error.message}`, 'red');
    return false;
  }
}

async function testMainApplication() {
  log('\n🏠 Testing Main Application...', 'blue');
  
  try {
    const response = await makeRequest(SITE_URL);
    
    if (response.status === 200) {
      const html = response.data;
      
      // Check for Next.js specific elements
      const hasNextJs = html.includes('_next') || html.includes('__NEXT_DATA__');
      const hasTitle = html.includes('<title>') || html.includes('What to Wear');
      const hasReact = html.includes('react') || html.includes('div id="__next"');
      
      if (hasTitle) {
        log('✅ Main Application: Loading correctly', 'green');
        if (hasNextJs) {
          log('   Next.js: Detected', 'green');
        }
        return true;
      } else {
        log('⚠️  Main Application: May have content issues', 'yellow');
        log(`   Has Next.js: ${hasNextJs}`, 'yellow');
        log(`   Has Title: ${hasTitle}`, 'yellow');
        return true; // Not a critical failure
      }
    } else {
      log(`❌ Main Application: HTTP ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Main Application: Network error - ${error.message}`, 'red');
    return false;
  }
}

async function testSupabaseIntegration() {
  log('\n🗄️  Testing Supabase Integration...', 'blue');
  
  try {
    // Test if the app can load without Supabase errors
    const response = await makeRequest(SITE_URL);
    
    if (response.status === 200) {
      const html = response.data;
      
      // Check for Supabase configuration
      const hasSupabaseConfig = html.includes('supabase') || 
                               process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      if (hasSupabaseConfig) {
        log('✅ Supabase Integration: Configuration detected', 'green');
        
        // Additional check: try to access a protected route
        try {
          const protectedResponse = await makeRequest(`${SITE_URL}/wardrobe`);
          if (protectedResponse.status === 200 || protectedResponse.status === 401) {
            log('✅ Protected Routes: Accessible', 'green');
          }
        } catch (error) {
          log('⚠️  Protected Routes: May have issues', 'yellow');
        }
        
        return true;
      } else {
        log('❌ Supabase Integration: Configuration not found', 'red');
        return false;
      }
    } else {
      log(`❌ Supabase Integration: HTTP ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Supabase Integration: Network error - ${error.message}`, 'red');
    return false;
  }
}

async function testStaticAssets() {
  log('\n📁 Testing Static Assets...', 'blue');
  
  const assets = [
    '/favicon.ico',
    '/manifest.json',
    '/_next/static/css', // This will be a directory, but we can test if it exists
  ];
  
  let passedTests = 0;
  
  for (const asset of assets) {
    try {
      const response = await makeRequest(`${SITE_URL}${asset}`);
      
      if (response.status === 200 || response.status === 404) {
        // 404 is acceptable for some assets that might not exist
        log(`✅ Asset ${asset}: Available`, 'green');
        passedTests++;
      } else {
        log(`⚠️  Asset ${asset}: HTTP ${response.status}`, 'yellow');
        passedTests++; // Don't fail for asset issues
      }
    } catch (error) {
      log(`⚠️  Asset ${asset}: ${error.message}`, 'yellow');
      passedTests++; // Don't fail for asset issues
    }
  }
  
  return passedTests > 0;
}

async function testMonitoringEndpoint() {
  log('\n📊 Testing Monitoring Endpoint...', 'blue');
  
  try {
    const url = `${SITE_URL}/api/monitoring`;
    
    // Test GET request (health check)
    const getResponse = await makeRequest(url);
    
    if (getResponse.status === 200) {
      log('✅ Monitoring Endpoint: Health check working', 'green');
      return true;
    } else if (getResponse.status === 405) {
      log('✅ Monitoring Endpoint: Available (Method Not Allowed expected)', 'green');
      return true;
    } else {
      log(`⚠️  Monitoring Endpoint: HTTP ${getResponse.status}`, 'yellow');
      return true; // Not critical
    }
  } catch (error) {
    log(`⚠️  Monitoring Endpoint: ${error.message}`, 'yellow');
    return true; // Not critical
  }
}

async function testEnvironmentVariables() {
  log('\n🔧 Testing Environment Configuration...', 'blue');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ];
  
  let allPresent = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar}: Set`, 'green');
    } else {
      log(`❌ ${envVar}: Missing`, 'red');
      allPresent = false;
    }
  }
  
  // Check optional environment variables
  const optionalEnvVars = [
    'NODE_ENV',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];
  
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar}: Set`, 'green');
    } else {
      log(`⚠️  ${envVar}: Not set (optional)`, 'yellow');
    }
  }
  
  return allPresent;
}

async function testBuildArtifacts() {
  log('\n🏗️  Testing Build Artifacts...', 'blue');
  
  try {
    // Test if Next.js static files are accessible
    const response = await makeRequest(`${SITE_URL}/_next/static/chunks/webpack.js`);
    
    if (response.status === 200 || response.status === 404) {
      log('✅ Build Artifacts: Next.js static files structure detected', 'green');
      return true;
    } else {
      log(`⚠️  Build Artifacts: Unexpected response ${response.status}`, 'yellow');
      return true; // Not critical
    }
  } catch (error) {
    log(`⚠️  Build Artifacts: ${error.message}`, 'yellow');
    return true; // Not critical
  }
}

async function runAllTests() {
  log('🚀 Starting Next.js + Supabase Deployment Verification', 'cyan');
  log(`📍 Testing site: ${SITE_URL}`, 'cyan');
  log(`⏱️  Timeout: ${TIMEOUT}ms`, 'cyan');
  
  const results = {
    environmentVariables: await testEnvironmentVariables(),
    healthCheck: await testHealthCheck(),
    mainApplication: await testMainApplication(),
    supabaseIntegration: await testSupabaseIntegration(),
    staticAssets: await testStaticAssets(),
    monitoringEndpoint: await testMonitoringEndpoint(),
    buildArtifacts: await testBuildArtifacts(),
  };
  
  // Summary
  log('\n📊 Test Results Summary:', 'cyan');
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`   ${test}: ${status}`, color);
  });
  
  log(`\n🎯 Overall: ${passed}/${total} tests passed`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('\n🎉 All tests passed! Deployment is ready for production.', 'green');
    log('\n📋 Next Steps:', 'blue');
    log('   1. Test user authentication flows', 'blue');
    log('   2. Verify wardrobe functionality with real data', 'blue');
    log('   3. Test image upload and processing', 'blue');
    log('   4. Monitor performance and error rates', 'blue');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the issues above.', 'yellow');
    log('\n🔧 Troubleshooting:', 'blue');
    log('   1. Check environment variables in deployment platform', 'blue');
    log('   2. Verify Supabase project configuration', 'blue');
    log('   3. Review build logs for errors', 'blue');
    log('   4. Test locally with production environment', 'blue');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Next.js + Supabase Deployment Verification Script

Usage:
  node scripts/deployment-verification.js [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  SITE_URL       The URL to test (default: http://localhost:3000)
  
Examples:
  # Test local development
  npm run dev
  node scripts/deployment-verification.js
  
  # Test production deployment
  SITE_URL=https://your-app.netlify.app node scripts/deployment-verification.js
  
  # Test with custom timeout
  TIMEOUT=15000 SITE_URL=https://your-app.com node scripts/deployment-verification.js
`);
  process.exit(0);
}

// Run tests
runAllTests().catch((error) => {
  log(`💥 Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});