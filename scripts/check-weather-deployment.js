#!/usr/bin/env node

/**
 * Weather API Deployment Check
 * 
 * This script checks if the weather API is properly deployed and configured
 * without making excessive API calls to avoid rate limiting.
 */

import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://my-ai-outfit.netlify.app';

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      timeout: options.timeout || 10000,
      headers: options.headers || {},
    };
    
    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: error.message,
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(requestOptions.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Check if weather function is deployed
 */
async function checkWeatherFunctionDeployment() {
  console.info('🔍 Checking Weather Function Deployment...\n');
  
  // Test 1: Check if function exists (should return 400 for missing params, not 404)
  console.info('1. Checking if weather function is accessible...');
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/.netlify/functions/weather`);
    
    if (response.status === 400) {
      console.info('   ✅ Weather function is deployed and accessible');
      console.info('   ✅ Returns 400 for missing parameters (expected behavior)');
      return true;
    } else if (response.status === 404) {
      console.info('   ❌ Weather function not found (404)');
      console.info('   ❌ Function may not be deployed or URL is incorrect');
      return false;
    } else {
      console.info(`   ⚠️  Unexpected status: ${response.status}`);
      console.info(`   ⚠️  Response: ${response.rawData}`);
      return false;
    }
  } catch (error) {
    console.info(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Check CORS configuration
 */
async function checkCORSConfiguration() {
  console.info('\n2. Checking CORS configuration...');
  
  try {
    // Test OPTIONS request (CORS preflight)
    const response = await makeRequest(`${PRODUCTION_URL}/.netlify/functions/weather`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    if (response.status === 200) {
      const corsHeaders = {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers'],
      };
      
      console.info('   ✅ CORS preflight request successful');
      console.info('   ✅ CORS headers:', JSON.stringify(corsHeaders, null, 6));
      return true;
    } else {
      console.info(`   ❌ CORS preflight failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.info(`   ❌ CORS check failed: ${error.message}`);
    return false;
  }
}

/**
 * Check error handling
 */
async function checkErrorHandling() {
  console.info('\n3. Checking error handling...');
  
  const testCases = [
    {
      name: 'Missing parameters',
      url: `${PRODUCTION_URL}/.netlify/functions/weather`,
      expectedStatus: 400,
    },
    {
      name: 'Invalid coordinates',
      url: `${PRODUCTION_URL}/.netlify/functions/weather?lat=999&lon=999`,
      expectedStatus: 400,
    },
    {
      name: 'Invalid method',
      url: `${PRODUCTION_URL}/.netlify/functions/weather?lat=40&lon=-74`,
      method: 'POST',
      expectedStatus: 405,
    },
  ];
  
  let passedTests = 0;
  
  for (const testCase of testCases) {
    try {
      const response = await makeRequest(testCase.url, { method: testCase.method });
      
      if (response.status === testCase.expectedStatus) {
        console.info(`   ✅ ${testCase.name}: ${response.status} (expected)`);
        if (response.data && response.data.error) {
          console.info(`      Error message: "${response.data.error}"`);
        }
        passedTests++;
      } else {
        console.info(`   ❌ ${testCase.name}: ${response.status} (expected ${testCase.expectedStatus})`);
      }
    } catch (error) {
      console.info(`   ❌ ${testCase.name}: Request failed - ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return passedTests === testCases.length;
}

/**
 * Test with one valid request (minimal API usage)
 */
async function testValidRequest() {
  console.info('\n4. Testing one valid request (NYC coordinates)...');
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/.netlify/functions/weather?lat=40.7128&lon=-74.0060`);
    
    if (response.status === 200) {
      console.info('   ✅ Valid request successful');
      
      if (response.data && response.data.current && response.data.forecast) {
        console.info(`   ✅ Current temperature: ${response.data.current.temperature}°F`);
        console.info(`   ✅ Current condition: ${response.data.current.condition}`);
        console.info(`   ✅ Forecast days: ${response.data.forecast.length}`);
        console.info('   ✅ Response structure is valid');
        return true;
      } else {
        console.info('   ❌ Invalid response structure');
        console.info('   ❌ Response:', JSON.stringify(response.data, null, 2));
        return false;
      }
    } else if (response.status === 500 && response.data && response.data.error) {
      // Check if it's an API key issue
      if (response.data.error.includes('API key') || response.data.error.includes('authentication')) {
        console.info('   ⚠️  API key configuration issue detected');
        console.info(`   ⚠️  Error: ${response.data.error}`);
        console.info('   ⚠️  Check OPENWEATHER_API_KEY in Netlify environment variables');
        return false;
      } else {
        console.info(`   ❌ Server error: ${response.data.error}`);
        return false;
      }
    } else {
      console.info(`   ❌ Unexpected status: ${response.status}`);
      if (response.data) {
        console.info(`   ❌ Response: ${JSON.stringify(response.data, null, 2)}`);
      }
      return false;
    }
  } catch (error) {
    console.info(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Main deployment check function
 */
async function checkWeatherDeployment() {
  console.info('🌤️  Weather API Deployment Check');
  console.info('=================================');
  console.info(`Production URL: ${PRODUCTION_URL}`);
  console.info(`Check started: ${new Date().toISOString()}\n`);
  
  const results = {
    functionDeployed: false,
    corsConfigured: false,
    errorHandling: false,
    validRequest: false,
  };
  
  // Run all checks
  results.functionDeployed = await checkWeatherFunctionDeployment();
  results.corsConfigured = await checkCORSConfiguration();
  results.errorHandling = await checkErrorHandling();
  results.validRequest = await testValidRequest();
  
  // Generate summary
  console.info('\n📋 Deployment Check Summary');
  console.info('============================');
  
  const checks = [
    { name: 'Function Deployed', passed: results.functionDeployed },
    { name: 'CORS Configured', passed: results.corsConfigured },
    { name: 'Error Handling', passed: results.errorHandling },
    { name: 'Valid Request', passed: results.validRequest },
  ];
  
  checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    console.info(`${status} ${check.name}`);
  });
  
  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  
  console.info(`\nOverall: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    console.info('\n🎉 Weather API deployment is SUCCESSFUL!');
    console.info('   - Function is properly deployed');
    console.info('   - CORS is configured correctly');
    console.info('   - Error handling works as expected');
    console.info('   - API responds to valid requests');
  } else {
    console.info('\n⚠️  Weather API deployment has ISSUES:');
    
    if (!results.functionDeployed) {
      console.info('   - Weather function is not accessible (check deployment)');
    }
    if (!results.corsConfigured) {
      console.info('   - CORS headers are not configured properly');
    }
    if (!results.errorHandling) {
      console.info('   - Error handling is not working correctly');
    }
    if (!results.validRequest) {
      console.info('   - Valid requests are failing (check API key configuration)');
    }
  }
  
  console.info(`\nCheck completed: ${new Date().toISOString()}`);
  
  return passedChecks === totalChecks;
}

// Run check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkWeatherDeployment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Deployment check failed with error:', error);
      process.exit(1);
    });
}

export { checkWeatherDeployment };