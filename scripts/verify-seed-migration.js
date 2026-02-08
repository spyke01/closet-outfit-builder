#!/usr/bin/env node

/**
 * Verification script for seed_system_categories migration
 * Checks SQL syntax and structure without executing against database
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILE = join(__dirname, '../supabase/migrations/20260208_create_seed_function.sql');

console.log('🔍 Verifying seed_system_categories migration...\n');

try {
  // Read the migration file
  const sql = readFileSync(MIGRATION_FILE, 'utf-8');
  
  // Basic syntax checks
  const checks = [
    {
      name: 'Function creation',
      test: () => sql.includes('CREATE OR REPLACE FUNCTION seed_system_categories'),
      error: 'Missing function creation statement'
    },
    {
      name: 'Function signature',
      test: () => sql.includes('seed_system_categories(p_user_id UUID)'),
      error: 'Incorrect function signature'
    },
    {
      name: 'SECURITY DEFINER',
      test: () => sql.includes('SECURITY DEFINER'),
      error: 'Missing SECURITY DEFINER clause'
    },
    {
      name: 'Men\'s categories count',
      test: () => {
        const menCategories = [
          'Dress Shirt', 'Casual Shirt', 'Suit Jacket', 'Pants',
          'Jeans', 'Shoes', 'Belt', 'Coat/Jacket'
        ];
        return menCategories.every(cat => sql.includes(`'${cat}'`) && sql.includes(`'men'`));
      },
      error: 'Missing or incomplete men\'s categories'
    },
    {
      name: 'Women\'s categories count',
      test: () => {
        const womenCategories = [
          'Dress', 'Blouse/Top', 'Pants', 'Jeans',
          'Shoes', 'Jacket/Coat', 'Suit Jacket', 'Belt'
        ];
        return womenCategories.every(cat => sql.includes(`'${cat}'`) && sql.includes(`'women'`));
      },
      error: 'Missing or incomplete women\'s categories'
    },
    {
      name: 'ON CONFLICT clause',
      test: () => sql.includes('ON CONFLICT (user_id, name) DO NOTHING'),
      error: 'Missing or incorrect ON CONFLICT clause for idempotency'
    },
    {
      name: 'is_system_category flag',
      test: () => {
        // Count 'true,' patterns which represent is_system_category = true
        const trueCount = (sql.match(/^\s*true,/gm) || []).length;
        return trueCount === 16;
      },
      error: 'Not all categories marked as system categories'
    },
    {
      name: 'measurement_guide JSONB',
      test: () => sql.includes('jsonb_build_object') && sql.includes('measurement_guide'),
      error: 'Missing measurement_guide JSONB data'
    },
    {
      name: 'GRANT EXECUTE',
      test: () => sql.includes('GRANT EXECUTE ON FUNCTION seed_system_categories'),
      error: 'Missing GRANT EXECUTE statement'
    },
    {
      name: 'Function comment',
      test: () => sql.includes('COMMENT ON FUNCTION seed_system_categories'),
      error: 'Missing function documentation comment'
    },
    {
      name: 'Measurement fields',
      test: () => {
        const requiredFields = ['fields', 'label', 'description', 'typical_range', 'size_examples'];
        return requiredFields.every(field => sql.includes(`'${field}'`));
      },
      error: 'Missing required measurement guide fields'
    },
    {
      name: 'Supported formats',
      test: () => {
        const formats = ['letter', 'numeric', 'waist-inseam', 'measurements'];
        return formats.every(format => sql.includes(`'${format}'`));
      },
      error: 'Missing supported sizing formats'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  checks.forEach(check => {
    try {
      if (check.test()) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}: ${check.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
      failed++;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50) + '\n');
  
  if (failed === 0) {
    console.log('✅ Migration file is valid and ready to deploy!\n');
    console.log('Next steps:');
    console.log('1. Apply migration: supabase db push');
    console.log('2. Test function: psql -f scripts/test-seed-function.sql');
    console.log('3. Verify in application: Call seed API route\n');
    process.exit(0);
  } else {
    console.log('❌ Migration file has issues that need to be fixed.\n');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}
