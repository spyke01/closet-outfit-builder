#!/usr/bin/env node

/**
 * Production Debug Script
 * 
 * This script helps diagnose production issues with Supabase connections
 * and environment variables.
 */

console.log('🔍 Production Debug Information');
console.log('================================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
console.log('OPENWEATHER_API_KEY:', process.env.OPENWEATHER_API_KEY ? '✅ Set' : '❌ Missing');

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

console.log('\n🌐 Network Connectivity Test:');

// Test Supabase connectivity
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  console.log(`Testing connection to: ${supabaseUrl}`);
  
  // Test basic connectivity
  fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''}`,
    }
  })
  .then(response => {
    console.log('✅ Supabase connection successful');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
  })
  .catch(error => {
    console.log('❌ Supabase connection failed');
    console.log('Error:', error.message);
  });
} else {
  console.log('❌ Cannot test Supabase - URL not set');
}

console.log('\n🔧 Recommended Actions:');
console.log('1. Check Netlify environment variables in dashboard');
console.log('2. Verify Supabase project is active and accessible');
console.log('3. Check CSP headers in netlify.toml');
console.log('4. Test API endpoints directly');

console.log('\n📝 Next Steps:');
console.log('- Run: npm run check:auth');
console.log('- Check Netlify deploy logs');
console.log('- Verify Supabase RLS policies');