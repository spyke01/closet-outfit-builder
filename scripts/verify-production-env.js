#!/usr/bin/env node

/**
 * Production Environment Verification
 * 
 * This script helps verify that environment variables are properly set
 * in production and provides debugging information.
 */

import { config } from 'dotenv';

// Load environment variables for local testing
if (process.env.NODE_ENV !== 'production' && process.env.NETLIFY !== 'true') {
  config({ path: '.env.local' });
}

console.info('🔍 Production Environment Verification');
console.info('=====================================\n');

// Check if we're in a build environment
const isBuild = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';
console.info('Environment:', process.env.NODE_ENV || 'development');
console.info('Netlify Build:', process.env.NETLIFY === 'true' ? 'Yes' : 'No');
console.info('Build Context:', process.env.CONTEXT || 'local');

console.info('\n📋 Environment Variables Status:');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'OPENWEATHER_API_KEY'
];

let allSet = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isSet = !!value;
  allSet = allSet && isSet;
  
  console.info(`${varName}: ${isSet ? '✅' : '❌'} ${isSet ? 'Set' : 'Missing'}`);
  
  if (isSet && varName.includes('SUPABASE')) {
    // Show partial value for verification
    const partial = value.length > 20 ? 
      `${value.substring(0, 20)}...${value.substring(value.length - 10)}` : 
      value;
    console.info(`  Value: ${partial}`);
  }
});

console.info(`\n📊 Overall Status: ${allSet ? '✅ All Required Variables Set' : '❌ Missing Variables'}`);

if (!allSet) {
  console.info('\n🚨 Action Required:');
  console.info('1. Go to Netlify Dashboard → Site Settings → Environment Variables');
  console.info('2. Add the missing environment variables');
  console.info('3. Redeploy your site');
  console.info('4. Test the /debug page to verify connectivity');
}

console.info('\n🔗 Useful Links:');
console.info('- Netlify Environment Variables: https://docs.netlify.com/environment-variables/overview/');
console.info('- Supabase Dashboard: https://app.supabase.com/');
console.info('- Debug Page: /debug (after deployment)');

// If this is running in Netlify build, also check build-specific vars
if (process.env.NETLIFY === 'true') {
  console.info('\n🏗️ Netlify Build Information:');
  console.info('Site ID:', process.env.NETLIFY_SITE_ID || 'Not available');
  console.info('Deploy ID:', process.env.NETLIFY_DEPLOY_ID || 'Not available');
  console.info('Branch:', process.env.BRANCH || 'Not available');
  console.info('Deploy URL:', process.env.DEPLOY_URL || 'Not available');
  console.info('Site URL:', process.env.URL || 'Not available');
}

process.exit(allSet ? 0 : 1);