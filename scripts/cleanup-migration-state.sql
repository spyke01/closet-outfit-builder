-- Cleanup Migration State
-- This script removes the partial migration entry from schema_migrations
-- Run this BEFORE running `supabase db push` again

-- Remove the partial migration entry
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20260208';

-- Verify cleanup
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 5;
