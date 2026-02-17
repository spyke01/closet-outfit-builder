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

console.info('🔍 Supabase Connection Diagnostics');
console.info('==================================\n');

if (!supabaseUrl || !supabaseKey) {
  console.info('❌ Missing environment variables:');
  console.info('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.info('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

console.info('✅ Environment variables found');
console.info('URL:', supabaseUrl);
console.info('Key:', supabaseKey.substring(0, 20) + '...\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.info('🧪 Testing Supabase connection...\n');

  try {
    // Test 1: Basic health check
    console.info('1. Testing basic connectivity...');
    const { data, error } = await supabase.from('wardrobe_items').select('count').limit(1);
    
    if (error) {
      console.info('❌ Basic connectivity failed:', error.message);
      
      // Check if it's an auth issue
      if (error.message.includes('JWT')) {
        console.info('💡 This looks like an authentication issue');
      } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.info('💡 This looks like a database schema issue');
      } else if (error.message.includes('RLS')) {
        console.info('💡 This looks like a Row Level Security issue');
      }
    } else {
      console.info('✅ Basic connectivity successful');
    }

    // Test 2: Auth status
    console.info('\n2. Testing auth status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.info('❌ Auth check failed:', authError.message);
    } else {
      console.info('✅ Auth check successful');
      console.info('User:', user ? `${user.email} (${user.id})` : 'No user logged in');
    }

    // Test 3: Database tables
    console.info('\n3. Testing database access...');
    const tables = ['wardrobe_items', 'categories', 'outfits', 'user_preferences'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('id').limit(1);
        if (tableError) {
          console.info(`❌ ${table}:`, tableError.message);
        } else {
          console.info(`✅ ${table}: accessible`);
        }
      } catch (err) {
        console.info(`❌ ${table}:`, err.message);
      }
    }

  } catch (error) {
    console.info('❌ Connection test failed:', error.message);
  }
}

// Test 4: Network-level connectivity
async function testNetworkConnectivity() {
  console.info('\n4. Testing network connectivity...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });
    
    console.info('✅ Network request successful');
    console.info('Status:', response.status);
    console.info('Content-Type:', response.headers.get('content-type'));
    
  } catch (error) {
    console.info('❌ Network request failed:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.info('💡 DNS resolution failed - check your internet connection');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.info('💡 Connection refused - Supabase might be down');
    } else if (error.message.includes('certificate')) {
      console.info('💡 SSL certificate issue');
    }
  }
}

async function runDiagnostics() {
  await testNetworkConnectivity();
  await testConnection();
  
  console.info('\n📋 Summary:');
  console.info('- If you see RLS errors, check your database policies');
  console.info('- If you see auth errors, verify your API keys');
  console.info('- If you see network errors, check your deployment environment');
  console.info('- For production issues, verify environment variables in Netlify dashboard');
}

runDiagnostics().catch(console.error);