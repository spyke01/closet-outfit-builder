/**
 * Onboarding category definitions with subcategories, formality scores, and season tags
 * 
 * This file defines the category structure used in the wardrobe onboarding wizard.
 * Categories are gender-neutral and include comprehensive subcategory definitions.
 */

export type CategoryKey = 'Tops' | 'Bottoms' | 'Shoes' | 'Layers' | 'Dresses' | 'Accessories';

export type Season = 'All' | 'Summer' | 'Winter' | 'Spring' | 'Fall';

/**
 * Subcategory definition with formality score and default seasons
 */
export interface OnboardingSubcategory {
  name: string;
  description?: string;
  icon: string; // Lucide icon name
  formalityScore: number; // 1-10 scale
  seasons: Season[];
}

/**
 * Category definition with subcategories and metadata
 */
export interface OnboardingCategory {
  key: CategoryKey;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  isEssential: boolean; // Pre-selected in UI
  subcategories: OnboardingSubcategory[];
}

/**
 * Complete onboarding category definitions
 * 
 * Includes 6 categories with gender-neutral descriptions:
 * - Tops (essential)
 * - Bottoms (essential)
 * - Shoes (essential)
 * - Layers (optional)
 * - Dresses (optional)
 * - Accessories (optional)
 */
export const ONBOARDING_CATEGORIES: OnboardingCategory[] = [
  {
    key: 'Tops',
    name: 'Tops',
    description: 'T-shirts, blouses, polos, dress shirts, sweaters',
    icon: 'Shirt',
    isEssential: true,
    subcategories: [
      { name: 'T-Shirt', icon: 'shirtT', formalityScore: 2, seasons: ['All'] },
      { name: 'Polo', icon: 'shirtFoldedButtons', formalityScore: 4, seasons: ['All'] },
      { name: 'OCBD', icon: 'shirtLongSleeve', formalityScore: 6, seasons: ['All'] },
      { name: 'Dress Shirt', icon: 'shirtLongSleeve', formalityScore: 8, seasons: ['All'] },
      { name: 'Blouse', icon: 'shirtLongSleeve', formalityScore: 6, seasons: ['All'] },
      { name: 'Tank Top', icon: 'shirtTVNeck', formalityScore: 1, seasons: ['Summer'] },
      { name: 'Sweater', icon: 'sweater', formalityScore: 5, seasons: ['Fall', 'Winter'] },
      { name: 'Cardigan', icon: 'sweater', formalityScore: 5, seasons: ['Fall', 'Winter'] },
      { name: 'Hoodie', icon: 'sweater', formalityScore: 2, seasons: ['Fall', 'Winter'] },
      { name: 'Quarter Zip', icon: 'sweater', formalityScore: 4, seasons: ['Fall', 'Winter'] },
    ],
  },
  {
    key: 'Bottoms',
    name: 'Bottoms',
    description: 'Jeans, chinos, trousers, shorts, skirts, leggings',
    icon: 'Layers',
    isEssential: true,
    subcategories: [
      { name: 'Jeans', icon: 'trousers', formalityScore: 3, seasons: ['All'] },
      { name: 'Chinos', icon: 'trousers', formalityScore: 5, seasons: ['All'] },
      { name: 'Trousers', icon: 'trousers', formalityScore: 7, seasons: ['All'] },
      { name: 'Shorts', icon: 'trousers', formalityScore: 2, seasons: ['Summer'] },
      { name: 'Skirt', icon: 'skirt', formalityScore: 5, seasons: ['All'] },
      { name: 'Leggings', icon: 'trousers', formalityScore: 2, seasons: ['All'] },
    ],
  },
  {
    key: 'Shoes',
    name: 'Shoes',
    description: 'Sneakers, loafers, boots, dress shoes, heels, flats, sandals',
    icon: 'Footprints',
    isEssential: true,
    subcategories: [
      { name: 'Sneakers', icon: 'Footprints', formalityScore: 2, seasons: ['All'] },
      { name: 'Loafers', icon: 'Footprints', formalityScore: 6, seasons: ['All'] },
      { name: 'Boots', icon: 'Footprints', formalityScore: 5, seasons: ['Fall', 'Winter'] },
      { name: 'Dress Shoes', icon: 'Footprints', formalityScore: 8, seasons: ['All'] },
      { name: 'Heels', icon: 'Footprints', formalityScore: 7, seasons: ['All'] },
      { name: 'Flats', icon: 'Footprints', formalityScore: 4, seasons: ['All'] },
      { name: 'Sandals', icon: 'Footprints', formalityScore: 2, seasons: ['Summer'] },
    ],
  },
  {
    key: 'Layers',
    name: 'Layers',
    description: 'Blazers, sportcoats, jackets, coats, cardigans',
    icon: 'Layers2',
    isEssential: false,
    subcategories: [
      { name: 'Blazer', icon: 'jacketSports', formalityScore: 8, seasons: ['All'] },
      { name: 'Sportcoat', icon: 'jacketSports', formalityScore: 7, seasons: ['All'] },
      { name: 'Jacket', icon: 'jacket', formalityScore: 4, seasons: ['Fall', 'Winter', 'Spring'] },
      { name: 'Coat', icon: 'jacket', formalityScore: 5, seasons: ['Fall', 'Winter'] },
      { name: 'Cardigan', icon: 'sweater', formalityScore: 5, seasons: ['Fall', 'Winter', 'Spring'] },
    ],
  },
  {
    key: 'Dresses',
    name: 'Dresses',
    description: 'Mini, midi, maxi, cocktail, casual dresses',
    icon: 'Sparkles',
    isEssential: false,
    subcategories: [
      { name: 'Mini Dress', icon: 'dress', formalityScore: 4, seasons: ['Summer', 'Spring'] },
      { name: 'Midi Dress', icon: 'dress', formalityScore: 6, seasons: ['All'] },
      { name: 'Maxi Dress', icon: 'dress', formalityScore: 5, seasons: ['Summer', 'Spring'] },
      { name: 'Cocktail Dress', icon: 'dress', formalityScore: 8, seasons: ['All'] },
      { name: 'Casual Dress', icon: 'dress', formalityScore: 3, seasons: ['All'] },
    ],
  },
  {
    key: 'Accessories',
    name: 'Accessories',
    description: 'Belts, ties, watches, scarves',
    icon: 'Watch',
    isEssential: false,
    subcategories: [
      { name: 'Belt', icon: 'belt', formalityScore: 5, seasons: ['All'] },
      { name: 'Tie', icon: 'tie', formalityScore: 8, seasons: ['All'] },
      { name: 'Watch', icon: 'Watch', formalityScore: 5, seasons: ['All'] },
      { name: 'Scarf', icon: 'scarf', formalityScore: 4, seasons: ['Fall', 'Winter'] },
    ],
  },
];

/**
 * Get all category keys
 */
export function getCategoryKeys(): CategoryKey[] {
  return ONBOARDING_CATEGORIES.map(cat => cat.key);
}

/**
 * Get essential category keys (pre-selected in UI)
 */
export function getEssentialCategoryKeys(): CategoryKey[] {
  return ONBOARDING_CATEGORIES
    .filter(cat => cat.isEssential)
    .map(cat => cat.key);
}

/**
 * Get category by key
 */
export function getCategoryByKey(key: CategoryKey): OnboardingCategory | undefined {
  return ONBOARDING_CATEGORIES.find(cat => cat.key === key);
}

/**
 * Get all subcategories for a category
 */
export function getSubcategoriesForCategory(key: CategoryKey): OnboardingSubcategory[] {
  const category = getCategoryByKey(key);
  return category?.subcategories || [];
}

/**
 * Get subcategory by name within a category
 */
export function getSubcategory(
  categoryKey: CategoryKey,
  subcategoryName: string
): OnboardingSubcategory | undefined {
  const subcategories = getSubcategoriesForCategory(categoryKey);
  return subcategories.find(sub => sub.name === subcategoryName);
}
