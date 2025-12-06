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

console.log('🔍 Production Environment Verification');
console.log('=====================================\n');

// Check if we're in a build environment
const isBuild = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Netlify Build:', process.env.NETLIFY === 'true' ? 'Yes' : 'No');
console.log('Build Context:', process.env.CONTEXT || 'local');

console.log('\n📋 Environment Variables Status:');

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
  
  console.log(`${varName}: ${isSet ? '✅' : '❌'} ${isSet ? 'Set' : 'Missing'}`);
  
  if (isSet && varName.includes('SUPABASE')) {
    // Show partial value for verification
    const partial = value.length > 20 ? 
      `${value.substring(0, 20)}...${value.substring(value.length - 10)}` : 
      value;
    console.log(`  Value: ${partial}`);
  }
});

console.log(`\n📊 Overall Status: ${allSet ? '✅ All Required Variables Set' : '❌ Missing Variables'}`);

if (!allSet) {
  console.log('\n🚨 Action Required:');
  console.log('1. Go to Netlify Dashboard → Site Settings → Environment Variables');
  console.log('2. Add the missing environment variables');
  console.log('3. Redeploy your site');
  console.log('4. Test the /debug page to verify connectivity');
}

console.log('\n🔗 Useful Links:');
console.log('- Netlify Environment Variables: https://docs.netlify.com/environment-variables/overview/');
console.log('- Supabase Dashboard: https://app.supabase.com/');
console.log('- Debug Page: /debug (after deployment)');

// If this is running in Netlify build, also check build-specific vars
if (process.env.NETLIFY === 'true') {
  console.log('\n🏗️ Netlify Build Information:');
  console.log('Site ID:', process.env.NETLIFY_SITE_ID || 'Not available');
  console.log('Deploy ID:', process.env.NETLIFY_DEPLOY_ID || 'Not available');
  console.log('Branch:', process.env.BRANCH || 'Not available');
  console.log('Deploy URL:', process.env.DEPLOY_URL || 'Not available');
  console.log('Site URL:', process.env.URL || 'Not available');
}

process.exit(allSet ? 0 : 1);