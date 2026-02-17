import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'lib-supabase-cached-queries' });


/**
 * Cached query functions using React.cache() for request deduplication
 * 
 * These functions are used in server components to eliminate duplicate
 * database queries within the same request. React.cache() ensures that
 * multiple calls to the same function with the same arguments will only
 * execute once per request.
 * 
 * Requirements: 10.1
 */

import { cache } from 'react';
import { createClient } from './server';

/**
 * Get the current authenticated user
 * 
 * Cached to prevent duplicate auth checks within the same request.
 * Multiple server components can call this without additional overhead.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    logger.error('Failed to get current user:', error);
    return null;
  }
  
  return user;
});

/**
 * Get all size categories for a user
 * 
 * Cached to prevent duplicate category fetches within the same request.
 * Used by multiple components on the My Sizes page.
 * 
 * @param userId - The user ID to fetch categories for
 */
export const getUserCategories = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('size_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch user categories: ${error.message}`);
  }

  return data || [];
});

/**
 * Get a single category with its standard size and related data
 * 
 * Cached to prevent duplicate fetches when multiple components
 * need the same category data.
 * 
 * @param categoryId - The category ID to fetch
 */
export const getCategoryWithSizes = cache(async (categoryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('size_categories')
    .select(`
      *,
      standard_sizes(*)
    `)
    .eq('id', categoryId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch category with sizes: ${error.message}`);
  }

  return data;
});

/**
 * Get brand sizes for a category
 * 
 * Cached to prevent duplicate fetches within the same request.
 * 
 * @param categoryId - The category ID to fetch brand sizes for
 */
export const getCategoryBrandSizes = cache(async (categoryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('brand_sizes')
    .select('*')
    .eq('category_id', categoryId)
    .order('brand_name');

  if (error) {
    throw new Error(`Failed to fetch brand sizes: ${error.message}`);
  }

  return data || [];
});

/**
 * Get measurements for a category
 * 
 * Cached to prevent duplicate fetches within the same request.
 * 
 * @param categoryId - The category ID to fetch measurements for
 */
export const getCategoryMeasurements = cache(async (categoryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('category_measurements')
    .select('*')
    .eq('category_id', categoryId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch measurements: ${error.message}`);
  }

  return data;
});

/**
 * Get pinned preferences for a user
 * 
 * Cached to prevent duplicate fetches within the same request.
 * 
 * @param userId - The user ID to fetch pinned preferences for
 */
export const getUserPinnedPreferences = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pinned_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('display_order');

  if (error) {
    throw new Error(`Failed to fetch pinned preferences: ${error.message}`);
  }

  return data || [];
});
