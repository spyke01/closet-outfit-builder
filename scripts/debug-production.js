#!/usr/bin/env node

/**
 * Production Debug Script
 * 
 * This script helps diagnose production issues with Supabase connections
 * and environment variables.
 */

console.info('🔍 Production Debug Information');
console.info('================================\n');

// Check environment variables
console.info('📋 Environment Variables:');
console.info('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.info('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
console.info('OPENWEATHER_API_KEY:', process.env.OPENWEATHER_API_KEY ? '✅ Set' : '❌ Missing');

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.info('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

console.info('\n🌐 Network Connectivity Test:');

// Test Supabase connectivity
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  console.info(`Testing connection to: ${supabaseUrl}`);
  
  // Test basic connectivity
  fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''}`,
    }
  })
  .then(response => {
    console.info('✅ Supabase connection successful');
    console.info('Status:', response.status);
    console.info('Headers:', Object.fromEntries(response.headers.entries()));
  })
  .catch(error => {
    console.info('❌ Supabase connection failed');
    console.info('Error:', error.message);
  });
} else {
  console.info('❌ Cannot test Supabase - URL not set');
}

console.info('\n🔧 Recommended Actions:');
console.info('1. Check Netlify environment variables in dashboard');
console.info('2. Verify Supabase project is active and accessible');
console.info('3. Check CSP headers in netlify.toml');
console.info('4. Test API endpoints directly');

console.info('\n📝 Next Steps:');
console.info('- Run: npm run check:auth');
console.info('- Check Netlify deploy logs');
console.info('- Verify Supabase RLS policies');