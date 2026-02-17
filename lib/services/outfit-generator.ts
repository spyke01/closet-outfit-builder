/**
 * Outfit Generator Service
 * 
 * Pure functions for generating complete outfits from wardrobe items
 * based on weather context and user preferences.
 * 
 * All functions are pure (no side effects) and fully testable.
 */

import { WardrobeItem } from '@/lib/types/database';
import {
  GeneratedOutfit,
  GenerationOptions,
  SwapOptions,
  EnrichedItem,
  WeatherContext,
  CompatibilityScore,
  ColorCategory,
} from '@/lib/types/generation';
import { enrichItems } from '@/lib/utils/item-enrichment';
import { calculateCompatibilityScore } from '@/lib/utils/compatibility-scoring';

/**
 * Category selection order for outfit generation
 * 
 * Items are selected in this specific order to ensure proper
 * compatibility scoring and constraint satisfaction.
 */
const SELECTION_ORDER = [
  'pants',      // 1. Start with pants (foundation)
  'shirt',      // 2. Select shirt to match pants
  'shoes',      // 3. Select shoes to match pants and shirt
  'jacket',     // 4. Add outer layer if needed (jacket or overshirt)
  'overshirt',  // 4. (alternative to jacket)
  'undershirt', // 5. Add undershirt if needed
  'belt',       // 6. Add belt if needed
  'watch',      // 7. Add watch if available
] as const;

/**
 * Required categories that must be present in every outfit
 */
const REQUIRED_CATEGORIES = ['Shirt', 'Pants', 'Shoes'] as const;

/**
 * Category name mapping (database name -> slot name)
 */
const CATEGORY_TO_SLOT: Record<string, string> = {
  'Jacket': 'jacket',
  'Overshirt': 'overshirt',
  'Shirt': 'shirt',
  'Undershirt': 'undershirt',
  'Pants': 'pants',
  'Shoes': 'shoes',
  'Belt': 'belt',
  'Watch': 'watch',
};

type AccessoryColorFamily = 'black' | 'brown' | 'other';

function getAccessoryColorFamily(color: ColorCategory): AccessoryColorFamily {
  if (color === 'black' || color === 'charcoal' || color === 'grey') {
    return 'black';
  }
  if (
    color === 'brown' ||
    color === 'tan' ||
    color === 'khaki' ||
    color === 'camel' ||
    color === 'chocolate' ||
    color === 'beige' ||
    color === 'taupe' ||
    color === 'stone' ||
    color === 'cream'
  ) {
    return 'brown';
  }
  return 'other';
}

function isBeltShoeColorCompatible(belt: EnrichedItem, shoes: EnrichedItem): boolean {
  const beltFamily = getAccessoryColorFamily(belt.color);
  const shoeFamily = getAccessoryColorFamily(shoes.color);
  return !(beltFamily === 'black' && shoeFamily === 'brown') &&
    !(beltFamily === 'brown' && shoeFamily === 'black');
}

function applyBeltShoeColorConstraint(
  candidates: EnrichedItem[],
  selectedItems: Partial<Record<string, EnrichedItem>>,
  slot?: string
): EnrichedItem[] {
  if (!slot) return candidates;

  if (slot === 'belt') {
    const selectedShoes = selectedItems.shoes;
    if (!selectedShoes) return candidates;
    return candidates.filter(candidate => isBeltShoeColorCompatible(candidate, selectedShoes));
  }

  if (slot === 'shoes') {
    const selectedBelt = selectedItems.belt;
    if (!selectedBelt) return candidates;
    return candidates.filter(candidate => isBeltShoeColorCompatible(selectedBelt, candidate));
  }

  return candidates;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hashToUnitInterval(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/**
 * Check if wardrobe has all required categories
 * 
 * @param items - Array of wardrobe items
 * @returns True if all required categories are present
 */
function hasRequiredCategories(items: WardrobeItem[]): boolean {
  const categories = new Set(items.map(item => item.category?.name).filter(Boolean));
  return REQUIRED_CATEGORIES.every(cat => categories.has(cat));
}

/**
 * Group items by category slot
 * 
 * @param items - Array of enriched items
 * @returns Map of slot name to array of items
 */
function groupItemsBySlot(items: EnrichedItem[]): Map<string, EnrichedItem[]> {
  const grouped = new Map<string, EnrichedItem[]>();
  
  for (const item of items) {
    const categoryName = item.category?.name;
    if (!categoryName) continue;
    
    const slot = CATEGORY_TO_SLOT[categoryName];
    if (!slot) continue;
    
    if (!grouped.has(slot)) {
      grouped.set(slot, []);
    }
    grouped.get(slot)!.push(item);
  }
  
  return grouped;
}

/**
 * Determine which categories should be included in the outfit
 * 
 * Based on weather context and available items:
 * - Always include: Shirt, Pants, Shoes
 * - Conditional: Jacket/Overshirt (if targetWeight >= 2)
 * - Conditional: Undershirt (if not hot)
 * - Conditional: Belt (if pants/shoes are formal)
 * - Conditional: Watch (if available)
 * 
 * @param weatherContext - Current weather conditions
 * @param availableSlots - Set of slots that have items available
 * @param selectedItems - Currently selected items (for belt/watch logic)
 * @returns Array of slot names to include
 */
function determineIncludedCategories(
  weatherContext: WeatherContext,
  availableSlots: Set<string>,
  selectedItems: Partial<Record<string, EnrichedItem>>
): string[] {
  const included: string[] = [];
  
  // Always include required categories (if available)
  if (availableSlots.has('shirt')) included.push('shirt');
  if (availableSlots.has('pants')) included.push('pants');
  if (availableSlots.has('shoes')) included.push('shoes');
  
  // Include outer layer if weather is cold/mild (targetWeight >= 2)
  if (weatherContext.targetWeight >= 2) {
    // Prefer jacket over overshirt, but include whichever is available
    if (availableSlots.has('jacket')) {
      included.push('jacket');
    } else if (availableSlots.has('overshirt')) {
      included.push('overshirt');
    }
  }
  
  // Include undershirt unless it's hot
  if (!weatherContext.isHot && availableSlots.has('undershirt')) {
    included.push('undershirt');
  }
  
  // Include belt if pants or shoes are formal
  if (availableSlots.has('belt')) {
    const pants = selectedItems.pants;
    const shoes = selectedItems.shoes;
    
    const pantsFormal = pants && (pants.formality_score ?? 0) >= 5;
    const shoesFormal = shoes && (shoes.formality_score ?? 0) >= 6;
    
    if (pantsFormal || shoesFormal) {
      included.push('belt');
    }
  }
  
  // Include watch if available
  if (availableSlots.has('watch')) {
    included.push('watch');
  }
  
  return included;
}

/**
 * Select the best item from a category based on compatibility scoring
 * 
 * Applies constraint relaxation if no items meet strict criteria:
 * 1. Filter out excluded items (recently used)
 * 2. Try strict criteria (high compatibility threshold)
 * 3. If no matches, relax to moderate criteria
 * 4. If still no matches, select best available item
 * 5. If all items are excluded, fall back to excluded items
 * 
 * @param candidates - Array of items to choose from
 * @param context - Selection context (weather, selected items, exclusions)
 * @param options - Selection options (prefer shorts)
 * @returns The best matching item, or null if no candidates
 */
function selectBestItem(
  candidates: EnrichedItem[],
  context: {
    weatherContext: WeatherContext;
    selectedItems: Partial<Record<string, EnrichedItem>>;
    excludeItems: Set<string>;
    slot?: string;
  },
  options: {
    preferShorts?: boolean;
    variationSeed?: string;
    explorationLevel?: number;
  } = {}
): EnrichedItem | null {
  if (candidates.length === 0) return null;
  
  const { weatherContext, selectedItems, excludeItems, slot } = context;
  const {
    preferShorts = false,
    variationSeed,
    explorationLevel = 0,
  } = options;

  const constrainedCandidates = applyBeltShoeColorConstraint(candidates, selectedItems, slot);
  if (constrainedCandidates.length === 0) return null;
  if (constrainedCandidates.length === 1) return constrainedCandidates[0];
  
  // Filter out excluded items (recently used)
  const availableCandidates = constrainedCandidates.filter(item => !excludeItems.has(item.id));
  
  // If all items are excluded, fall back to all candidates
  const candidatesToScore = availableCandidates.length > 0 ? availableCandidates : constrainedCandidates;
  
  // Score all candidates
  const scoredCandidates = candidatesToScore.map(item => {
    // Calculate base compatibility score
    const compatScore = calculateCompatibilityScore(item, {
      weatherContext,
      selectedItems,
    });
    
    let finalScore = compatScore.total;
    
    // Apply shorts preference in hot weather
    if (preferShorts && item.name.toLowerCase().includes('shorts')) {
      finalScore += 0.15;
    }
    
    return {
      item,
      score: Math.max(0, Math.min(1, finalScore)),
      compatScore,
    };
  });
  
  // Sort by score (highest first)
  scoredCandidates.sort((a, b) => b.score - a.score);
  
  // Try strict criteria first (score >= 0.7)
  const strictMatches = scoredCandidates.filter(c => c.score >= 0.7);
  if (strictMatches.length > 0) {
    if (!variationSeed || clamp01(explorationLevel) === 0 || strictMatches.length === 1) {
      return strictMatches[0].item;
    }

    const normalizedExploration = clamp01(explorationLevel);
    const bestScore = strictMatches[0].score;
    const diversityMargin = 0.04 + normalizedExploration * 0.18;
    const shortlist = strictMatches
      .filter(candidate => bestScore - candidate.score <= diversityMargin)
      .slice(0, 6);

    if (shortlist.length === 1) {
      return shortlist[0].item;
    }

    const roll = hashToUnitInterval(`${variationSeed}:${slot ?? 'slot'}:roll`);
    const exponent = 2.2 - normalizedExploration * 1.3;
    const weighted = shortlist.map((candidate, index) => ({
      candidate,
      weight: Math.max(
        0.0001,
        Math.pow(candidate.score, exponent) *
          (0.95 + hashToUnitInterval(`${variationSeed}:${slot ?? 'slot'}:${candidate.item.id}:${index}`) * 0.1)
      ),
    }));
    const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = roll * totalWeight;
    for (const entry of weighted) {
      cursor -= entry.weight;
      if (cursor <= 0) {
        return entry.candidate.item;
      }
    }

    return weighted[weighted.length - 1]?.candidate.item ?? strictMatches[0].item;
  }
  
  // Relax to moderate criteria (score >= 0.5)
  const moderateMatches = scoredCandidates.filter(c => c.score >= 0.5);
  if (moderateMatches.length > 0) {
    return moderateMatches[0].item;
  }
  
  // Last resort: return highest scoring item regardless of threshold
  return scoredCandidates[0].item;
}

/**
 * Select items for all included categories in the proper order
 * 
 * @param itemsBySlot - Map of slot name to available items
 * @param includedCategories - Array of slot names to include
 * @param weatherContext - Current weather conditions
 * @param excludeItems - Set of item IDs to exclude
 * @returns Map of slot name to selected item
 */
function selectItems(
  itemsBySlot: Map<string, EnrichedItem[]>,
  includedCategories: string[],
  weatherContext: WeatherContext,
  excludeItems: Set<string>,
  generationOptions: {
    variationSeed?: string;
    explorationLevel?: number;
  }
): Map<string, EnrichedItem> {
  const selectedItems: Partial<Record<string, EnrichedItem>> = {};
  
  // Process categories in selection order
  for (const slot of SELECTION_ORDER) {
    // Skip if not included or no items available
    if (!includedCategories.includes(slot)) continue;
    if (!itemsBySlot.has(slot)) continue;
    
    const candidates = itemsBySlot.get(slot)!;
    
    // Special handling for pants: prefer shorts in hot weather
    const preferShorts = slot === 'pants' && weatherContext.isHot;
    
    // Select best item for this slot
    const selected = selectBestItem(
      candidates,
      { weatherContext, selectedItems, excludeItems, slot },
      {
        preferShorts,
        variationSeed: generationOptions.variationSeed ? `${generationOptions.variationSeed}:${slot}` : undefined,
        explorationLevel: generationOptions.explorationLevel,
      }
    );
    
    if (selected) {
      selectedItems[slot] = selected;
    }
  }
  
  // Filter out undefined values before creating Map
  const entries = Object.entries(selectedItems).filter(
    (entry): entry is [string, EnrichedItem] => entry[1] !== undefined
  );
  return new Map(entries);
}

/**
 * Calculate pairwise compatibility scores for all item combinations
 * 
 * @param selectedItems - Map of slot name to selected item
 * @param weatherContext - Current weather conditions
 * @returns Map of pair keys (e.g., "shirt-pants") to compatibility scores
 */
function calculatePairwiseScores(
  selectedItems: Map<string, EnrichedItem>,
  weatherContext: WeatherContext
): Record<string, CompatibilityScore> {
  const pairwise: Record<string, CompatibilityScore> = {};
  const items = Array.from(selectedItems.entries());
  
  // Calculate scores for all pairs
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const [slot1, item1] = items[i];
      const [slot2, item2] = items[j];
      
      const pairKey = `${slot1}-${slot2}`;
      
      // Calculate compatibility between the two items
      pairwise[pairKey] = calculateCompatibilityScore(item1, {
        weatherContext,
        selectedItems: { [slot2]: item2 },
      });
    }
  }
  
  return pairwise;
}

/**
 * Calculate overall outfit compatibility score
 * 
 * @param selectedItems - Map of slot name to selected item
 * @param weatherContext - Current weather conditions
 * @returns Overall compatibility score
 */
function calculateOverallScore(
  selectedItems: Map<string, EnrichedItem>,
  weatherContext: WeatherContext
): CompatibilityScore {
  const items = Array.from(selectedItems.values());
  
  if (items.length === 0) {
    return {
      weatherFit: 0,
      formalityAlignment: 0,
      colorHarmony: 0,
      capsuleCohesion: 0,
      total: 0,
    };
  }
  
  // Calculate average score across all items
  const scores = items.map(item =>
    calculateCompatibilityScore(item, {
      weatherContext,
      selectedItems: Object.fromEntries(
        Array.from(selectedItems.entries()).filter(([, selected]) => selected.id !== item.id)
      ),
    })
  );
  
  const avgScore: CompatibilityScore = {
    weatherFit: scores.reduce((sum, s) => sum + s.weatherFit, 0) / scores.length,
    formalityAlignment: scores.reduce((sum, s) => sum + s.formalityAlignment, 0) / scores.length,
    colorHarmony: scores.reduce((sum, s) => sum + s.colorHarmony, 0) / scores.length,
    capsuleCohesion: scores.reduce((sum, s) => sum + s.capsuleCohesion, 0) / scores.length,
    total: 0, // Will be calculated below
  };
  
  // Calculate weighted total
  avgScore.total =
    avgScore.weatherFit * 0.4 +
    avgScore.formalityAlignment * 0.3 +
    avgScore.colorHarmony * 0.2 +
    avgScore.capsuleCohesion * 0.1;
  
  return avgScore;
}

/**
 * Determine which categories can be swapped (have alternatives)
 * 
 * @param itemsBySlot - Map of slot name to available items
 * @param selectedItems - Map of slot name to selected item
 * @returns Map of slot name to boolean (true if swappable)
 */
function determineSwappable(
  itemsBySlot: Map<string, EnrichedItem[]>,
  selectedItems: Map<string, EnrichedItem>
): Record<string, boolean> {
  const swappable: Record<string, boolean> = {};
  
  for (const [slot] of selectedItems.entries()) {
    const availableItems = itemsBySlot.get(slot) || [];
    // Swappable if there are other items besides the selected one
    swappable[slot] = availableItems.length > 1;
  }
  
  return swappable;
}

/**
 * Generate a complete outfit from wardrobe items and weather context
 * 
 * This is the main entry point for outfit generation. It:
 * 1. Validates that required categories are present
 * 2. Enriches items with inferred metadata
 * 3. Groups items by category slot
 * 4. Determines which categories to include based on weather
 * 5. Selects the best item for each category in order
 * 6. Calculates compatibility scores
 * 7. Returns a complete GeneratedOutfit
 * 
 * This is a pure function with no side effects.
 * 
 * @param options - Generation options including wardrobe items and weather context
 * @returns A complete generated outfit with scores and metadata
 * @throws Error if required categories are missing
 * 
 * @example
 * const outfit = generateOutfit({
 *   wardrobeItems: userWardrobe,
 *   weatherContext: normalizedWeather,
 *   excludeItems: ['item-id-1', 'item-id-2'],
 * });
 */
export function generateOutfit(options: GenerationOptions): GeneratedOutfit {
  const {
    wardrobeItems,
    weatherContext,
    excludeItems = [],
    variationSeed,
    explorationLevel = 0,
  } = options;
  
  // Validate required categories
  if (!hasRequiredCategories(wardrobeItems)) {
    throw new Error(
      'Missing required categories. Wardrobe must contain at least one item from each: Shirt, Pants, Shoes'
    );
  }
  
  // Enrich items with inferred metadata
  const enrichedItems = enrichItems(wardrobeItems);
  
  // Group items by slot
  const itemsBySlot = groupItemsBySlot(enrichedItems);
  
  // Convert exclude list to Set for efficient lookup
  const excludeSet = new Set(excludeItems);
  
  // Determine which categories to include (requires initial selection for belt logic)
  // We'll do a two-pass approach: first select core items, then determine full inclusion
  const availableSlots = new Set(itemsBySlot.keys());
  
  // First pass: select core items (pants, shirt, shoes)
  const coreItems: Partial<Record<string, EnrichedItem>> = {};
  
  for (const slot of ['pants', 'shirt', 'shoes']) {
    if (!itemsBySlot.has(slot)) continue;
    
    const candidates = itemsBySlot.get(slot)!;
    const preferShorts = slot === 'pants' && weatherContext.isHot;
    
    const selected = selectBestItem(
      candidates,
      { weatherContext, selectedItems: coreItems, excludeItems: excludeSet, slot },
      {
        preferShorts,
        variationSeed: variationSeed ? `${variationSeed}:core:${slot}` : undefined,
        explorationLevel,
      }
    );
    
    if (selected) {
      coreItems[slot] = selected;
    }
  }
  
  // Determine full category inclusion based on core items
  const includedCategories = determineIncludedCategories(
    weatherContext,
    availableSlots,
    coreItems
  );
  
  // Second pass: select all items in proper order
  const selectedItemsMap = selectItems(
    itemsBySlot,
    includedCategories,
    weatherContext,
    excludeSet,
    {
      variationSeed: variationSeed ? `${variationSeed}:full` : undefined,
      explorationLevel,
    }
  );
  
  // Build items object with proper typing
  const items: GeneratedOutfit['items'] = {
    shirt: selectedItemsMap.get('shirt')!,
    pants: selectedItemsMap.get('pants')!,
    shoes: selectedItemsMap.get('shoes')!,
    jacket: selectedItemsMap.get('jacket'),
    overshirt: selectedItemsMap.get('overshirt'),
    undershirt: selectedItemsMap.get('undershirt'),
    belt: selectedItemsMap.get('belt'),
    watch: selectedItemsMap.get('watch'),
  };
  
  // Extract item IDs
  const itemIds = Array.from(selectedItemsMap.values()).map(item => item.id);
  
  // Calculate scores
  const overall = calculateOverallScore(selectedItemsMap, weatherContext);
  const pairwise = calculatePairwiseScores(selectedItemsMap, weatherContext);
  
  // Determine swappable categories
  const swappable = determineSwappable(itemsBySlot, selectedItemsMap);
  
  return {
    items,
    itemIds,
    scores: {
      overall,
      pairwise,
    },
    swappable,
    weatherContext,
    generatedAt: new Date(),
  };
}

/**
 * Regenerate a new outfit with variety through exclusion
 * 
 * This is a convenience wrapper around generateOutfit that maintains
 * the same interface but is semantically clearer for regeneration use cases.
 * 
 * @param options - Generation options (same as generateOutfit)
 * @returns A new generated outfit
 */
export function regenerateOutfit(options: GenerationOptions): GeneratedOutfit {
  return generateOutfit(options);
}

/**
 * Swap a single item in a category while keeping all others fixed
 * 
 * This function:
 * 1. Validates the category exists in the current outfit
 * 2. Finds alternative items in that category
 * 3. Excludes the currently selected item
 * 4. Selects the best alternative based on compatibility with fixed items
 * 5. Returns a new outfit with the swapped item
 * 
 * This is a pure function with no side effects.
 * 
 * @param options - Swap options including current outfit and category to swap
 * @returns A new generated outfit with the swapped item
 * @throws Error if category is not in the outfit or has no alternatives
 * 
 * @example
 * const newOutfit = swapItem({
 *   currentOutfit: existingOutfit,
 *   category: 'shirt',
 *   wardrobeItems: userWardrobe,
 *   weatherContext: normalizedWeather,
 * });
 */
export function swapItem(options: SwapOptions): GeneratedOutfit {
  const { currentOutfit, category, wardrobeItems, weatherContext } = options;
  
  // Validate category exists in current outfit
  const currentItem = currentOutfit.items[category as keyof typeof currentOutfit.items];
  if (!currentItem) {
    throw new Error(`Category "${category}" is not present in the current outfit`);
  }
  
  // Enrich items and group by slot
  const enrichedItems = enrichItems(wardrobeItems);
  const itemsBySlot = groupItemsBySlot(enrichedItems);
  
  // Get candidates for this category
  const candidates = itemsBySlot.get(category);
  if (!candidates || candidates.length <= 1) {
    throw new Error(`No alternative items available for category "${category}"`);
  }
  
  // Build context with all other selected items (excluding the category being swapped)
  const fixedItems: Partial<Record<string, EnrichedItem>> = {};
  for (const [slot, item] of Object.entries(currentOutfit.items)) {
    if (slot !== category && item) {
      fixedItems[slot] = item;
    }
  }
  
  // Exclude the current item from selection
  const excludeSet = new Set([currentItem.id]);
  
  // Select best alternative
  const newItem = selectBestItem(
    candidates,
    { weatherContext, selectedItems: fixedItems, excludeItems: excludeSet, slot: category },
    { preferShorts: category === 'pants' && weatherContext.isHot }
  );
  
  if (!newItem) {
    throw new Error(`Failed to find alternative item for category "${category}"`);
  }
  
  // Build new selected items map
  const selectedItemsMap = new Map<string, EnrichedItem>();
  for (const [slot, item] of Object.entries(currentOutfit.items)) {
    if (item) {
      selectedItemsMap.set(slot, slot === category ? newItem : item);
    }
  }
  
  // Build items object with proper typing
  const items: GeneratedOutfit['items'] = {
    shirt: selectedItemsMap.get('shirt')!,
    pants: selectedItemsMap.get('pants')!,
    shoes: selectedItemsMap.get('shoes')!,
    jacket: selectedItemsMap.get('jacket'),
    overshirt: selectedItemsMap.get('overshirt'),
    undershirt: selectedItemsMap.get('undershirt'),
    belt: selectedItemsMap.get('belt'),
    watch: selectedItemsMap.get('watch'),
  };
  
  // Extract item IDs
  const itemIds = Array.from(selectedItemsMap.values()).map(item => item.id);
  
  // Calculate scores
  const overall = calculateOverallScore(selectedItemsMap, weatherContext);
  const pairwise = calculatePairwiseScores(selectedItemsMap, weatherContext);
  
  // Determine swappable categories
  const swappable = determineSwappable(itemsBySlot, selectedItemsMap);
  
  return {
    items,
    itemIds,
    scores: {
      overall,
      pairwise,
    },
    swappable,
    weatherContext,
    generatedAt: new Date(),
  };
}
