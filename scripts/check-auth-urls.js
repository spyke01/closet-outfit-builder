#!/usr/bin/env node

/**
 * Check authentication URLs and configuration
 */

console.info('🔍 Authentication URL Configuration Check\n');

// Environment variables
console.info('📋 Environment Variables:');
console.info(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}`);
console.info(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET'}`);
console.info(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.info(`NETLIFY_URL: ${process.env.NETLIFY_URL || 'NOT SET'}`);
console.info(`NETLIFY_URL: ${process.env.NETLIFY_URL || 'NOT SET'}`);

// Expected URLs
const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = process.env.NETLIFY_URL 
  ? `https://${process.env.NETLIFY_URL}` 
  : process.env.NETLIFY_URL
  ? `https://${process.env.NETLIFY_URL}`
  : 'http://localhost:3000';

console.info('\n🌐 Expected URLs:');
console.info(`Base URL: ${baseUrl}`);
console.info(`Auth Callback: ${baseUrl}/auth/callback`);
console.info(`Auth Confirm: ${baseUrl}/auth/confirm`);

console.info('\n✅ Supabase Configuration Checklist:');
console.info('□ Site URL set to your production domain');
console.info('□ Redirect URLs include your production callback URL');
console.info('□ Google OAuth redirect URIs updated');
console.info('□ Environment variables set in Netlify dashboard');

console.info('\n📝 Next Steps:');
console.info('1. Update Supabase Site URL to your production domain');
console.info('2. Add production callback URL to Supabase redirect URLs');
console.info('3. Update Google OAuth redirect URIs');
console.info('4. Clear browser cache and test again');