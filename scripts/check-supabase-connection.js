#!/usr/bin/env node

/**
 * Supabase Connection Checker
 * 
 * Tests Supabase connectivity and diagnoses common issues
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Supabase Connection Diagnostics');
console.log('==================================\n');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

console.log('✅ Environment variables found');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🧪 Testing Supabase connection...\n');

  try {
    // Test 1: Basic health check
    console.log('1. Testing basic connectivity...');
    const { data, error } = await supabase.from('wardrobe_items').select('count').limit(1);
    
    if (error) {
      console.log('❌ Basic connectivity failed:', error.message);
      
      // Check if it's an auth issue
      if (error.message.includes('JWT')) {
        console.log('💡 This looks like an authentication issue');
      } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('💡 This looks like a database schema issue');
      } else if (error.message.includes('RLS')) {
        console.log('💡 This looks like a Row Level Security issue');
      }
    } else {
      console.log('✅ Basic connectivity successful');
    }

    // Test 2: Auth status
    console.log('\n2. Testing auth status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth check failed:', authError.message);
    } else {
      console.log('✅ Auth check successful');
      console.log('User:', user ? `${user.email} (${user.id})` : 'No user logged in');
    }

    // Test 3: Database tables
    console.log('\n3. Testing database access...');
    const tables = ['wardrobe_items', 'categories', 'outfits', 'user_preferences'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('id').limit(1);
        if (tableError) {
          console.log(`❌ ${table}:`, tableError.message);
        } else {
          console.log(`✅ ${table}: accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}:`, err.message);
      }
    }

  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
  }
}

// Test 4: Network-level connectivity
async function testNetworkConnectivity() {
  console.log('\n4. Testing network connectivity...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });
    
    console.log('✅ Network request successful');
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
  } catch (error) {
    console.log('❌ Network request failed:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 DNS resolution failed - check your internet connection');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Connection refused - Supabase might be down');
    } else if (error.message.includes('certificate')) {
      console.log('💡 SSL certificate issue');
    }
  }
}

async function runDiagnostics() {
  await testNetworkConnectivity();
  await testConnection();
  
  console.log('\n📋 Summary:');
  console.log('- If you see RLS errors, check your database policies');
  console.log('- If you see auth errors, verify your API keys');
  console.log('- If you see network errors, check your deployment environment');
  console.log('- For production issues, verify environment variables in Netlify dashboard');
}

runDiagnostics().catch(console.error);