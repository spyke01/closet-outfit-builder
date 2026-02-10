/**
 * Compatibility Scoring Utilities
 * 
 * Pure functions for calculating multi-dimensional compatibility scores
 * between outfit items and weather context.
 * 
 * All scoring functions return values between 0 and 1, where:
 * - 0 = completely incompatible
 * - 1 = perfectly compatible
 */

import { EnrichedItem, WeatherContext, CompatibilityScore, ColorCategory } from '@/lib/types/generation';

/**
 * Calculate weather fit score for an item
 * 
 * Evaluates how appropriate an item is for current weather conditions
 * based on its weather weight, season tags, and the weather context.
 * 
 * @param item - The enriched wardrobe item to score
 * @param weatherContext - Current weather conditions
 * @returns Score between 0 and 1 (0 = poor fit, 1 = perfect fit)
 * 
 * @example
 * const heavyJacket = { weatherWeight: 3, season: ['Fall', 'Winter'] };
 * const coldWeather = { isCold: true, targetWeight: 3, currentTemp: 45 };
 * calculateWeatherFit(heavyJacket, coldWeather); // Returns ~0.95
 */
export function calculateWeatherFit(
  item: EnrichedItem,
  weatherContext: WeatherContext
): number {
  // Base score starts at 0.5 (neutral)
  let score = 0.5;
  
  // Weather weight alignment (most important factor)
  const weightDiff = Math.abs(item.weatherWeight - weatherContext.targetWeight);
  
  if (weightDiff === 0) {
    // Perfect match
    score += 0.4;
  } else if (weightDiff === 1) {
    // Close match
    score += 0.2;
  } else if (weightDiff === 2) {
    // Moderate mismatch
    score -= 0.1;
  } else {
    // Poor match (3+ difference)
    score -= 0.3;
  }
  
  // Season alignment bonus
  if (item.season && item.season.length > 0) {
    const currentSeason = getCurrentSeason(weatherContext);
    if (item.season.includes(currentSeason)) {
      score += 0.1;
    }
  }
  
  // Rain consideration
  if (weatherContext.isRainLikely) {
    // Prefer items that work in rain (no specific penalty for now)
    // Future: could check material or category
  }
  
  // Clamp score to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate formality alignment score between two items
 * 
 * Evaluates how well the formality levels of two items match.
 * Penalizes extreme mismatches (e.g., formal shoes with casual shorts).
 * 
 * @param item1 - First enriched wardrobe item
 * @param item2 - Second enriched wardrobe item
 * @returns Score between 0 and 1 (0 = poor alignment, 1 = perfect alignment)
 * 
 * @example
 * const formalShirt = { formality_score: 8 };
 * const formalPants = { formality_score: 7 };
 * calculateFormalityAlignment(formalShirt, formalPants); // Returns ~0.9
 */
export function calculateFormalityAlignment(
  item1: EnrichedItem,
  item2: EnrichedItem
): number {
  const score1 = item1.formality_score ?? 5;
  const score2 = item2.formality_score ?? 5;
  
  // Calculate absolute difference (0-9 range)
  const diff = Math.abs(score1 - score2);
  
  // Convert difference to alignment score
  // 0 diff = 1.0, 1 diff = 0.9, 2 diff = 0.8, etc.
  // 4+ diff = significant penalty
  if (diff === 0) {
    return 1.0;
  } else if (diff === 1) {
    return 0.9;
  } else if (diff === 2) {
    return 0.75;
  } else if (diff === 3) {
    return 0.6;
  } else if (diff === 4) {
    return 0.4;
  } else {
    // 5+ difference is a major mismatch
    return Math.max(0, 0.3 - (diff - 5) * 0.1);
  }
}

/**
 * Calculate color harmony score between two colors
 * 
 * Evaluates how well two colors work together based on color theory.
 * Favors neutral combinations and penalizes clashing colors.
 * 
 * @param color1 - First color category
 * @param color2 - Second color category
 * @returns Score between 0 and 1 (0 = clashing, 1 = harmonious)
 * 
 * @example
 * calculateColorHarmony('navy', 'white'); // Returns 1.0 (classic combo)
 * calculateColorHarmony('red', 'green'); // Returns 0.3 (clashing)
 */
export function calculateColorHarmony(
  color1: ColorCategory,
  color2: ColorCategory
): number {
  // Neutral colors that go with everything
  const neutrals: ColorCategory[] = [
    'black', 'white', 'grey', 'gray', 'navy', 
    'cream', 'khaki', 'brown', 'tan', 'charcoal'
  ];
  
  // Colors that clash
  const clashingPairs: [ColorCategory, ColorCategory][] = [
    ['red', 'green'],
    ['red', 'burgundy'],
    ['blue', 'green'],
    ['brown', 'black'],
  ];
  
  // Unknown colors get neutral score
  if (color1 === 'unknown' || color2 === 'unknown') {
    return 0.7;
  }
  
  // Same color is good
  if (color1 === color2) {
    return 0.85;
  }
  
  // Check for clashing pairs (bidirectional)
  const isClashing = clashingPairs.some(
    ([c1, c2]) => 
      (color1 === c1 && color2 === c2) || 
      (color1 === c2 && color2 === c1)
  );
  
  if (isClashing) {
    return 0.3;
  }
  
  // Both neutral colors = excellent harmony
  if (neutrals.includes(color1) && neutrals.includes(color2)) {
    return 1.0;
  }
  
  // One neutral + one non-neutral = good harmony
  if (neutrals.includes(color1) || neutrals.includes(color2)) {
    return 0.85;
  }
  
  // Two non-neutral, non-clashing colors = moderate harmony
  return 0.6;
}

/**
 * Calculate capsule cohesion score between two items
 * 
 * Evaluates how well items work together based on shared capsule tags.
 * Items from the same capsule collection score higher.
 * 
 * @param item1 - First enriched wardrobe item
 * @param item2 - Second enriched wardrobe item
 * @returns Score between 0 and 1 (0 = no cohesion, 1 = perfect cohesion)
 * 
 * @example
 * const refinedShirt = { capsule_tags: ['Refined', 'Crossover'] };
 * const refinedPants = { capsule_tags: ['Refined'] };
 * calculateCapsuleCohesion(refinedShirt, refinedPants); // Returns 0.9
 */
export function calculateCapsuleCohesion(
  item1: EnrichedItem,
  item2: EnrichedItem
): number {
  const tags1 = item1.capsule_tags ?? [];
  const tags2 = item2.capsule_tags ?? [];
  
  // If either item has no tags, return neutral score
  if (tags1.length === 0 || tags2.length === 0) {
    return 0.7;
  }
  
  // Find shared tags
  const sharedTags = tags1.filter(tag => tags2.includes(tag));
  
  if (sharedTags.length === 0) {
    // No shared tags = lower cohesion
    return 0.5;
  } else if (sharedTags.length === 1) {
    // One shared tag = good cohesion
    return 0.8;
  } else {
    // Multiple shared tags = excellent cohesion
    return 0.95;
  }
}

/**
 * Calculate overall compatibility score for an item in outfit context
 * 
 * Combines all scoring dimensions (weather fit, formality alignment,
 * color harmony, capsule cohesion) into a single weighted score.
 * 
 * @param item - The item to score
 * @param context - Context including weather and other selected items
 * @returns Complete compatibility score breakdown
 * 
 * @example
 * const shirt = { ... };
 * const context = {
 *   weatherContext: { isCold: true, targetWeight: 3 },
 *   selectedItems: { pants: {...}, shoes: {...} }
 * };
 * calculateCompatibilityScore(shirt, context);
 * // Returns { weatherFit: 0.9, formalityAlignment: 0.85, ... }
 */
export function calculateCompatibilityScore(
  item: EnrichedItem,
  context: {
    weatherContext: WeatherContext;
    selectedItems: Partial<Record<string, EnrichedItem>>;
  }
): CompatibilityScore {
  // Calculate weather fit
  const weatherFit = calculateWeatherFit(item, context.weatherContext);
  
  // Calculate formality alignment (average across all selected items)
  const selectedItemsArray = Object.values(context.selectedItems).filter(
    (i): i is EnrichedItem => i !== undefined
  );
  
  let formalityAlignment = 1.0; // Default if no items to compare
  if (selectedItemsArray.length > 0) {
    const alignmentScores = selectedItemsArray.map(selectedItem =>
      calculateFormalityAlignment(item, selectedItem)
    );
    formalityAlignment = alignmentScores.reduce((sum, score) => sum + score, 0) / alignmentScores.length;
  }
  
  // Calculate color harmony (average across all selected items)
  let colorHarmony = 1.0; // Default if no items to compare
  if (selectedItemsArray.length > 0) {
    const harmonyScores = selectedItemsArray.map(selectedItem =>
      calculateColorHarmony(item.inferredColor, selectedItem.inferredColor)
    );
    colorHarmony = harmonyScores.reduce((sum, score) => sum + score, 0) / harmonyScores.length;
  }
  
  // Calculate capsule cohesion (average across all selected items)
  let capsuleCohesion = 1.0; // Default if no items to compare
  if (selectedItemsArray.length > 0) {
    const cohesionScores = selectedItemsArray.map(selectedItem =>
      calculateCapsuleCohesion(item, selectedItem)
    );
    capsuleCohesion = cohesionScores.reduce((sum, score) => sum + score, 0) / cohesionScores.length;
  }
  
  // Calculate weighted total
  // Weather fit is most important (40%), followed by formality (30%),
  // color harmony (20%), and capsule cohesion (10%)
  const total = 
    weatherFit * 0.4 +
    formalityAlignment * 0.3 +
    colorHarmony * 0.2 +
    capsuleCohesion * 0.1;
  
  return {
    weatherFit,
    formalityAlignment,
    colorHarmony,
    capsuleCohesion,
    total,
  };
}

/**
 * Helper function to determine current season from weather context
 * 
 * @param weatherContext - Current weather conditions
 * @returns Season name
 */
function getCurrentSeason(weatherContext: WeatherContext): string {
  // Simple season determination based on temperature
  // This could be enhanced with actual date-based logic
  if (weatherContext.isCold) {
    return 'Winter';
  } else if (weatherContext.isHot) {
    return 'Summer';
  } else if (weatherContext.currentTemp < 65) {
    return 'Fall';
  } else {
    return 'Spring';
  }
}
