import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'lib-services-onboarding-category-manager' });


/**
 * Onboarding category manager service
 * 
 * Ensures categories exist in database before item creation.
 * Maps onboarding category keys to database category names.
 */

import { createClient } from '@/lib/supabase/client';
import type { CategoryKey } from '@/lib/data/onboarding-categories';
import type { Category } from '@/lib/types/database';

/**
 * Category name mapping from onboarding keys to database names
 * 
 * Maps the onboarding category structure to existing database categories
 * or creates new categories with appropriate names.
 */
const CATEGORY_NAME_MAP: Record<CategoryKey, string> = {
  'Tops': 'Shirt',
  'Bottoms': 'Pants',
  'Shoes': 'Shoes',
  'Layers': 'Jacket',
  'Dresses': 'Dress',
  'Accessories': 'Accessories',
};

/**
 * Ensure categories exist in database for the given user
 * 
 * Fetches existing categories and creates missing ones.
 * Returns a map of CategoryKey to database category ID.
 * 
 * @param userId - User ID
 * @param categoryKeys - Array of category keys to ensure exist
 * @returns Map of CategoryKey to category ID
 */
export async function ensureCategoriesExist(
  userId: string,
  categoryKeys: CategoryKey[]
): Promise<Map<CategoryKey, string>> {
  const supabase = createClient();
  const categoryMap = new Map<CategoryKey, string>();

  try {
    // Fetch existing user categories
    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      throw new Error(`Failed to fetch categories: ${fetchError.message}`);
    }

    const existingCategoryMap = new Map<string, Category>(
      (existingCategories || []).map(cat => [cat.name.toLowerCase(), cat])
    );

    // Process each category key
    for (const categoryKey of categoryKeys) {
      const categoryName = CATEGORY_NAME_MAP[categoryKey];
      const normalizedName = categoryName.toLowerCase();

      // Check if category already exists
      const existingCategory = existingCategoryMap.get(normalizedName);

      if (existingCategory) {
        // Use existing category
        categoryMap.set(categoryKey, existingCategory.id);
      } else {
        // Create new category
        const newCategory = await createCategory(userId, categoryKey, categoryName);
        categoryMap.set(categoryKey, newCategory.id);
        
        // Add to map to avoid duplicate creation
        existingCategoryMap.set(normalizedName, newCategory);
      }
    }

    return categoryMap;
  } catch (error) {
    logger.error('Error ensuring categories exist:', error);
    throw error;
  }
}

/**
 * Create a new category in the database
 * 
 * @param userId - User ID
 * @param categoryKey - Category key from onboarding
 * @param categoryName - Database category name
 * @returns Created category
 */
async function createCategory(
  userId: string,
  categoryKey: CategoryKey,
  categoryName: string
): Promise<Category> {
  const supabase = createClient();

  // Determine if this should be an anchor category
  const isAnchorItem = ['Tops', 'Layers', 'Dresses'].includes(categoryKey);

  // Determine display order based on category type
  const displayOrder = getCategoryDisplayOrder(categoryKey);

  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: categoryName,
        is_anchor_item: isAnchorItem,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category ${categoryName}: ${error.message}`);
    }

    return data;
  } catch (error) {
    logger.error(`Error creating category ${categoryName}:`, error);
    throw error;
  }
}

/**
 * Get display order for a category
 * 
 * Orders categories in a logical outfit-building sequence:
 * 1. Tops/Layers (anchor items)
 * 2. Bottoms
 * 3. Shoes
 * 4. Dresses
 * 5. Accessories
 */
function getCategoryDisplayOrder(categoryKey: CategoryKey): number {
  const orderMap: Record<CategoryKey, number> = {
    'Tops': 1,
    'Layers': 2,
    'Bottoms': 3,
    'Shoes': 4,
    'Dresses': 5,
    'Accessories': 6,
  };

  return orderMap[categoryKey] || 99;
}

/**
 * Get category name for database from onboarding key
 * 
 * @param categoryKey - Onboarding category key
 * @returns Database category name
 */
export function getCategoryName(categoryKey: CategoryKey): string {
  return CATEGORY_NAME_MAP[categoryKey];
}
