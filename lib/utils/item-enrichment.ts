import { WardrobeItem } from '@/lib/types/database';
import { EnrichedItem, FormalityBand, ColorCategory } from '@/lib/types/generation';
import { inferColor } from './color-inference';

/**
 * Category-to-weight mapping for weather appropriateness
 * 
 * Weight scale:
 * 0 = Minimal coverage (t-shirts, shorts, sandals)
 * 1 = Light coverage (short-sleeve shirts, light pants, loafers)
 * 2 = Moderate coverage (long-sleeve shirts, chinos, leather shoes)
 * 3 = Heavy coverage (jackets, coats, boots)
 */
const CATEGORY_BASE_WEIGHTS: Record<string, number> = {
  // Outerwear (heavy)
  'Jacket': 3,
  'Coat': 3,
  'Blazer': 2,
  'Overshirt': 2,
  
  // Tops
  'Shirt': 2,
  'T-Shirt': 0,
  'Polo': 1,
  'Sweater': 2,
  'Cardigan': 2,
  
  // Undershirts
  'Undershirt': 1,
  
  // Bottoms
  'Pants': 2,
  'Jeans': 2,
  'Shorts': 0,
  'Chinos': 2,
  
  // Footwear
  'Shoes': 2,
  'Boots': 3,
  'Sneakers': 1,
  'Sandals': 0,
  'Loafers': 1,
  
  // Accessories
  'Belt': 0,
  'Watch': 0,
  'Tie': 0,
  'Pocket Square': 0,
};

/**
 * Season-to-weight adjustment mapping
 * 
 * Adjusts the base category weight based on seasonal characteristics.
 * Items tagged for specific seasons get weight adjustments.
 */
const SEASON_WEIGHT_ADJUSTMENTS: Record<string, number> = {
  'Summer': -1,  // Lighter materials, less coverage
  'Winter': +1,  // Heavier materials, more coverage
  'Spring': 0,   // Transitional, no adjustment
  'Fall': 0,     // Transitional, no adjustment
};

/**
 * Classifies formality score into a band
 * 
 * Formality bands:
 * - casual: 1-3 (t-shirts, jeans, sneakers)
 * - smart-casual: 4-6 (button-downs, chinos, loafers)
 * - refined: 7-10 (suits, dress shoes, formal wear)
 * 
 * @param formalityScore - The formality score (1-10)
 * @returns The formality band classification
 * 
 * @example
 * classifyFormalityBand(2) // returns 'casual'
 * classifyFormalityBand(5) // returns 'smart-casual'
 * classifyFormalityBand(9) // returns 'refined'
 */
export function classifyFormalityBand(formalityScore: number | undefined): FormalityBand {
  // Default to smart-casual if no score provided
  if (formalityScore === undefined || formalityScore === null) {
    return 'smart-casual';
  }
  
  // Ensure score is within valid range
  const score = Math.max(1, Math.min(10, formalityScore));
  
  if (score <= 3) {
    return 'casual';
  } else if (score <= 6) {
    return 'smart-casual';
  } else {
    return 'refined';
  }
}

/**
 * Infers weather weight from category and season tags
 * 
 * Weather weight represents how warm/heavy an item is:
 * 0 = Minimal (hot weather appropriate)
 * 1 = Light (warm weather appropriate)
 * 2 = Moderate (mild weather appropriate)
 * 3 = Heavy (cold weather appropriate)
 * 
 * The weight is calculated by:
 * 1. Starting with the base weight for the category
 * 2. Applying seasonal adjustments if season tags are present
 * 3. Clamping the result to the 0-3 range
 * 
 * @param categoryName - The name of the item's category
 * @param seasonTags - Array of season tags (e.g., ['Summer', 'Spring'])
 * @returns The inferred weather weight (0-3)
 * 
 * @example
 * inferWeatherWeight('Jacket', ['Winter']) // returns 3
 * inferWeatherWeight('Shirt', ['Summer']) // returns 1
 * inferWeatherWeight('Shorts', []) // returns 0
 */
export function inferWeatherWeight(
  categoryName: string | undefined,
  seasonTags: string[] | undefined
): number {
  // Default weight if category is unknown
  let weight = 2;
  
  // Get base weight from category
  if (categoryName && CATEGORY_BASE_WEIGHTS[categoryName] !== undefined) {
    weight = CATEGORY_BASE_WEIGHTS[categoryName];
  }
  
  // Apply seasonal adjustments
  if (seasonTags && seasonTags.length > 0) {
    // Calculate average seasonal adjustment
    let totalAdjustment = 0;
    let adjustmentCount = 0;
    
    for (const season of seasonTags) {
      if (SEASON_WEIGHT_ADJUSTMENTS[season] !== undefined) {
        totalAdjustment += SEASON_WEIGHT_ADJUSTMENTS[season];
        adjustmentCount++;
      }
    }
    
    // Apply average adjustment if any seasons matched
    if (adjustmentCount > 0) {
      const avgAdjustment = totalAdjustment / adjustmentCount;
      weight += avgAdjustment;
    }
  }
  
  // Clamp to valid range (0-3)
  return Math.max(0, Math.min(3, Math.round(weight)));
}

/**
 * Enriches a single wardrobe item with inferred metadata
 * 
 * This function adds computed properties to a wardrobe item that are
 * used by the outfit generation algorithm:
 * - inferredColor: Color category extracted from item name
 * - formalityBand: Formality classification (casual/smart-casual/refined)
 * - weatherWeight: Warmth level (0-3) based on category and season
 * 
 * This is a pure function with no side effects.
 * 
 * @param item - The wardrobe item to enrich
 * @returns The enriched item with additional metadata
 * 
 * @example
 * const item = {
 *   id: '123',
 *   name: 'Blue Oxford Shirt',
 *   category: { name: 'Shirt' },
 *   formality_score: 6,
 *   season: ['Spring', 'Fall'],
 *   // ... other fields
 * };
 * 
 * const enriched = enrichItem(item);
 * // enriched.inferredColor === 'blue'
 * // enriched.formalityBand === 'smart-casual'
 * // enriched.weatherWeight === 2
 */
export function enrichItem(item: WardrobeItem): EnrichedItem {
  // Infer color from item name
  const inferredColor: ColorCategory = inferColor(item.name);
  
  // Classify formality band
  const formalityBand: FormalityBand = classifyFormalityBand(item.formality_score);
  
  // Infer weather weight from category and season
  const categoryName = item.category?.name;
  const weatherWeight: number = inferWeatherWeight(categoryName, item.season);
  
  // Return enriched item with all original properties plus computed ones
  return {
    ...item,
    inferredColor,
    formalityBand,
    weatherWeight,
  };
}

/**
 * Enriches an array of wardrobe items with inferred metadata
 * 
 * This function applies enrichItem to each item in the array.
 * It's a pure function with no side effects.
 * 
 * @param items - Array of wardrobe items to enrich
 * @returns Array of enriched items with additional metadata
 * 
 * @example
 * const items = [
 *   { id: '1', name: 'Blue Shirt', ... },
 *   { id: '2', name: 'Grey Pants', ... },
 *   { id: '3', name: 'Brown Shoes', ... },
 * ];
 * 
 * const enriched = enrichItems(items);
 * // Each item now has inferredColor, formalityBand, and weatherWeight
 */
export function enrichItems(items: WardrobeItem[]): EnrichedItem[] {
  return items.map(enrichItem);
}
