#!/usr/bin/env node

/**
 * Weather API Environment Validation
 * 
 * This script validates that the weather API environment is properly configured
 * for both local development and production deployment.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment variables from .env.local
 */
function loadLocalEnvironment() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (value && !key.startsWith('#')) {
          envVars[key.trim()] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    return null;
  }
}

/**
 * Validate API key format
 */
function validateAPIKey(apiKey) {
  if (!apiKey) {
    return { valid: false, message: 'API key is missing' };
  }
  
  if (typeof apiKey !== 'string') {
    return { valid: false, message: 'API key must be a string' };
  }
  
  if (apiKey.length < 10) {
    return { valid: false, message: 'API key appears to be too short' };
  }
  
  if (apiKey.includes('your_') || apiKey.includes('placeholder')) {
    return { valid: false, message: 'API key appears to be a placeholder value' };
  }
  
  // OpenWeatherMap API keys are typically 32 characters
  if (apiKey.length !== 32) {
    return { valid: false, message: `API key length is ${apiKey.length}, expected 32 characters` };
  }
  
  // Check if it contains only valid characters (alphanumeric)
  if (!/^[a-zA-Z0-9]+$/.test(apiKey)) {
    return { valid: false, message: 'API key contains invalid characters' };
  }
  
  return { valid: true, message: 'API key format is valid' };
}

/**
 * Test API key with OpenWeatherMap
 */
async function testAPIKey(apiKey) {
  try {
    const testUrl = `https://api.openweathermap.org/data/2.5/weather?lat=40.7128&lon=-74.0060&appid=${apiKey}&units=imperial`;
    
    const response = await fetch(testUrl);
    
    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        message: 'API key is working correctly',
        temperature: data.main?.temp,
        location: 'New York City'
      };
    } else if (response.status === 401) {
      return {
        valid: false,
        message: 'API key is invalid or not activated',
        status: response.status
      };
    } else if (response.status === 429) {
      return {
        valid: false,
        message: 'API key rate limit exceeded',
        status: response.status
      };
    } else {
      return {
        valid: false,
        message: `API request failed with status ${response.status}`,
        status: response.status
      };
    }
  } catch (error) {
    return {
      valid: false,
      message: `API test failed: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Check Supabase configuration
 */
function validateSupabaseConfig(envVars) {
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  const issues = [];
  
  if (!supabaseUrl) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL is missing');
  } else if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL format appears invalid');
  }
  
  if (!supabaseKey) {
    issues.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing');
  } else if (supabaseKey.length < 100) {
    issues.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY appears too short');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not set',
    keyLength: supabaseKey ? supabaseKey.length : 0
  };
}

/**
 * Main validation function
 */
async function validateWeatherEnvironment() {
  console.info('🌤️  Weather API Environment Validation');
  console.info('=======================================');
  console.info(`Validation started: ${new Date().toISOString()}\n`);
  
  // Load local environment
  console.info('📁 Checking Local Environment (.env.local)...');
  const localEnv = loadLocalEnvironment();
  
  if (localEnv) {
    console.info('   ✅ .env.local file found and loaded');
    console.info(`   ✅ Found ${Object.keys(localEnv).length} environment variables`);
  } else {
    console.info('   ⚠️  .env.local file not found or could not be read');
    console.info('   ⚠️  Using system environment variables only');
  }
  
  // Check OpenWeatherMap API key
  console.info('\n🔑 Validating OpenWeatherMap API Key...');
  const apiKey = (localEnv && localEnv.OPENWEATHER_API_KEY) || process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.info('   ❌ OPENWEATHER_API_KEY not found in environment');
    console.info('   ❌ Set this variable in .env.local for local development');
    console.info('   ❌ Set this variable in Netlify dashboard for production');
  } else {
    const formatValidation = validateAPIKey(apiKey);
    
    if (formatValidation.valid) {
      console.info('   ✅ API key format is valid');
      console.info(`   ✅ API key length: ${apiKey.length} characters`);
      
      // Test API key with actual request
      console.info('   🔍 Testing API key with OpenWeatherMap...');
      const apiTest = await testAPIKey(apiKey);
      
      if (apiTest.valid) {
        console.info('   ✅ API key is working correctly');
        console.info(`   ✅ Test location: ${apiTest.location}`);
        console.info(`   ✅ Current temperature: ${apiTest.temperature}°F`);
      } else {
        console.info(`   ❌ API key test failed: ${apiTest.message}`);
        if (apiTest.status) {
          console.info(`   ❌ HTTP status: ${apiTest.status}`);
        }
      }
    } else {
      console.info(`   ❌ API key format issue: ${formatValidation.message}`);
    }
  }
  
  // Check Supabase configuration
  console.info('\n🗄️  Validating Supabase Configuration...');
  const supabaseValidation = validateSupabaseConfig(localEnv || {});
  
  if (supabaseValidation.valid) {
    console.info('   ✅ Supabase configuration is valid');
    console.info(`   ✅ Supabase URL: ${supabaseValidation.url}`);
    console.info(`   ✅ Publishable key length: ${supabaseValidation.keyLength} characters`);
  } else {
    console.info('   ❌ Supabase configuration issues:');
    supabaseValidation.issues.forEach(issue => {
      console.info(`      - ${issue}`);
    });
  }
  
  // Check required files
  console.info('\n📄 Checking Required Files...');
  const requiredFiles = [
    'netlify/functions/weather.ts',
    'components/weather-widget.tsx',
    'lib/hooks/use-weather.ts',
    'netlify.toml'
  ];
  
  let missingFiles = 0;
  
  for (const file of requiredFiles) {
    try {
      const filePath = path.join(__dirname, '..', file);
      readFileSync(filePath);
      console.info(`   ✅ ${file}`);
    } catch (error) {
      console.info(`   ❌ ${file} (missing or unreadable)`);
      missingFiles++;
    }
  }
  
  // Generate summary
  console.info('\n📋 Environment Validation Summary');
  console.info('=================================');
  
  const checks = [
    { name: 'Environment File', passed: !!localEnv },
    { name: 'API Key Present', passed: !!apiKey },
    { name: 'API Key Format', passed: apiKey ? validateAPIKey(apiKey).valid : false },
    { name: 'Supabase Config', passed: supabaseValidation.valid },
    { name: 'Required Files', passed: missingFiles === 0 },
  ];
  
  checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    console.info(`${status} ${check.name}`);
  });
  
  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  
  console.info(`\nOverall: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    console.info('\n🎉 Environment is properly configured for weather API!');
    console.info('   - All required environment variables are set');
    console.info('   - API key is valid and working');
    console.info('   - Supabase configuration is correct');
    console.info('   - All required files are present');
  } else {
    console.info('\n⚠️  Environment configuration needs attention:');
    
    const failedChecks = checks.filter(c => !c.passed);
    failedChecks.forEach(check => {
      console.info(`   - Fix: ${check.name}`);
    });
    
    console.info('\n📖 For detailed setup instructions, see:');
    console.info('   - README.md (general setup)');
    console.info('   - docs/weather-api-production-validation.md (weather API setup)');
  }
  
  console.info(`\nValidation completed: ${new Date().toISOString()}`);
  
  return passedChecks === totalChecks;
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateWeatherEnvironment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Environment validation failed with error:', error);
      process.exit(1);
    });
}

export { validateWeatherEnvironment };