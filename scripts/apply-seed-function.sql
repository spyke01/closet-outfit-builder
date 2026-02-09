-- Quick Apply: Seed Function for System Categories
-- Run this in Supabase SQL Editor if the migration didn't apply automatically
-- This creates the seed_system_categories function with corrected icon names

-- Drop and recreate the function
DROP FUNCTION IF EXISTS seed_system_categories(UUID);

-- Copy the entire contents of supabase/migrations/20260208000001_create_seed_function.sql here
-- Or run that file directly in the SQL Editor

-- After running, verify with:
-- SELECT proname FROM pg_proc WHERE proname = 'seed_system_categories';
