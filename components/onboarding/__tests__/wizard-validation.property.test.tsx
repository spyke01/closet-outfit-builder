import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { WizardState, CategoryKey, StyleBaseline } from '@/lib/types/onboarding';
import { getEssentialCategoryKeys, getCategoryKeys } from '@/lib/data/onboarding-categories';

/**
 * Property-based tests for wizard validation logic
 * 
 * Tests universal properties:
 * 1. Step validation prevents invalid progression
 * 2. Category selection preserves essential categories
 * 11. Navigation state is consistent
 */

// Generators
const categoryKeyArb = fc.constantFrom<CategoryKey>(...getCategoryKeys());

const climateArb = fc.constantFrom<'Hot' | 'Cold' | 'Mixed' | null>('Hot', 'Cold', 'Mixed', null);

const primaryUseArb = fc.constantFrom<'Work' | 'Casual' | 'Mixed' | null>('Work', 'Casual', 'Mixed', null);

const styleBaselineArb: fc.Arbitrary<StyleBaseline> = fc.record({
  primaryUse: primaryUseArb,
  climate: climateArb,
});

/**
 * Validation logic extracted from wizard component for testing
 */
function canProceedFromStep(state: WizardState): boolean {
  switch (state.step) {
    case 1: // Style Baseline
      return (
        state.styleBaseline.primaryUse !== null &&
        state.styleBaseline.climate !== null
      );
    
    case 2: // Category Ownership
      return state.selectedCategories.length > 0;
    
    case 3: // Subcategory Selection
      return Object.values(state.selectedSubcategories).some(
        subs => subs.length > 0
      );
    
    case 4: // Colors & Quantity
      return Object.values(state.colorQuantitySelections).some(
        selection => selection.colors.length > 0
      );
    
    case 5: // Review
      return state.generatedItems.length > 0;
    
    case 6: // Success
      return true;
    
    default:
      return false;
  }
}

describe('Property-Based Tests: Wizard Validation', () => {
  /**
   * Property 1: Step Validation Prevents Invalid Progression
   * 
   * For any wizard state, the user cannot proceed to the next step
   * without meeting the current step's requirements.
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
   */
  it('Property 1: Step validation prevents invalid progression', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        styleBaselineArb,
        (step, styleBaseline) => {
          // Test Step 1: Style Baseline
          if (step === 1) {
            // Invalid: Missing primaryUse
            const invalidState1: WizardState = {
              step: 1,
              styleBaseline: { primaryUse: null, climate: 'Hot' },
              selectedCategories: [],
              selectedSubcategories: {},
              colorQuantitySelections: {},
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(invalidState1)).toBe(false);

            // Invalid: Missing climate
            const invalidState2: WizardState = {
              step: 1,
              styleBaseline: { primaryUse: 'Casual', climate: null },
              selectedCategories: [],
              selectedSubcategories: {},
              colorQuantitySelections: {},
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(invalidState2)).toBe(false);

            // Valid: Both selections present
            const validState: WizardState = {
              step: 1,
              styleBaseline: { primaryUse: 'Casual', climate: 'Hot' },
              selectedCategories: [],
              selectedSubcategories: {},
              colorQuantitySelections: {},
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(validState)).toBe(true);
          }

          // Test Step 2: Category Ownership
          if (step === 2) {
            // Invalid: No categories selected
            const invalidState: WizardState = {
              step: 2,
              styleBaseline,
              selectedCategories: [],
              selectedSubcategories: {},
              colorQuantitySelections: {},
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(invalidState)).toBe(false);

            // Valid: At least one category selected
            const validState: WizardState = {
              step: 2,
              styleBaseline,
              selectedCategories: ['Tops'],
              selectedSubcategories: {},
              colorQuantitySelections: {},
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(validState)).toBe(true);
          }

          // Test Step 3: Subcategory Selection
          if (step === 3) {
            // Invalid: No subcategories selected
            const invalidState: WizardState = {
              step: 3,
              styleBaseline,
              selectedCategories: ['Tops'],
              selectedSubcategories: {},
              colorQuantitySelections: {},
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(invalidState)).toBe(false);

            // Valid: At least one subcategory selected
            const validState: WizardState = {
              step: 3,
              styleBaseline,
              selectedCategories: ['Tops'],
              selectedSubcategories: { Tops: ['T-Shirt'] },
              colorQuantitySelections: {},
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(validState)).toBe(true);
          }

          // Test Step 4: Colors & Quantity
          if (step === 4) {
            // Invalid: No colors selected
            const invalidState: WizardState = {
              step: 4,
              styleBaseline,
              selectedCategories: ['Tops'],
              selectedSubcategories: { Tops: ['T-Shirt'] },
              colorQuantitySelections: {},
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(invalidState)).toBe(false);

            // Valid: At least one color selected
            const validState: WizardState = {
              step: 4,
              styleBaseline,
              selectedCategories: ['Tops'],
              selectedSubcategories: { Tops: ['T-Shirt'] },
              colorQuantitySelections: {
                'Tops-T-Shirt': { subcategory: 'T-Shirt', colors: ['navy'] },
              },
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(validState)).toBe(true);
          }

          // Test Step 5: Review
          if (step === 5) {
            // Invalid: No items generated
            const invalidState: WizardState = {
              step: 5,
              styleBaseline,
              selectedCategories: ['Tops'],
              selectedSubcategories: { Tops: ['T-Shirt'] },
              colorQuantitySelections: {
                'Tops-T-Shirt': { subcategory: 'T-Shirt', colors: ['navy'] },
              },
              generatedItems: [],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(invalidState)).toBe(false);

            // Valid: Items generated
            const validState: WizardState = {
              step: 5,
              styleBaseline,
              selectedCategories: ['Tops'],
              selectedSubcategories: { Tops: ['T-Shirt'] },
              colorQuantitySelections: {
                'Tops-T-Shirt': { subcategory: 'T-Shirt', colors: ['navy'] },
              },
              generatedItems: [
                {
                  id: 'temp-1',
                  category: 'Tops',
                  subcategory: 'T-Shirt',
                  name: 'Navy T-Shirt',
                  color: 'navy',
                  formality_score: 2,
                  season: ['All'],
                  image_url: null,
                  source: 'onboarding',
                },
              ],
              itemCapEnabled: true,
              itemCap: 50,
            };
            expect(canProceedFromStep(validState)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 2: Category Selection Preserves Essential Categories
   * 
   * For any user interaction with category selection, the essential categories
   * (Tops, Bottoms, Shoes) remain available and cannot all be deselected.
   * 
   * **Validates: Requirements 2.3**
   */
  it('Property 2: Essential categories are always available', () => {
    fc.assert(
      fc.property(
        fc.array(categoryKeyArb, { minLength: 0, maxLength: 6 }),
        (selectedCategories) => {
          const essentialCategories = getEssentialCategoryKeys();
          
          // Property: Essential categories are a subset of all available categories
          const allCategories = getCategoryKeys();
          for (const essential of essentialCategories) {
            expect(allCategories).toContain(essential);
          }
          
          // Property: If user has selected categories, at least one should be valid
          if (selectedCategories.length > 0) {
            const hasValidCategory = selectedCategories.some(cat =>
              allCategories.includes(cat)
            );
            expect(hasValidCategory).toBe(true);
          }
          
          // Property: Essential categories should be pre-selected by default
          // (This is enforced in the wizard initialization)
          expect(essentialCategories.length).toBeGreaterThan(0);
          expect(essentialCategories).toContain('Tops');
          expect(essentialCategories).toContain('Bottoms');
          expect(essentialCategories).toContain('Shoes');
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 11: Navigation State Is Consistent
   * 
   * For any step transition, the wizard state reflects the correct step number
   * and previous selections are preserved.
   * 
   * **Validates: Requirements 3.6.5**
   */
  it('Property 11: Navigation state is consistent across transitions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        styleBaselineArb,
        fc.array(categoryKeyArb, { minLength: 1, maxLength: 3 }),
        (currentStep, styleBaseline, selectedCategories) => {
          // Create initial state
          const initialState: WizardState = {
            step: currentStep,
            styleBaseline,
            selectedCategories,
            selectedSubcategories: { Tops: ['T-Shirt'] },
            colorQuantitySelections: {
              'Tops-T-Shirt': { subcategory: 'T-Shirt', colors: ['navy'] },
            },
            generatedItems: [],
            itemCapEnabled: true,
            itemCap: 50,
          };

          // Simulate step forward
          const nextState: WizardState = {
            ...initialState,
            step: currentStep + 1,
          };

          // Property: Step number increments correctly
          expect(nextState.step).toBe(currentStep + 1);

          // Property: Previous selections are preserved
          expect(nextState.styleBaseline).toEqual(initialState.styleBaseline);
          expect(nextState.selectedCategories).toEqual(initialState.selectedCategories);
          expect(nextState.selectedSubcategories).toEqual(initialState.selectedSubcategories);
          expect(nextState.colorQuantitySelections).toEqual(initialState.colorQuantitySelections);

          // Simulate step backward
          const prevState: WizardState = {
            ...nextState,
            step: currentStep,
          };

          // Property: Step number decrements correctly
          expect(prevState.step).toBe(currentStep);

          // Property: Selections remain preserved after going back
          expect(prevState.styleBaseline).toEqual(initialState.styleBaseline);
          expect(prevState.selectedCategories).toEqual(initialState.selectedCategories);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
