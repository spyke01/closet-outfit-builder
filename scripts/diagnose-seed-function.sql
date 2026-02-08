-- Diagnostic Script for Seed Function
-- Run this in Supabase SQL Editor to check the current state

-- 1. Check if the function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'seed_system_categories';

-- 2. Check if the new columns exist
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'size_categories' 
  AND column_name IN ('gender', 'measurement_guide', 'is_system_category');

-- 3. Check applied migrations
SELECT 
  version, 
  name,
  executed_at
FROM supabase_migrations.schema_migrations 
WHERE version LIKE '202602080%'
ORDER BY version;

-- 4. Check RLS policies on size_categories
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'size_categories'
ORDER BY policyname;

-- 5. Check if any system categories exist
SELECT 
  COUNT(*) as system_category_count,
  user_id
FROM size_categories 
WHERE is_system_category = true
GROUP BY user_id;
