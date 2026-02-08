-- Verification Script for 20260208_add_system_categories.sql Migration
-- Run this after applying the migration to verify it was successful

-- ============================================================================
-- 1. Verify new columns exist in size_categories table
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name = 'gender' THEN 'Should be TEXT with CHECK constraint'
    WHEN column_name = 'measurement_guide' THEN 'Should be JSONB with default {}'
    ELSE ''
  END as expected
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'size_categories'
  AND column_name IN ('gender', 'measurement_guide')
ORDER BY ordinal_position;

-- Expected output:
-- gender | text | YES | NULL | Should be TEXT with CHECK constraint
-- measurement_guide | jsonb | YES | '{}'::jsonb | Should be JSONB with default {}

-- ============================================================================
-- 2. Verify CHECK constraint on gender column
-- ============================================================================

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'size_categories'::regclass
  AND conname LIKE '%gender%';

-- Expected output should include:
-- CHECK (gender IN ('men', 'women', 'unisex'))

-- ============================================================================
-- 3. Verify RLS policy was updated to prevent system category deletion
-- ============================================================================

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'size_categories'
  AND cmd = 'DELETE';

-- Expected output:
-- "Users can delete their own non-system categories" | DELETE | 
-- qual should include: (auth.uid() = user_id) AND (is_system_category = false)

-- ============================================================================
-- 4. Verify index was created for gender filtering
-- ============================================================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'size_categories'
  AND indexname = 'idx_size_categories_gender';

-- Expected output:
-- idx_size_categories_gender | CREATE INDEX idx_size_categories_gender ON public.size_categories USING btree (user_id, gender) WHERE (gender IS NOT NULL)

-- ============================================================================
-- 5. Verify existing data is preserved
-- ============================================================================

SELECT 
  COUNT(*) as total_categories,
  COUNT(CASE WHEN gender IS NULL THEN 1 END) as categories_without_gender,
  COUNT(CASE WHEN measurement_guide = '{}'::jsonb THEN 1 END) as categories_with_default_guide
FROM size_categories;

-- Expected: All existing categories should have NULL gender and '{}' measurement_guide

-- ============================================================================
-- 6. Test inserting a new system category with gender and measurement guide
-- ============================================================================

-- This is a test insert - you may want to rollback after verification
BEGIN;

INSERT INTO size_categories (
  user_id,
  name,
  icon,
  gender,
  supported_formats,
  is_system_category,
  measurement_guide
) VALUES (
  auth.uid(), -- Replace with a test user ID if needed
  'Test Dress Shirt',
  'shirt',
  'men',
  ARRAY['numeric', 'measurements'],
  true,
  '{"fields": [{"name": "collar", "label": "Collar Size"}, {"name": "sleeve", "label": "Sleeve Length"}]}'::JSONB
);

-- Verify the insert worked
SELECT 
  name,
  gender,
  is_system_category,
  measurement_guide
FROM size_categories
WHERE name = 'Test Dress Shirt';

-- Try to delete the system category (should fail)
DELETE FROM size_categories 
WHERE name = 'Test Dress Shirt' 
  AND is_system_category = true;

-- Check if it still exists (should still be there)
SELECT COUNT(*) as should_be_1
FROM size_categories
WHERE name = 'Test Dress Shirt';

-- Cleanup test data
DELETE FROM size_categories WHERE name = 'Test Dress Shirt';

ROLLBACK; -- Or COMMIT if you want to keep the test data

-- ============================================================================
-- 7. Verify column comments
-- ============================================================================

SELECT 
  cols.column_name,
  pg_catalog.col_description(c.oid, cols.ordinal_position::int) as column_comment
FROM information_schema.columns cols
JOIN pg_catalog.pg_class c ON c.relname = cols.table_name
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'size_categories'
  AND cols.column_name IN ('gender', 'measurement_guide');

-- Expected output:
-- gender | Gender category: men, women, or unisex
-- measurement_guide | JSONB object containing measurement instructions and field definitions

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 
  'Migration 20260208_add_system_categories.sql verification complete' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'size_categories' 
        AND column_name IN ('gender', 'measurement_guide')
      HAVING COUNT(*) = 2
    ) THEN 'PASSED'
    ELSE 'FAILED'
  END as columns_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'size_categories' 
        AND policyname = 'Users can delete their own non-system categories'
    ) THEN 'PASSED'
    ELSE 'FAILED'
  END as policy_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'size_categories' 
        AND indexname = 'idx_size_categories_gender'
    ) THEN 'PASSED'
    ELSE 'FAILED'
  END as index_check;

