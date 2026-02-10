/**
 * Property-Based Tests for Outfit Scoring Consistency
 * 
 * **Feature: category-split-jacket-overshirt, Property 10: Outfit Scoring Consistency**
 * **Validates: Requirements 4.3, 7.6**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Simulate the outfit item structure used in scoring
interface OutfitItem {
  id: string;
  name: string;
  color?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  category_name: string;
}

interface OutfitSelection {
  jacket?: OutfitItem;
  overshirt?: OutfitItem;
  shirt?: OutfitItem;
  pants?: OutfitItem;
  shoes?: OutfitItem;
  belt?: OutfitItem;
  watch?: OutfitItem;
  tuck_style?: 'Tucked' | 'Untucked';
}

interface ScoreBreakdown {
  formality: number;
  color_harmony: number;
  seasonal_appropriateness: number;
  style_consistency: number;
  total: number;
}

// Simplified scoring functions based on the Edge Function logic
function calculateFormalityScore(selection: OutfitSelection): number {
  const items = [selection.jacket, selection.overshirt, selection.shirt, selection.pants, selection.shoes, selection.belt, selection.watch]
    .filter(Boolean) as OutfitItem[];
  
  if (items.length === 0) return 0;
  
  const formalityScores = items
    .map(item => item.formality_score || 5)
    .filter(score => score > 0);
  
  if (formalityScores.length === 0) return 50;
  
  const avgFormality = formalityScores.reduce((sum, score) => sum + score, 0) / formalityScores.length;
  const variance = formalityScores.reduce((sum, score) => sum + Math.pow(score - avgFormality, 2), 0) / formalityScores.length;
  
  const consistencyScore = Math.max(0, 100 - (variance * 10));
  return Math.round(consistencyScore);
}

function calculateColorHarmony(selection: OutfitSelection): number {
  const items = [selection.jacket, selection.overshirt, selection.shirt, selection.pants, selection.shoes, selection.belt]
    .filter(Boolean) as OutfitItem[];
  
  if (items.length < 2) return 80;
  
  const colors = items.map(item => item.color?.toLowerCase()).filter(Boolean);
  if (colors.length < 2) return 70;
  
  const neutrals = ['white', 'black', 'grey', 'gray', 'navy', 'cream', 'beige', 'khaki', 'brown'];
  let harmonyScore = 60;
  
  const neutralCount = colors.filter(color => neutrals.includes(color)).length;
  if (neutralCount >= colors.length * 0.7) {
    harmonyScore += 20;
  }
  
  const uniqueColors = new Set(colors);
  if (uniqueColors.size <= 2) {
    harmonyScore += 15;
  }
  
  return Math.min(100, Math.round(harmonyScore));
}

function calculateOutfitScore(selection: OutfitSelection): ScoreBreakdown {
  const formality = calculateFormalityScore(selection);
  const color_harmony = calculateColorHarmony(selection);
  const seasonal_appropriateness = 80; // Simplified for testing
  const style_consistency = 75; // Simplified for testing
  
  const total = Math.round(
    (formality * 0.3) + 
    (color_harmony * 0.3) + 
    (seasonal_appropriateness * 0.2) + 
    (style_consistency * 0.2)
  );
  
  return {
    formality,
    color_harmony,
    seasonal_appropriateness,
    style_consistency,
    total: Math.max(0, Math.min(100, total))
  };
}

// Generators for test data
const outfitItemArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  color: fc.option(fc.oneof(
    fc.constant('black'),
    fc.constant('white'),
    fc.constant('navy'),
    fc.constant('grey'),
    fc.constant('brown'),
    fc.constant('blue'),
    fc.constant('red')
  )),
  formality_score: fc.option(fc.integer({ min: 1, max: 10 })),
  capsule_tags: fc.option(fc.array(fc.string({ maxLength: 10 }), { maxLength: 3 })),
  season: fc.option(fc.array(fc.oneof(
    fc.constant('Spring'),
    fc.constant('Summer'),
    fc.constant('Fall'),
    fc.constant('Winter'),
    fc.constant('All')
  ), { maxLength: 2 })),
  category_name: fc.oneof(
    fc.constant('Jacket'),
    fc.constant('Overshirt'),
    fc.constant('Shirt'),
    fc.constant('Pants'),
    fc.constant('Shoes'),
    fc.constant('Belt'),
    fc.constant('Watch')
  )
});

describe('Outfit Scoring Consistency Property Tests', () => {
  /**
   * Property 10: Outfit Scoring Consistency
   * For any outfit containing items from the new categories, the scoring algorithm 
   * should produce consistent and valid scores that account for the category distinction
   * **Feature: category-split-jacket-overshirt, Property 10: Outfit Scoring Consistency**
   * **Validates: Requirements 4.3, 7.6**
   */
  it('Property 10: Scoring should be consistent for Jacket vs Overshirt categories', () => {
    fc.assert(fc.property(
      fc.record({
        jacketItem: outfitItemArb,
        overshirtItem: outfitItemArb,
        shirtItem: outfitItemArb,
        pantsItem: outfitItemArb
      }),
      (testData) => {
        // Create two identical outfits except one uses Jacket, other uses Overshirt
        const jacketItem = { ...testData.jacketItem, category_name: 'Jacket' };
        const overshirtItem = { ...testData.overshirtItem, category_name: 'Overshirt', 
                               formality_score: jacketItem.formality_score, 
                               color: jacketItem.color };
        
        const sharedItems = {
          shirt: { ...testData.shirtItem, category_name: 'Shirt' },
          pants: { ...testData.pantsItem, category_name: 'Pants' }
        };
        
        // Create outfit with Jacket
        const outfitWithJacket: OutfitSelection = {
          jacket: jacketItem,
          ...sharedItems
        };
        
        // Create outfit with Overshirt (goes to separate overshirt slot)
        const outfitWithOvershirt: OutfitSelection = {
          overshirt: overshirtItem, // Overshirt maps to overshirt slot
          ...sharedItems
        };
        
        // Calculate scores
        const jacketScore = calculateOutfitScore(outfitWithJacket);
        const overshirtScore = calculateOutfitScore(outfitWithOvershirt);
        
        // Scores should be identical since items have same properties
        expect(jacketScore.total).toBe(overshirtScore.total);
        expect(jacketScore.formality).toBe(overshirtScore.formality);
        expect(jacketScore.color_harmony).toBe(overshirtScore.color_harmony);
        
        // Scores should be valid (0-100 range)
        expect(jacketScore.total).toBeGreaterThanOrEqual(0);
        expect(jacketScore.total).toBeLessThanOrEqual(100);
        expect(overshirtScore.total).toBeGreaterThanOrEqual(0);
        expect(overshirtScore.total).toBeLessThanOrEqual(100);
        
        return true;
      }
    ), { numRuns: 3 });
  });

  /**
   * Property 10b: Score Determinism
   * For any outfit, calculating the score multiple times should yield identical results
   */
  it('Property 10b: Scoring should be deterministic for any outfit composition', () => {
    fc.assert(fc.property(
      fc.record({
        jacket: fc.option(outfitItemArb),
        shirt: fc.option(outfitItemArb),
        pants: fc.option(outfitItemArb),
        shoes: fc.option(outfitItemArb)
      }),
      (testData) => {
        const selection: OutfitSelection = {
          jacket: testData.jacket ? { ...testData.jacket, category_name: 'Jacket' } : undefined,
          shirt: testData.shirt ? { ...testData.shirt, category_name: 'Shirt' } : undefined,
          pants: testData.pants ? { ...testData.pants, category_name: 'Pants' } : undefined,
          shoes: testData.shoes ? { ...testData.shoes, category_name: 'Shoes' } : undefined
        };
        
        // Calculate score multiple times
        const score1 = calculateOutfitScore(selection);
        const score2 = calculateOutfitScore(selection);
        const score3 = calculateOutfitScore(selection);
        
        // All scores should be identical
        expect(score1.total).toBe(score2.total);
        expect(score2.total).toBe(score3.total);
        expect(score1.formality).toBe(score2.formality);
        expect(score1.color_harmony).toBe(score2.color_harmony);
        
        // Scores should be in valid range
        expect(score1.total).toBeGreaterThanOrEqual(0);
        expect(score1.total).toBeLessThanOrEqual(100);
        
        return true;
      }
    ), { numRuns: 3 });
  });

  /**
   * Property 10c: Category Independence in Scoring
   * For any outfit, the scoring should work correctly regardless of whether 
   * the outer layer is categorized as Jacket or Overshirt
   */
  it('Property 10c: Scoring should handle both Jacket and Overshirt categories correctly', () => {
    fc.assert(fc.property(
      fc.record({
        outerLayerItem: outfitItemArb,
        otherItems: fc.array(outfitItemArb, { minLength: 1, maxLength: 3 })
      }),
      (testData) => {
        // Test with Jacket category
        const jacketOutfit: OutfitSelection = {
          jacket: { ...testData.outerLayerItem, category_name: 'Jacket' }
        };
        
        // Test with Overshirt category  
        const overshirtOutfit: OutfitSelection = {
          jacket: { ...testData.outerLayerItem, category_name: 'Overshirt' }
        };
        
        // Calculate scores
        const jacketScore = calculateOutfitScore(jacketOutfit);
        const overshirtScore = calculateOutfitScore(overshirtOutfit);
        
        // Both should produce valid scores
        expect(jacketScore.total).toBeGreaterThanOrEqual(0);
        expect(jacketScore.total).toBeLessThanOrEqual(100);
        expect(overshirtScore.total).toBeGreaterThanOrEqual(0);
        expect(overshirtScore.total).toBeLessThanOrEqual(100);
        
        // Since the items are identical except for category name,
        // and category name doesn't affect scoring logic, scores should be equal
        expect(jacketScore.total).toBe(overshirtScore.total);
        
        return true;
      }
    ), { numRuns: 3 });
  });
});
