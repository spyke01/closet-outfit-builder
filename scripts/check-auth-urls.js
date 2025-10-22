#!/usr/bin/env node

/**
 * Check authentication URLs and configuration
 */

console.log('🔍 Authentication URL Configuration Check\n');

// Environment variables
console.log('📋 Environment Variables:');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}`);
console.log(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`NETLIFY_URL: ${process.env.NETLIFY_URL || 'NOT SET'}`);
console.log(`NETLIFY_URL: ${process.env.NETLIFY_URL || 'NOT SET'}`);

// Expected URLs
const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = process.env.NETLIFY_URL 
  ? `https://${process.env.NETLIFY_URL}` 
  : process.env.NETLIFY_URL
  ? `https://${process.env.NETLIFY_URL}`
  : 'http://localhost:3000';

console.log('\n🌐 Expected URLs:');
console.log(`Base URL: ${baseUrl}`);
console.log(`Auth Callback: ${baseUrl}/auth/callback`);
console.log(`Auth Confirm: ${baseUrl}/auth/confirm`);

console.log('\n✅ Supabase Configuration Checklist:');
console.log('□ Site URL set to your production domain');
console.log('□ Redirect URLs include your production callback URL');
console.log('□ Google OAuth redirect URIs updated');
console.log('□ Environment variables set in Netlify dashboard');

console.log('\n📝 Next Steps:');
console.log('1. Update Supabase Site URL to your production domain');
console.log('2. Add production callback URL to Supabase redirect URLs');
console.log('3. Update Google OAuth redirect URIs');
console.log('4. Clear browser cache and test again');