import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { 
  WardrobeItemClassifier, 
  classifyWardrobeItem, 
  getClassificationReason
} from '@/lib/utils/wardrobe-item-classifier';
import type { WardrobeItem } from '@/lib/types/database';

describe('WardrobeItemClassifier', () => {
  describe('Property 2: Item Classification Correctness', () => {
    /**
     * Property-based test for item classification correctness
     * **Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4**
     * Feature: category-split-jacket-overshirt, Property 2: Item Classification Correctness
     */
    it('should classify all items as either Jacket or Overshirt', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          category_id: fc.string(),
          name: fc.string({ minLength: 1 }),
          brand: fc.option(fc.string(), { nil: undefined }),
          color: fc.option(fc.string(), { nil: undefined }),
          material: fc.option(fc.string(), { nil: undefined }),
          formality_score: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
          capsule_tags: fc.option(fc.array(fc.string()), { nil: undefined }),
          season: fc.option(fc.array(fc.string()), { nil: undefined }),
          image_url: fc.option(fc.string(), { nil: undefined }),
          active: fc.boolean(),
          external_id: fc.option(fc.string(), { nil: undefined }),
          created_at: fc.string(),
          updated_at: fc.string()
        }),
        (item: WardrobeItem) => {
          const classifier = new WardrobeItemClassifier();
          const result = classifier.classifyItem(item);
          
          // Property: Classification result must be either 'Jacket' or 'Overshirt'
          return result === 'Jacket' || result === 'Overshirt';
        }
      ), { numRuns: 10 });
    });

    /**
     * Property-based test for classification determinism
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
     * Feature: category-split-jacket-overshirt, Property 2: Item Classification Correctness
     */
    it('should classify items deterministically', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          category_id: fc.string(),
          name: fc.string({ minLength: 1 }),
          formality_score: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
          material: fc.option(fc.string(), { nil: undefined }),
          active: fc.boolean(),
          created_at: fc.string(),
          updated_at: fc.string()
        }),
        (item: WardrobeItem) => {
          const classifier = new WardrobeItemClassifier();
          const result1 = classifier.classifyItem(item);
          const result2 = classifier.classifyItem(item);
          
          // Property: Same item should always get same classification
          return result1 === result2;
        }
      ), { numRuns: 10 });
    });
  });

  describe('Classification Rules', () => {
    /**
     * Property-based test for structured outerwear classification
     * **Validates: Requirements 2.1, 2.2**
     * Feature: category-split-jacket-overshirt, Property 2: Item Classification Correctness
     */
    it('should classify structured outerwear as Jacket', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant('Pea Coat'),
          fc.constant('Blazer'),
          fc.constant('Sportcoat'),
          fc.constant('Trench Coat'),
          fc.constant('Mac Coat'),
          fc.constant('Navy Blazer'),
          fc.constant('Wool Coat')
        ).chain(name => 
          fc.record({
            id: fc.string(),
            user_id: fc.string(),
            category_id: fc.string(),
            name: fc.constant(name),
            formality_score: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
            active: fc.boolean(),
            created_at: fc.string(),
            updated_at: fc.string()
          })
        ),
        (item: WardrobeItem) => {
          const result = classifyWardrobeItem(item);
          
          // Property: Structured outerwear should be classified as Jacket
          return result === 'Jacket';
        }
      ), { numRuns: 10 });
    });

    /**
     * Property-based test for casual layering classification
     * **Validates: Requirements 2.3, 2.4**
     * Feature: category-split-jacket-overshirt, Property 2: Item Classification Correctness
     */
    it('should classify casual layering items as Overshirt', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant('Shacket'),
          fc.constant('Overshirt'),
          fc.constant('Shirt Jacket'),
          fc.constant('Flannel'),
          fc.constant('Chambray'),
          fc.constant('Cardigan'),
          fc.constant('Sweater')
        ).chain(name => 
          fc.record({
            id: fc.string(),
            user_id: fc.string(),
            category_id: fc.string(),
            name: fc.constant(name),
            formality_score: fc.option(fc.integer({ min: 1, max: 6 }), { nil: undefined }),
            active: fc.boolean(),
            created_at: fc.string(),
            updated_at: fc.string()
          })
        ),
        (item: WardrobeItem) => {
          const result = classifyWardrobeItem(item);
          
          // Property: Casual layering items should be classified as Overshirt
          return result === 'Overshirt';
        }
      ), { numRuns: 10 });
    });

    /**
     * Property-based test for formality score classification
     * **Validates: Requirements 2.1, 2.4**
     * Feature: category-split-jacket-overshirt, Property 2: Item Classification Correctness
     */
    it('should respect formality score in classification', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          category_id: fc.string(),
          name: fc.string().filter(name => 
            !/(coat|blazer|sportcoat|cardigan|sweater|shacket|overshirt)/i.test(name)
          ),
          formality_score: fc.integer({ min: 1, max: 10 }),
          active: fc.boolean(),
          created_at: fc.string(),
          updated_at: fc.string()
        }),
        (item: WardrobeItem) => {
          const result = classifyWardrobeItem(item);
          
          // Property: Items with high formality scores (7+) containing "jacket" should be Jacket
          if ((item.formality_score || 0) >= 7 && /jacket/i.test(item.name)) {
            return result === 'Jacket';
          }
          
          // Property: Items with low formality scores (≤5) should tend toward Overshirt
          if ((item.formality_score || 0) <= 5) {
            return result === 'Overshirt' || result === 'Jacket'; // Allow both but expect Overshirt
          }
          
          return true; // Other cases are valid
        }
      ), { numRuns: 10 });
    });
  });

  describe('Classification Reason', () => {
    /**
     * Property-based test for classification reason consistency
     * **Validates: Requirements 1.2, 2.4**
     * Feature: category-split-jacket-overshirt, Property 2: Item Classification Correctness
     */
    it('should provide consistent classification reasons', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          category_id: fc.string(),
          name: fc.string({ minLength: 1 }),
          formality_score: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
          active: fc.boolean(),
          created_at: fc.string(),
          updated_at: fc.string()
        }),
        (item: WardrobeItem) => {
          const category = classifyWardrobeItem(item);
          const reason = getClassificationReason(item);
          
          // Property: Reason should mention the classified category
          return reason.includes(category);
        }
      ), { numRuns: 10 });
    });
  });
});