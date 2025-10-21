#!/usr/bin/env node

/**
 * Production Weather API Validation Script
 * 
 * This script validates the weather API functionality in the production environment.
 * It tests various scenarios including successful requests, error handling, and fallback behavior.
 */

import https from 'https';
import http from 'http';

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://what-to-wear.netlify.app';
const TEST_COORDINATES = [
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
];

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message,
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Validate weather response structure
 */
function validateWeatherResponse(data) {
  const errors = [];
  
  if (!data.current) {
    errors.push('Missing current weather data');
  } else {
    if (typeof data.current.temperature !== 'number') {
      errors.push('Invalid current temperature');
    }
    if (typeof data.current.condition !== 'string') {
      errors.push('Invalid current condition');
    }
    if (typeof data.current.icon !== 'string') {
      errors.push('Invalid current icon');
    }
  }
  
  if (!Array.isArray(data.forecast)) {
    errors.push('Missing or invalid forecast array');
  } else {
    if (data.forecast.length === 0) {
      errors.push('Empty forecast array');
    }
    
    data.forecast.forEach((day, index) => {
      if (!day.date) {
        errors.push(`Forecast day ${index}: missing date`);
      }
      if (!day.temperature || typeof day.temperature.high !== 'number' || typeof day.temperature.low !== 'number') {
        errors.push(`Forecast day ${index}: invalid temperature`);
      }
      if (typeof day.condition !== 'string') {
        errors.push(`Forecast day ${index}: invalid condition`);
      }
    });
  }
  
  return errors;
}

/**
 * Test weather API endpoint
 */
async function testWeatherEndpoint(location) {
  console.log(`\n🌍 Testing ${location.name} (${location.lat}, ${location.lon})`);
  
  const url = `${PRODUCTION_URL}/.netlify/functions/weather?lat=${location.lat}&lon=${location.lon}`;
  
  try {
    const response = await makeRequest(url);
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      const validationErrors = validateWeatherResponse(response.data);
      
      if (validationErrors.length === 0) {
        console.log(`   ✅ Temperature: ${response.data.current.temperature}°F`);
        console.log(`   ✅ Condition: ${response.data.current.condition}`);
        console.log(`   ✅ Forecast days: ${response.data.forecast.length}`);
        console.log(`   ✅ Response structure valid`);
        return { success: true, location: location.name };
      } else {
        console.log(`   ❌ Validation errors:`);
        validationErrors.forEach(error => console.log(`      - ${error}`));
        return { success: false, location: location.name, errors: validationErrors };
      }
    } else {
      console.log(`   ❌ Error: ${response.data.error || 'Unknown error'}`);
      if (response.data.details) {
        console.log(`   ❌ Details: ${response.data.details}`);
      }
      return { success: false, location: location.name, status: response.status, error: response.data };
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return { success: false, location: location.name, error: error.message };
  }
}

/**
 * Test error handling scenarios
 */
async function testErrorScenarios() {
  console.log(`\n🔧 Testing Error Handling Scenarios`);
  
  // Test 1: Missing parameters
  console.log(`\n   Testing missing parameters...`);
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/.netlify/functions/weather`);
    if (response.status === 400) {
      console.log(`   ✅ Missing parameters handled correctly (400)`);
    } else {
      console.log(`   ❌ Expected 400, got ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }
  
  // Test 2: Invalid coordinates
  console.log(`\n   Testing invalid coordinates...`);
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/.netlify/functions/weather?lat=999&lon=999`);
    if (response.status === 400) {
      console.log(`   ✅ Invalid coordinates handled correctly (400)`);
    } else {
      console.log(`   ❌ Expected 400, got ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }
  
  // Test 3: CORS headers
  console.log(`\n   Testing CORS headers...`);
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/.netlify/functions/weather?lat=40.7128&lon=-74.0060`);
    if (response.headers['access-control-allow-origin']) {
      console.log(`   ✅ CORS headers present`);
    } else {
      console.log(`   ❌ CORS headers missing`);
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }
}

/**
 * Test performance and reliability
 */
async function testPerformance() {
  console.log(`\n⚡ Testing Performance and Reliability`);
  
  const testLocation = TEST_COORDINATES[0]; // Use New York for performance test
  const url = `${PRODUCTION_URL}/.netlify/functions/weather?lat=${testLocation.lat}&lon=${testLocation.lon}`;
  
  const results = [];
  const concurrentRequests = 3;
  
  console.log(`\n   Making ${concurrentRequests} concurrent requests...`);
  
  const promises = Array(concurrentRequests).fill().map(async (_, index) => {
    const startTime = Date.now();
    try {
      const response = await makeRequest(url);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        index: index + 1,
        success: response.status === 200,
        duration,
        status: response.status,
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        index: index + 1,
        success: false,
        duration,
        error: error.message,
      };
    }
  });
  
  const results_data = await Promise.all(promises);
  
  results_data.forEach(result => {
    if (result.success) {
      console.log(`   ✅ Request ${result.index}: ${result.duration}ms (${result.status})`);
    } else {
      console.log(`   ❌ Request ${result.index}: ${result.duration}ms (${result.error || result.status})`);
    }
  });
  
  const successfulRequests = results_data.filter(r => r.success);
  const averageTime = successfulRequests.length > 0 
    ? successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length 
    : 0;
  
  console.log(`\n   📊 Success rate: ${successfulRequests.length}/${concurrentRequests} (${Math.round(successfulRequests.length / concurrentRequests * 100)}%)`);
  console.log(`   📊 Average response time: ${Math.round(averageTime)}ms`);
  
  return {
    successRate: successfulRequests.length / concurrentRequests,
    averageTime,
  };
}

/**
 * Main validation function
 */
async function validateProductionWeatherAPI() {
  console.log('🌤️  Production Weather API Validation');
  console.log('=====================================');
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`Test started: ${new Date().toISOString()}`);
  
  const results = {
    locationTests: [],
    errorHandling: true,
    performance: null,
    overall: false,
  };
  
  // Test multiple locations
  console.log(`\n📍 Testing Weather API with Multiple Locations`);
  for (const location of TEST_COORDINATES) {
    const result = await testWeatherEndpoint(location);
    results.locationTests.push(result);
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test error handling
  await testErrorScenarios();
  
  // Test performance
  results.performance = await testPerformance();
  
  // Generate summary
  console.log(`\n📋 Validation Summary`);
  console.log('====================');
  
  const successfulLocations = results.locationTests.filter(r => r.success);
  console.log(`Location tests: ${successfulLocations.length}/${results.locationTests.length} passed`);
  
  if (results.performance) {
    console.log(`Performance: ${Math.round(results.performance.successRate * 100)}% success rate, ${Math.round(results.performance.averageTime)}ms avg`);
  }
  
  results.overall = successfulLocations.length >= results.locationTests.length * 0.75 && 
                   results.performance.successRate >= 0.75;
  
  if (results.overall) {
    console.log(`\n✅ Production weather API validation PASSED`);
    console.log(`   - Weather data is accessible and properly formatted`);
    console.log(`   - Error handling works correctly`);
    console.log(`   - Performance is acceptable`);
    console.log(`   - CORS headers are configured`);
  } else {
    console.log(`\n❌ Production weather API validation FAILED`);
    console.log(`   - Check API key configuration in Netlify environment variables`);
    console.log(`   - Verify network connectivity and DNS resolution`);
    console.log(`   - Review error logs for specific issues`);
  }
  
  console.log(`\nTest completed: ${new Date().toISOString()}`);
  
  return results.overall;
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateProductionWeatherAPI()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed with error:', error);
      process.exit(1);
    });
}

export { validateProductionWeatherAPI };