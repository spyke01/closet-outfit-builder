-- My Sizes Feature Database Schema
-- Creates tables for storing user clothing size information across categories and brands
-- Implements Row Level Security (RLS) for user data isolation

-- ============================================================================
-- Table: size_categories
-- Purpose: Store clothing category definitions (e.g., Tops, Bottoms, Footwear)
-- ============================================================================
CREATE TABLE IF NOT EXISTS size_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  icon TEXT,
  supported_formats TEXT[] NOT NULL DEFAULT ARRAY['letter']::TEXT[],
  is_system_category BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique category names per user
  CONSTRAINT unique_user_category_name UNIQUE (user_id, name)
);

-- Add comment
COMMENT ON TABLE size_categories IS 'Clothing category definitions with supported sizing formats';
COMMENT ON COLUMN size_categories.supported_formats IS 'Array of supported formats: letter, numeric, waist-inseam, measurements';
COMMENT ON COLUMN size_categories.is_system_category IS 'True for default categories, false for user-created';

-- ============================================================================
-- Table: standard_sizes
-- Purpose: Store standard/primary size for each category
-- ============================================================================
CREATE TABLE IF NOT EXISTS standard_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES size_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_size TEXT NOT NULL CHECK (char_length(primary_size) <= 20),
  secondary_size TEXT CHECK (char_length(secondary_size) <= 20),
  notes TEXT CHECK (char_length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One standard size per category per user
  CONSTRAINT unique_user_category_standard_size UNIQUE (user_id, category_id)
);

-- Add comment
COMMENT ON TABLE standard_sizes IS 'Standard/primary sizes for each category';
COMMENT ON COLUMN standard_sizes.primary_size IS 'Primary size value (e.g., M, 32, 32x34)';
COMMENT ON COLUMN standard_sizes.secondary_size IS 'Optional secondary size value';

-- ============================================================================
-- Table: brand_sizes
-- Purpose: Store brand-specific size overrides
-- ============================================================================
CREATE TABLE IF NOT EXISTS brand_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES size_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL CHECK (char_length(brand_name) <= 100),
  item_type TEXT CHECK (char_length(item_type) <= 100),
  size TEXT NOT NULL CHECK (char_length(size) <= 20),
  fit_scale INTEGER NOT NULL CHECK (fit_scale >= 1 AND fit_scale <= 5),
  notes TEXT CHECK (char_length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE brand_sizes IS 'Brand-specific size overrides and fit information';
COMMENT ON COLUMN brand_sizes.fit_scale IS '1=runs small, 2=slightly small, 3=true to size, 4=slightly large, 5=runs large';
COMMENT ON COLUMN brand_sizes.item_type IS 'Optional item type (e.g., Dress Shirt, Jeans)';

-- ============================================================================
-- Table: category_measurements
-- Purpose: Store body measurements for each category
-- ============================================================================
CREATE TABLE IF NOT EXISTS category_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES size_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurements JSONB NOT NULL DEFAULT '{}'::JSONB,
  unit TEXT NOT NULL CHECK (unit IN ('imperial', 'metric')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One measurement set per category per user
  CONSTRAINT unique_user_category_measurements UNIQUE (user_id, category_id)
);

-- Add comment
COMMENT ON TABLE category_measurements IS 'Body measurements for sizing reference';
COMMENT ON COLUMN category_measurements.measurements IS 'JSONB object with measurement fields (e.g., {"chest": 40, "waist": 32})';
COMMENT ON COLUMN category_measurements.unit IS 'Measurement unit system: imperial (inches) or metric (cm)';

-- ============================================================================
-- Table: pinned_preferences
-- Purpose: Store user preferences for pinned category cards
-- ============================================================================
CREATE TABLE IF NOT EXISTS pinned_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES size_categories(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  display_mode TEXT NOT NULL CHECK (display_mode IN ('standard', 'dual', 'preferred-brand')),
  preferred_brand_id UUID REFERENCES brand_sizes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One pin per category per user
  CONSTRAINT unique_user_category_pin UNIQUE (user_id, category_id)
);

-- Add comment
COMMENT ON TABLE pinned_preferences IS 'User preferences for pinned category cards';
COMMENT ON COLUMN pinned_preferences.display_order IS 'Order of pinned cards (0-based)';
COMMENT ON COLUMN pinned_preferences.display_mode IS 'Display mode: standard (primary only), dual (primary+secondary), preferred-brand (brand size)';

-- ============================================================================
-- Indexes for Performance Optimization
-- ============================================================================

-- size_categories indexes
CREATE INDEX idx_size_categories_user_id ON size_categories(user_id);
CREATE INDEX idx_size_categories_user_updated ON size_categories(user_id, updated_at DESC);

-- standard_sizes indexes
CREATE INDEX idx_standard_sizes_category_id ON standard_sizes(category_id);
CREATE INDEX idx_standard_sizes_user_id ON standard_sizes(user_id);
CREATE INDEX idx_standard_sizes_updated ON standard_sizes(updated_at DESC);

-- brand_sizes indexes
CREATE INDEX idx_brand_sizes_category_id ON brand_sizes(category_id);
CREATE INDEX idx_brand_sizes_user_id ON brand_sizes(user_id);
CREATE INDEX idx_brand_sizes_brand_name ON brand_sizes(user_id, brand_name);
CREATE INDEX idx_brand_sizes_updated ON brand_sizes(updated_at DESC);

-- category_measurements indexes
CREATE INDEX idx_category_measurements_category_id ON category_measurements(category_id);
CREATE INDEX idx_category_measurements_user_id ON category_measurements(user_id);

-- pinned_preferences indexes
CREATE INDEX idx_pinned_preferences_user_id ON pinned_preferences(user_id);
CREATE INDEX idx_pinned_preferences_display_order ON pinned_preferences(user_id, display_order);
CREATE INDEX idx_pinned_preferences_category_id ON pinned_preferences(category_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE size_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_preferences ENABLE ROW LEVEL SECURITY;

-- size_categories policies
CREATE POLICY "Users can view their own categories"
  ON size_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON size_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON size_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON size_categories FOR DELETE
  USING (auth.uid() = user_id);

-- standard_sizes policies
CREATE POLICY "Users can view their own standard sizes"
  ON standard_sizes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own standard sizes"
  ON standard_sizes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own standard sizes"
  ON standard_sizes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own standard sizes"
  ON standard_sizes FOR DELETE
  USING (auth.uid() = user_id);

-- brand_sizes policies
CREATE POLICY "Users can view their own brand sizes"
  ON brand_sizes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand sizes"
  ON brand_sizes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand sizes"
  ON brand_sizes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand sizes"
  ON brand_sizes FOR DELETE
  USING (auth.uid() = user_id);

-- category_measurements policies
CREATE POLICY "Users can view their own measurements"
  ON category_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own measurements"
  ON category_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own measurements"
  ON category_measurements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own measurements"
  ON category_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- pinned_preferences policies
CREATE POLICY "Users can view their own pinned preferences"
  ON pinned_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pinned preferences"
  ON pinned_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned preferences"
  ON pinned_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pinned preferences"
  ON pinned_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers for Automatic Timestamp Updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_size_categories_updated_at
  BEFORE UPDATE ON size_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standard_sizes_updated_at
  BEFORE UPDATE ON standard_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_sizes_updated_at
  BEFORE UPDATE ON brand_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_measurements_updated_at
  BEFORE UPDATE ON category_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pinned_preferences_updated_at
  BEFORE UPDATE ON pinned_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data: Default System Categories
-- ============================================================================

-- Note: System categories will be created per-user on first access
-- This is handled in the application layer to ensure proper user_id association
