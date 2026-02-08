-- Test Script for seed_system_categories Function
-- This script tests the seed function to ensure it works correctly

-- ============================================================================
-- Test 1: Create a test user and seed categories
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  category_count INTEGER;
  men_count INTEGER;
  women_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 1: Seeding categories for new user';
  RAISE NOTICE 'Test user ID: %', test_user_id;
  
  -- Call seed function
  PERFORM seed_system_categories(test_user_id);
  
  -- Count total categories
  SELECT COUNT(*) INTO category_count
  FROM size_categories
  WHERE user_id = test_user_id;
  
  -- Count men's categories
  SELECT COUNT(*) INTO men_count
  FROM size_categories
  WHERE user_id = test_user_id AND gender = 'men';
  
  -- Count women's categories
  SELECT COUNT(*) INTO women_count
  FROM size_categories
  WHERE user_id = test_user_id AND gender = 'women';
  
  RAISE NOTICE 'Total categories created: %', category_count;
  RAISE NOTICE 'Men''s categories: %', men_count;
  RAISE NOTICE 'Women''s categories: %', women_count;
  
  -- Assertions
  IF category_count != 16 THEN
    RAISE EXCEPTION 'Expected 16 categories, got %', category_count;
  END IF;
  
  IF men_count != 8 THEN
    RAISE EXCEPTION 'Expected 8 men''s categories, got %', men_count;
  END IF;
  
  IF women_count != 8 THEN
    RAISE EXCEPTION 'Expected 8 women''s categories, got %', women_count;
  END IF;
  
  RAISE NOTICE '✓ Test 1 PASSED: All 16 categories created correctly';
  
  -- Cleanup
  DELETE FROM size_categories WHERE user_id = test_user_id;
END $$;

-- ============================================================================
-- Test 2: Test idempotency (calling function twice)
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  first_count INTEGER;
  second_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Test 2: Testing idempotency';
  RAISE NOTICE 'Test user ID: %', test_user_id;
  
  -- Call seed function first time
  PERFORM seed_system_categories(test_user_id);
  
  SELECT COUNT(*) INTO first_count
  FROM size_categories
  WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Categories after first call: %', first_count;
  
  -- Call seed function second time
  PERFORM seed_system_categories(test_user_id);
  
  SELECT COUNT(*) INTO second_count
  FROM size_categories
  WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Categories after second call: %', second_count;
  
  -- Assertions
  IF first_count != second_count THEN
    RAISE EXCEPTION 'Idempotency failed: first_count=%, second_count=%', first_count, second_count;
  END IF;
  
  IF second_count != 16 THEN
    RAISE EXCEPTION 'Expected 16 categories, got %', second_count;
  END IF;
  
  RAISE NOTICE '✓ Test 2 PASSED: Function is idempotent';
  
  -- Cleanup
  DELETE FROM size_categories WHERE user_id = test_user_id;
END $$;

-- ============================================================================
-- Test 3: Verify all categories have required fields
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  missing_fields_count INTEGER;
  invalid_gender_count INTEGER;
  non_system_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Test 3: Verifying category metadata';
  RAISE NOTICE 'Test user ID: %', test_user_id;
  
  -- Call seed function
  PERFORM seed_system_categories(test_user_id);
  
  -- Check for missing required fields
  SELECT COUNT(*) INTO missing_fields_count
  FROM size_categories
  WHERE user_id = test_user_id
    AND (
      name IS NULL 
      OR icon IS NULL 
      OR gender IS NULL 
      OR supported_formats IS NULL 
      OR measurement_guide IS NULL
    );
  
  -- Check for invalid gender values
  SELECT COUNT(*) INTO invalid_gender_count
  FROM size_categories
  WHERE user_id = test_user_id
    AND gender NOT IN ('men', 'women', 'unisex');
  
  -- Check that all are system categories
  SELECT COUNT(*) INTO non_system_count
  FROM size_categories
  WHERE user_id = test_user_id
    AND is_system_category = false;
  
  RAISE NOTICE 'Categories with missing fields: %', missing_fields_count;
  RAISE NOTICE 'Categories with invalid gender: %', invalid_gender_count;
  RAISE NOTICE 'Non-system categories: %', non_system_count;
  
  -- Assertions
  IF missing_fields_count > 0 THEN
    RAISE EXCEPTION 'Found % categories with missing required fields', missing_fields_count;
  END IF;
  
  IF invalid_gender_count > 0 THEN
    RAISE EXCEPTION 'Found % categories with invalid gender', invalid_gender_count;
  END IF;
  
  IF non_system_count > 0 THEN
    RAISE EXCEPTION 'Found % categories that are not system categories', non_system_count;
  END IF;
  
  RAISE NOTICE '✓ Test 3 PASSED: All categories have valid metadata';
  
  -- Cleanup
  DELETE FROM size_categories WHERE user_id = test_user_id;
END $$;

-- ============================================================================
-- Test 4: Verify measurement guide structure
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  invalid_guide_count INTEGER;
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Test 4: Verifying measurement guide structure';
  RAISE NOTICE 'Test user ID: %', test_user_id;
  
  -- Call seed function
  PERFORM seed_system_categories(test_user_id);
  
  -- Check that measurement guides are valid JSONB
  SELECT COUNT(*) INTO invalid_guide_count
  FROM size_categories
  WHERE user_id = test_user_id
    AND NOT (measurement_guide ? 'fields' OR measurement_guide = '{}'::jsonb);
  
  RAISE NOTICE 'Categories with invalid measurement guide: %', invalid_guide_count;
  
  -- Assertions
  IF invalid_guide_count > 0 THEN
    RAISE EXCEPTION 'Found % categories with invalid measurement guide structure', invalid_guide_count;
  END IF;
  
  -- Display sample measurement guides
  RAISE NOTICE '';
  RAISE NOTICE 'Sample measurement guides:';
  FOR rec IN 
    SELECT name, gender, measurement_guide
    FROM size_categories
    WHERE user_id = test_user_id
    ORDER BY gender, name
    LIMIT 3
  LOOP
    RAISE NOTICE '  % (%) - % fields', 
      rec.name, 
      rec.gender,
      CASE 
        WHEN rec.measurement_guide ? 'fields' 
        THEN jsonb_array_length(rec.measurement_guide->'fields')
        ELSE 0
      END;
  END LOOP;
  
  RAISE NOTICE '✓ Test 4 PASSED: Measurement guides have valid structure';
  
  -- Cleanup
  DELETE FROM size_categories WHERE user_id = test_user_id;
END $$;

-- ============================================================================
-- Test 5: Verify specific category names
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  expected_categories TEXT[] := ARRAY[
    'Dress Shirt', 'Casual Shirt', 'Suit Jacket', 'Pants', 'Jeans', 'Shoes', 'Belt', 'Coat/Jacket',
    'Dress', 'Blouse/Top', 'Jacket/Coat', 'Suit Jacket'
  ];
  missing_categories TEXT[];
  cat TEXT;
  found BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Test 5: Verifying specific category names';
  RAISE NOTICE 'Test user ID: %', test_user_id;
  
  -- Call seed function
  PERFORM seed_system_categories(test_user_id);
  
  -- Check for missing expected categories
  missing_categories := ARRAY[]::TEXT[];
  FOREACH cat IN ARRAY expected_categories
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM size_categories 
      WHERE user_id = test_user_id AND name = cat
    ) INTO found;
    
    IF NOT found THEN
      missing_categories := array_append(missing_categories, cat);
    END IF;
  END LOOP;
  
  IF array_length(missing_categories, 1) > 0 THEN
    RAISE EXCEPTION 'Missing categories: %', array_to_string(missing_categories, ', ');
  END IF;
  
  RAISE NOTICE '✓ Test 5 PASSED: All expected categories exist';
  
  -- Cleanup
  DELETE FROM size_categories WHERE user_id = test_user_id;
END $$;

-- ============================================================================
-- Test Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All tests passed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'The seed_system_categories function:';
  RAISE NOTICE '  ✓ Creates all 16 categories (8 men''s, 8 women''s)';
  RAISE NOTICE '  ✓ Is idempotent (safe to call multiple times)';
  RAISE NOTICE '  ✓ Sets all required metadata correctly';
  RAISE NOTICE '  ✓ Includes valid measurement guide data';
  RAISE NOTICE '  ✓ Creates all expected category names';
  RAISE NOTICE '';
END $$;
