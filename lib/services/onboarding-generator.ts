/**
 * Onboarding item generation service
 * 
 * Generates wardrobe items from user selections during onboarding wizard.
 * Applies quantity multipliers, matches images, and sets formality/season metadata.
 */

import type {
  CategoryKey,
  Season,
  OnboardingSubcategory,
} from '@/lib/data/onboarding-categories';
import { getCategoryByKey } from '@/lib/data/onboarding-categories';
import type {
  SubcategoryColorSelection,
  GeneratedWardrobeItem,
  StyleBaseline,
} from '@/lib/types/onboarding';
import { normalizeColor } from '@/lib/data/color-options';

/**
 * Generate wardrobe items from user selections
 * 
 * @param selectedCategories - Categories selected by user
 * @param selectedSubcategories - Subcategories selected per category
 * @param colorQuantitySelections - Color selections per subcategory (1 item per color)
 * @param styleBaseline - User's style baseline (for season tags)
 * @param itemCapEnabled - Whether to apply item cap
 * @param itemCap - Maximum number of items to generate
 * @returns Array of generated wardrobe items
 */
export function generateWardrobeItems(
  selectedCategories: CategoryKey[],
  selectedSubcategories: Partial<Record<CategoryKey, string[]>>,
  colorQuantitySelections: Record<string, SubcategoryColorSelection>,
  styleBaseline: StyleBaseline,
  itemCapEnabled: boolean = true,
  itemCap: number = 50
): GeneratedWardrobeItem[] {
  const items: GeneratedWardrobeItem[] = [];

  // Iterate through each selected category
  for (const categoryKey of selectedCategories) {
    const subcategories = selectedSubcategories[categoryKey] || [];
    
    // Iterate through each selected subcategory
    for (const subcategoryName of subcategories) {
      const selectionKey = `${categoryKey}-${subcategoryName}`;
      const selection = colorQuantitySelections[selectionKey];
      
      if (!selection || !selection.colors.length) {
        continue;
      }

      // Get subcategory definition for formality and seasons
      const subcategoryDef = getSubcategoryDefinition(categoryKey, subcategoryName);
      if (!subcategoryDef) {
        continue;
      }

      // Generate 1 item for each selected color
      for (const color of selection.colors) {
        const item = generateItem(
          categoryKey,
          subcategoryName,
          color,
          subcategoryDef,
          styleBaseline
        );
        items.push(item);

        // Check item cap
        if (itemCapEnabled && items.length >= itemCap) {
          return items;
        }
      }
    }
  }

  return items;
}

/**
 * Generate a single wardrobe item
 */
function generateItem(
  category: CategoryKey,
  subcategory: string,
  color: string,
  subcategoryDef: OnboardingSubcategory,
  styleBaseline: StyleBaseline
): GeneratedWardrobeItem {
  const normalizedColor = normalizeColor(color);
  const name = generateItemName(subcategory, normalizedColor);
  const imageUrl = findMatchingImage(category, subcategory, normalizedColor);
  const seasons = determineSeasons(subcategoryDef.seasons, styleBaseline.climate);

  return {
    id: generateTempId(),
    category,
    subcategory,
    name,
    color: normalizedColor,
    formality_score: subcategoryDef.formalityScore,
    season: seasons,
    image_url: imageUrl,
    source: 'onboarding',
  };
}

/**
 * Generate item name from subcategory and color
 * Format: "{color} {subcategory}" or "{subcategory}" if color is unspecified
 */
function generateItemName(subcategory: string, color: string): string {
  if (!color || color === '') {
    return subcategory;
  }
  
  // Capitalize first letter of color
  const capitalizedColor = color.charAt(0).toUpperCase() + color.slice(1);
  return `${capitalizedColor} ${subcategory}`;
}

/**
 * Find matching image from onboarding generated images
 * 
 * Images are located at: /images/wardrobe/generated/onboarding/{category}-{subcategory}-{color}.png
 * Format: category and subcategory are lowercase with spaces replaced by hyphens
 * 
 * @returns Image path or null if no color specified
 */
function findMatchingImage(
  category: CategoryKey,
  subcategory: string,
  color: string
): string | null {
  // If no color specified, return null (placeholder will be used)
  if (!color || color === '') {
    return null;
  }

  // Convert category and subcategory to lowercase and replace spaces with hyphens
  const categorySlug = category.toLowerCase();
  const subcategorySlug = subcategory.toLowerCase().replace(/\s+/g, '-');
  
  // Build image path: {category}-{subcategory}-{color}.png
  const imagePath = `/images/wardrobe/generated/onboarding/${categorySlug}-${subcategorySlug}-${color}.png`;
  
  return imagePath;
}

/**
 * Determine season tags based on subcategory defaults and climate selection
 */
function determineSeasons(
  subcategorySeasons: Season[],
  climate: 'Hot' | 'Cold' | 'Mixed' | null
): Season[] {
  // If subcategory is all-season, return based on climate
  if (subcategorySeasons.includes('All')) {
    if (climate === 'Hot') {
      return ['Summer', 'Spring'];
    } else if (climate === 'Cold') {
      return ['Fall', 'Winter'];
    } else {
      return ['All'];
    }
  }

  // Otherwise use subcategory defaults
  return subcategorySeasons;
}

/**
 * Get subcategory definition from category data
 */
function getSubcategoryDefinition(
  categoryKey: CategoryKey,
  subcategoryName: string
): OnboardingSubcategory | undefined {
  const category = getCategoryByKey(categoryKey);
  if (!category) {
    return undefined;
  }

  return category.subcategories.find(sub => sub.name === subcategoryName);
}

/**
 * Generate temporary ID for UI (will be replaced by database ID)
 */
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
