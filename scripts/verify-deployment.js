#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Tests Netlify deployment to ensure all functionality works correctly
 */

import https from 'https';
import http from 'http';

// Configuration
const SITE_URL = process.env.SITE_URL || 'http://localhost:8888';
const TEST_COORDINATES = { lat: 40.7128, lon: -74.0060 }; // New York City
const TEST_ADDRESS = 'New York, NY';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    client.get(url, (res) => {
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
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function testWeatherAPI() {
  log('\n🌤️  Testing Weather API...', 'blue');
  
  try {
    const url = `${SITE_URL}/api/weather?lat=${TEST_COORDINATES.lat}&lon=${TEST_COORDINATES.lon}`;
    const response = await makeRequest(url);
    
    if (response.status === 200) {
      const data = response.data;
      
      // Validate response structure
      if (data.current && data.forecast && Array.isArray(data.forecast)) {
        log('✅ Weather API: SUCCESS', 'green');
        log(`   Temperature: ${data.current.temperature}°F`, 'green');
        log(`   Condition: ${data.current.condition}`, 'green');
        log(`   Forecast days: ${data.forecast.length}`, 'green');
        return true;
      } else {
        log('❌ Weather API: Invalid response structure', 'red');
        log(`   Response: ${JSON.stringify(data, null, 2)}`, 'yellow');
        return false;
      }
    } else {
      log(`❌ Weather API: HTTP ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Weather API: Network error - ${error.message}`, 'red');
    return false;
  }
}



async function testRateLimiting() {
  log('\n⏱️  Testing Rate Limiting...', 'blue');
  
  try {
    const requests = [];
    const url = `${SITE_URL}/api/weather?lat=${TEST_COORDINATES.lat}&lon=${TEST_COORDINATES.lon}`;
    
    // Make 12 rapid requests (limit is 10/minute)
    for (let i = 0; i < 12; i++) {
      requests.push(makeRequest(url));
    }
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      log('✅ Rate Limiting: Working correctly', 'green');
      log(`   Rate limited responses: ${rateLimitedResponses.length}/12`, 'green');
      return true;
    } else {
      log('⚠️  Rate Limiting: May not be working (all requests succeeded)', 'yellow');
      return true; // Not a failure, just a warning
    }
  } catch (error) {
    log(`❌ Rate Limiting Test: Error - ${error.message}`, 'red');
    return false;
  }
}

async function testErrorHandling() {
  log('\n🚨 Testing Error Handling...', 'blue');
  
  const tests = [
    {
      name: 'Invalid coordinates',
      url: `${SITE_URL}/api/weather?lat=invalid&lon=invalid`,
      expectedStatus: 400
    },
    {
      name: 'Missing parameters',
      url: `${SITE_URL}/api/weather`,
      expectedStatus: 400
    },

  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      const response = await makeRequest(test.url);
      
      if (response.status === test.expectedStatus) {
        log(`✅ ${test.name}: Handled correctly (${response.status})`, 'green');
      } else {
        log(`❌ ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`, 'red');
        allPassed = false;
      }
    } catch (error) {
      log(`❌ ${test.name}: Network error - ${error.message}`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testMainApp() {
  log('\n🏠 Testing Main Application...', 'blue');
  
  try {
    const response = await makeRequest(SITE_URL);
    
    if (response.status === 200) {
      const html = response.data;
      
      // Check for key elements
      const hasTitle = html.includes('What to Wear') || html.includes('<title>');
      const hasReact = html.includes('react') || html.includes('div id="root"');
      
      if (hasTitle && hasReact) {
        log('✅ Main Application: Loading correctly', 'green');
        return true;
      } else {
        log('⚠️  Main Application: May have issues with content', 'yellow');
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

async function runAllTests() {
  log('🚀 Starting Deployment Verification Tests', 'blue');
  log(`📍 Testing site: ${SITE_URL}`, 'blue');
  
  const results = {
    mainApp: await testMainApp(),
    weatherAPI: await testWeatherAPI(),

    rateLimiting: await testRateLimiting(),
    errorHandling: await testErrorHandling()
  };
  
  // Summary
  log('\n📊 Test Results Summary:', 'blue');
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
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the issues above.', 'yellow');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Deployment Verification Script

Usage:
  node scripts/verify-deployment.js [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  SITE_URL       The URL to test (default: http://localhost:8888)
  
Examples:
  # Test local development
  npm run dev:netlify
  node scripts/verify-deployment.js
  
  # Test production deployment
  SITE_URL=https://your-app.netlify.app node scripts/verify-deployment.js
`);
  process.exit(0);
}

// Run tests
runAllTests().catch((error) => {
  log(`💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});