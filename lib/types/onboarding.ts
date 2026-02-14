/**
 * Type definitions for the wardrobe onboarding wizard
 * 
 * These types define the data structures used throughout the onboarding flow,
 * from user selections to generated wardrobe items.
 */

import type { CategoryKey, Season } from '@/lib/data/onboarding-categories';
export type { CategoryKey, Season } from '@/lib/data/onboarding-categories';

/**
 * Style baseline data collected in Step 1
 */
export interface StyleBaseline {
  primaryUse: 'Work' | 'Casual' | 'Mixed' | null;
  climate: 'Hot' | 'Cold' | 'Mixed' | null;
}

/**
 * Quantity label for subcategory selections (kept for backward compatibility)
 * @deprecated No longer used - each color now represents 1 item
 */
export type QuantityLabel = 'None' | '1' | '2-3' | '4-6' | '7+';

/**
 * Mapping of quantity labels to actual item counts (kept for backward compatibility)
 * @deprecated No longer used - each color now represents 1 item
 */
export const QUANTITY_MAP: Record<QuantityLabel, number> = {
  'None': 0,
  '1': 1,
  '2-3': 3,
  '4-6': 5,
  '7+': 7,
};

/**
 * Color selection for a specific subcategory
 * Each selected color represents 1 item
 */
export interface SubcategoryColorSelection {
  subcategory: string;
  colors: string[]; // Color values from COLOR_OPTIONS - each color = 1 item
}

/**
 * Generated wardrobe item before database persistence
 */
export interface GeneratedWardrobeItem {
  id: string; // Temporary ID for UI (will be replaced by database ID)
  category: CategoryKey;
  subcategory: string;
  name: string; // Generated as "{color} {subcategory}" or "{subcategory}"
  color: string;
  formality_score: number; // 1-10 from subcategory definition
  season: Season[];
  image_url: string | null; // Matched from existing images or null
  source: 'onboarding';
}

/**
 * Complete wizard state
 */
export interface WizardState {
  step: number;
  styleBaseline: StyleBaseline;
  selectedCategories: CategoryKey[];
  selectedSubcategories: Partial<Record<CategoryKey, string[]>>;
  colorQuantitySelections: Record<string, SubcategoryColorSelection>;
  generatedItems: GeneratedWardrobeItem[];
  itemCapEnabled: boolean;
  itemCap: number;
}

/**
 * Initial wizard state
 */
export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  styleBaseline: {
    primaryUse: null,
    climate: null,
  },
  selectedCategories: [],
  selectedSubcategories: {},
  colorQuantitySelections: {},
  generatedItems: [],
  itemCapEnabled: true,
  itemCap: 50,
};
