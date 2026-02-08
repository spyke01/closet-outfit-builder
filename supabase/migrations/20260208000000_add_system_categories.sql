-- Add System Categories Support
-- Adds gender and measurement_guide columns to size_categories table
-- Adds constraint to prevent system category deletion

-- ============================================================================
-- Add new columns to size_categories table
-- ============================================================================

-- Add gender column with constraint
ALTER TABLE size_categories 
ADD COLUMN IF NOT EXISTS gender TEXT 
CHECK (gender IN ('men', 'women', 'unisex'));

-- Add comment for gender column
COMMENT ON COLUMN size_categories.gender IS 'Gender category: men, women, or unisex';

-- Add measurement_guide JSONB column with default empty object
ALTER TABLE size_categories 
ADD COLUMN IF NOT EXISTS measurement_guide JSONB 
DEFAULT '{}'::JSONB;

-- Add comment for measurement_guide column
COMMENT ON COLUMN size_categories.measurement_guide IS 'JSONB object containing measurement instructions and field definitions';

-- ============================================================================
-- Update RLS policies to prevent system category deletion
-- ============================================================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own categories" ON size_categories;

-- Drop the new policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can delete their own non-system categories" ON size_categories;

-- Create new delete policy that prevents deletion of system categories
CREATE POLICY "Users can delete their own non-system categories"
  ON size_categories FOR DELETE
  USING (auth.uid() = user_id AND is_system_category = false);

-- ============================================================================
-- Add index for gender filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_size_categories_gender 
ON size_categories(user_id, gender) 
WHERE gender IS NOT NULL;

-- ============================================================================
-- Migration Notes
-- ============================================================================

-- This migration:
-- 1. Adds gender column to support men's/women's/unisex categories
-- 2. Adds measurement_guide JSONB column for storing measurement instructions
-- 3. Updates RLS policy to prevent deletion of system categories
-- 4. Adds index for efficient gender-based filtering
-- 5. Preserves all existing data (columns are nullable and have defaults)
-- 6. Is safe to run multiple times (uses IF NOT EXISTS and IF EXISTS)

