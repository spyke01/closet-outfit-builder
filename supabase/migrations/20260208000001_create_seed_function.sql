-- Create Seed Function for System Categories
-- Creates seed_system_categories function to populate user accounts with predefined categories
-- Function is idempotent and includes measurement guide data

-- ============================================================================
-- Drop existing function if it exists
-- ============================================================================

DROP FUNCTION IF EXISTS seed_system_categories(UUID);

-- ============================================================================
-- Create seed_system_categories function
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_system_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert system categories for the user
  -- Uses ON CONFLICT DO NOTHING to prevent duplicates
  -- Each category includes: name, icon, gender, supported_formats, is_system_category, measurement_guide
  
  INSERT INTO size_categories (
    user_id, 
    name, 
    icon, 
    gender, 
    supported_formats, 
    is_system_category, 
    measurement_guide,
    created_at,
    updated_at
  )
  VALUES
    -- ========================================================================
    -- Men's Categories (8 total)
    -- ========================================================================
    
    -- Dress Shirt: Collar and sleeve measurements
    (
      p_user_id,
      'Dress Shirt',
      'Shirt',
      'men',
      ARRAY['numeric', 'measurements']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'collar',
            'label', 'Collar Size',
            'description', 'Measure around the base of your neck where the collar sits',
            'unit', 'inches',
            'typical_range', jsonb_build_array(14, 18)
          ),
          jsonb_build_object(
            'name', 'sleeve',
            'label', 'Sleeve Length',
            'description', 'Measure from center back of neck to wrist with arm slightly bent',
            'unit', 'inches',
            'typical_range', jsonb_build_array(32, 36)
          )
        ),
        'size_examples', jsonb_build_array('15.5/33', '16/34', '16.5/35')
      ),
      NOW(),
      NOW()
    ),
    
    -- Casual Shirt: Letter or numeric sizes
    (
      p_user_id,
      'Casual Shirt',
      'Shirt',
      'men',
      ARRAY['letter', 'numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'chest',
            'label', 'Chest Size',
            'description', 'Measure around the fullest part of your chest under arms',
            'unit', 'inches',
            'typical_range', jsonb_build_array(34, 48)
          )
        ),
        'size_examples', jsonb_build_array('S', 'M', 'L', 'XL')
      ),
      NOW(),
      NOW()
    ),
    
    -- Suit Jacket: Chest size and length
    (
      p_user_id,
      'Suit Jacket',
      'Briefcase',
      'men',
      ARRAY['numeric', 'letter']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'chest',
            'label', 'Chest Size',
            'description', 'Measure around the fullest part of your chest under arms',
            'unit', 'inches',
            'typical_range', jsonb_build_array(34, 52)
          ),
          jsonb_build_object(
            'name', 'length',
            'label', 'Jacket Length',
            'description', 'Short, Regular, or Long based on your height',
            'options', jsonb_build_array('Short', 'Regular', 'Long')
          )
        ),
        'size_examples', jsonb_build_array('40R', '42L', '44S')
      ),
      NOW(),
      NOW()
    ),
    
    -- Pants: Waist and inseam
    (
      p_user_id,
      'Pants',
      'Ruler',
      'men',
      ARRAY['waist-inseam']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'waist',
            'label', 'Waist Size',
            'description', 'Measure around your natural waistline',
            'unit', 'inches',
            'typical_range', jsonb_build_array(28, 44)
          ),
          jsonb_build_object(
            'name', 'inseam',
            'label', 'Inseam Length',
            'description', 'Measure from crotch to bottom of ankle',
            'unit', 'inches',
            'typical_range', jsonb_build_array(28, 36)
          )
        ),
        'size_examples', jsonb_build_array('32x30', '34x32', '36x34')
      ),
      NOW(),
      NOW()
    ),
    
    -- Jeans: Waist and inseam
    (
      p_user_id,
      'Jeans',
      'Ruler',
      'men',
      ARRAY['waist-inseam']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'waist',
            'label', 'Waist Size',
            'description', 'Measure around your natural waistline',
            'unit', 'inches',
            'typical_range', jsonb_build_array(28, 44)
          ),
          jsonb_build_object(
            'name', 'inseam',
            'label', 'Inseam Length',
            'description', 'Measure from crotch to bottom of ankle',
            'unit', 'inches',
            'typical_range', jsonb_build_array(28, 36)
          )
        ),
        'size_examples', jsonb_build_array('32x30', '34x32', '36x34')
      ),
      NOW(),
      NOW()
    ),
    
    -- Shoes: US numeric sizes
    (
      p_user_id,
      'Shoes',
      'Footprints',
      'men',
      ARRAY['numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'length',
            'label', 'Shoe Size',
            'description', 'US men''s shoe size',
            'unit', 'US',
            'typical_range', jsonb_build_array(6, 15)
          )
        ),
        'size_examples', jsonb_build_array('9', '9.5', '10', '10.5', '11')
      ),
      NOW(),
      NOW()
    ),
    
    -- Belt: Waist size
    (
      p_user_id,
      'Belt',
      'Minus',
      'men',
      ARRAY['numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'waist',
            'label', 'Belt Size',
            'description', 'Measure your waist where you wear your belt',
            'unit', 'inches',
            'typical_range', jsonb_build_array(28, 44)
          )
        ),
        'size_examples', jsonb_build_array('32', '34', '36', '38')
      ),
      NOW(),
      NOW()
    ),
    
    -- Jacket: Letter or numeric sizes
    (
      p_user_id,
      'Jacket',
      'Shirt',
      'men',
      ARRAY['letter', 'numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'chest',
            'label', 'Chest Size',
            'description', 'Measure around the fullest part of your chest under arms',
            'unit', 'inches',
            'typical_range', jsonb_build_array(34, 52)
          )
        ),
        'size_examples', jsonb_build_array('S', 'M', 'L', 'XL', '40', '42', '44')
      ),
      NOW(),
      NOW()
    ),
    
    -- ========================================================================
    -- Women's Categories (8 total)
    -- ========================================================================
    
    -- Dress: Numeric or letter sizes
    (
      p_user_id,
      'Dress',
      'Shirt',
      'women',
      ARRAY['numeric', 'letter']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'bust',
            'label', 'Bust',
            'description', 'Measure around the fullest part of your bust',
            'unit', 'inches',
            'typical_range', jsonb_build_array(30, 46)
          ),
          jsonb_build_object(
            'name', 'waist',
            'label', 'Waist',
            'description', 'Measure around your natural waistline',
            'unit', 'inches',
            'typical_range', jsonb_build_array(24, 40)
          ),
          jsonb_build_object(
            'name', 'hips',
            'label', 'Hips',
            'description', 'Measure around the fullest part of your hips',
            'unit', 'inches',
            'typical_range', jsonb_build_array(34, 50)
          )
        ),
        'size_examples', jsonb_build_array('0', '2', '4', '6', '8', 'XS', 'S', 'M', 'L')
      ),
      NOW(),
      NOW()
    ),
    
    -- Blouse/Top: Letter or numeric sizes
    (
      p_user_id,
      'Blouse/Top',
      'Shirt',
      'women',
      ARRAY['letter', 'numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'bust',
            'label', 'Bust',
            'description', 'Measure around the fullest part of your bust',
            'unit', 'inches',
            'typical_range', jsonb_build_array(30, 46)
          )
        ),
        'size_examples', jsonb_build_array('XS', 'S', 'M', 'L', 'XL')
      ),
      NOW(),
      NOW()
    ),
    
    -- Pants: Numeric or waist/inseam
    (
      p_user_id,
      'Pants',
      'Ruler',
      'women',
      ARRAY['numeric', 'waist-inseam']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'waist',
            'label', 'Waist',
            'description', 'Measure around your natural waistline',
            'unit', 'inches',
            'typical_range', jsonb_build_array(24, 40)
          ),
          jsonb_build_object(
            'name', 'inseam',
            'label', 'Inseam Length',
            'description', 'Measure from crotch to bottom of ankle',
            'unit', 'inches',
            'typical_range', jsonb_build_array(26, 34)
          )
        ),
        'size_examples', jsonb_build_array('0', '2', '4', '6', '8', '27x30', '28x32')
      ),
      NOW(),
      NOW()
    ),
    
    -- Jeans: Numeric or waist/inseam
    (
      p_user_id,
      'Jeans',
      'Ruler',
      'women',
      ARRAY['numeric', 'waist-inseam']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'waist',
            'label', 'Waist',
            'description', 'Measure around your natural waistline',
            'unit', 'inches',
            'typical_range', jsonb_build_array(24, 40)
          ),
          jsonb_build_object(
            'name', 'inseam',
            'label', 'Inseam Length',
            'description', 'Measure from crotch to bottom of ankle',
            'unit', 'inches',
            'typical_range', jsonb_build_array(26, 34)
          )
        ),
        'size_examples', jsonb_build_array('0', '2', '4', '6', '8', '27x30', '28x32')
      ),
      NOW(),
      NOW()
    ),
    
    -- Shoes: US numeric sizes
    (
      p_user_id,
      'Shoes',
      'Footprints',
      'women',
      ARRAY['numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'length',
            'label', 'Shoe Size',
            'description', 'US women''s shoe size',
            'unit', 'US',
            'typical_range', jsonb_build_array(5, 12)
          )
        ),
        'size_examples', jsonb_build_array('6', '6.5', '7', '7.5', '8', '8.5', '9')
      ),
      NOW(),
      NOW()
    ),
    
    -- Jacket: Letter or numeric sizes
    (
      p_user_id,
      'Jacket',
      'Shirt',
      'women',
      ARRAY['letter', 'numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'bust',
            'label', 'Bust',
            'description', 'Measure around the fullest part of your bust',
            'unit', 'inches',
            'typical_range', jsonb_build_array(30, 46)
          )
        ),
        'size_examples', jsonb_build_array('XS', 'S', 'M', 'L', 'XL', '0', '2', '4', '6')
      ),
      NOW(),
      NOW()
    ),
    
    -- Suit Jacket: Numeric sizes
    (
      p_user_id,
      'Suit Jacket',
      'Briefcase',
      'women',
      ARRAY['numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'bust',
            'label', 'Bust',
            'description', 'Measure around the fullest part of your bust',
            'unit', 'inches',
            'typical_range', jsonb_build_array(30, 46)
          )
        ),
        'size_examples', jsonb_build_array('0', '2', '4', '6', '8', '10', '12')
      ),
      NOW(),
      NOW()
    ),
    
    -- Belt: Letter or numeric sizes
    (
      p_user_id,
      'Belt',
      'Minus',
      'women',
      ARRAY['letter', 'numeric']::text[],
      true,
      jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object(
            'name', 'waist',
            'label', 'Belt Size',
            'description', 'Measure your waist where you wear your belt',
            'unit', 'inches',
            'typical_range', jsonb_build_array(24, 40)
          )
        ),
        'size_examples', jsonb_build_array('S', 'M', 'L', '26', '28', '30')
      ),
      NOW(),
      NOW()
    )
  
  -- Use ON CONFLICT to prevent duplicates
  -- Conflict is based on unique constraint (user_id, name)
  ON CONFLICT (user_id, name) DO NOTHING;
  
END;
$$;

-- ============================================================================
-- Add function comment
-- ============================================================================

COMMENT ON FUNCTION seed_system_categories(UUID) IS 
'Seeds system categories for a user. Creates 16 predefined categories (8 men''s, 8 women''s) with measurement guides. Idempotent - safe to call multiple times.';

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION seed_system_categories(UUID) TO authenticated;

-- ============================================================================
-- Migration Notes
-- ============================================================================

-- This migration:
-- 1. Creates seed_system_categories function with SECURITY DEFINER
-- 2. Inserts 16 system categories (8 men's, 8 women's)
-- 3. Each category includes measurement guide data in JSONB format
-- 4. Uses ON CONFLICT DO NOTHING for idempotency
-- 5. Sets is_system_category = true for all seeded categories
-- 6. Includes proper measurement fields with descriptions and typical ranges
-- 7. Grants execute permission to authenticated users
