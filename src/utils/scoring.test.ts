import { describe, it, expect } from 'vitest';
import { 
  calculateOutfitScore, 
  calculateFormalityScore, 
  calculateConsistencyBonus,
  FORMALITY_WEIGHT,
  CONSISTENCY_WEIGHT
} from './scoring';
import { OutfitSelection, WardrobeItem } from '../types';

describe('Scoring System', () => {
  const mockItems = {
    formalJacket: { id: 'j1', name: 'Formal Jacket', category: 'Jacket/Overshirt', formalityScore: 8 } as WardrobeItem,
    formalShirt: { id: 's1', name: 'Formal Shirt', category: 'Shirt', formalityScore: 7 } as WardrobeItem,
    formalPants: { id: 'p1', name: 'Formal Pants', category: 'Pants', formalityScore: 8 } as WardrobeItem,
    formalShoes: { id: 'sh1', name: 'Formal Shoes', category: 'Shoes', formalityScore: 9 } as WardrobeItem,
    formalBelt: { id: 'b1', name: 'Formal Belt', category: 'Belt', formalityScore: 7 } as WardrobeItem,
    formalWatch: { id: 'w1', name: 'Formal Watch', category: 'Watch', formalityScore: 8 } as WardrobeItem,
    
    casualShirt: { id: 's2', name: 'Casual Shirt', category: 'Shirt', formalityScore: 2 } as WardrobeItem,
    casualPants: { id: 'p2', name: 'Casual Pants', category: 'Pants', formalityScore: 3 } as WardrobeItem,
    casualShoes: { id: 'sh2', name: 'Casual Shoes', category: 'Shoes', formalityScore: 1 } as WardrobeItem,
  };

  describe('calculateFormalityScore', () => {
    it('should calculate 93% of formality percentage for all items', () => {
      const selection: OutfitSelection = {
        jacket: mockItems.formalJacket,    // 8
        shirt: mockItems.formalShirt,      // 7
        pants: mockItems.formalPants,      // 8
        shoes: mockItems.formalShoes,      // 9
        belt: mockItems.formalBelt,        // 7
        watch: mockItems.formalWatch       // 8
      };

      const score = calculateFormalityScore(selection);
      // Total: 47, Max possible: 60 (6 items × 10), Percentage: 78.33%, 93% of that: ~73%
      expect(score).toBe(73);
    });

    it('should handle missing optional items (jacket and belt)', () => {
      const selection: OutfitSelection = {
        shirt: mockItems.formalShirt,      // 7
        pants: mockItems.formalPants,      // 8
        shoes: mockItems.formalShoes,      // 9
        watch: mockItems.formalWatch       // 8
      };

      const score = calculateFormalityScore(selection);
      // Total: 32, Max possible: 40 (4 items × 10), Percentage: 80%, 93% of that: ~74%
      expect(score).toBe(74);
    });

    it('should return 93% for perfect formality scores', () => {
      const perfectItems = {
        shirt: { ...mockItems.formalShirt, formalityScore: 10 },
        pants: { ...mockItems.formalPants, formalityScore: 10 },
        shoes: { ...mockItems.formalShoes, formalityScore: 10 },
        watch: { ...mockItems.formalWatch, formalityScore: 10 }
      };
      
      const selection: OutfitSelection = perfectItems;
      const score = calculateFormalityScore(selection);
      // Total: 40, Max possible: 40, Percentage: 100%, 93% of that: 93%
      expect(score).toBe(93);
    });

    it('should handle items without formality scores', () => {
      const itemWithoutScore = { id: 'x1', name: 'No Score', category: 'Shirt' } as WardrobeItem;
      const selection: OutfitSelection = {
        shirt: itemWithoutScore,
        pants: mockItems.formalPants
      };

      const score = calculateFormalityScore(selection);
      // Only pants: 8, Max possible: 10, Percentage: 80%, 93% of that: ~74%
      expect(score).toBe(74);
    });

    it('should return 0 for empty selection', () => {
      const selection: OutfitSelection = {};
      const score = calculateFormalityScore(selection);
      expect(score).toBe(0);
    });
  });

  describe('calculateConsistencyBonus', () => {
    it('should give maximum 7% bonus for perfectly consistent items', () => {
      const selection: OutfitSelection = {
        jacket: { ...mockItems.formalJacket, formalityScore: 5 },
        shirt: { ...mockItems.formalShirt, formalityScore: 5 },
        pants: { ...mockItems.formalPants, formalityScore: 5 },
        shoes: { ...mockItems.formalShoes, formalityScore: 5 }
      };

      const bonus = calculateConsistencyBonus(selection);
      expect(bonus).toBe(7); // 7% maximum consistency bonus
    });

    it('should give lower bonus for inconsistent items', () => {
      const selection: OutfitSelection = {
        jacket: { ...mockItems.formalJacket, formalityScore: 1 },
        shirt: { ...mockItems.formalShirt, formalityScore: 10 },
        pants: { ...mockItems.formalPants, formalityScore: 1 },
        shoes: { ...mockItems.formalShoes, formalityScore: 10 }
      };

      const bonus = calculateConsistencyBonus(selection);
      expect(bonus).toBeLessThan(7);
      expect(bonus).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for less than 2 items', () => {
      const selection: OutfitSelection = {
        shirt: mockItems.formalShirt
      };

      const bonus = calculateConsistencyBonus(selection);
      expect(bonus).toBe(0);
    });

    it('should work with 2 items', () => {
      const selection: OutfitSelection = {
        shirt: { ...mockItems.formalShirt, formalityScore: 5 },
        pants: { ...mockItems.formalPants, formalityScore: 5 }
      };

      const bonus = calculateConsistencyBonus(selection);
      expect(bonus).toBe(7); // Perfect consistency with 2 items
    });

    it('should ignore items without formality scores', () => {
      const itemWithoutScore = { id: 'x1', name: 'No Score', category: 'Shirt' } as WardrobeItem;
      const selection: OutfitSelection = {
        jacket: itemWithoutScore,
        shirt: { ...mockItems.formalShirt, formalityScore: 5 },
        pants: { ...mockItems.formalPants, formalityScore: 5 },
        shoes: { ...mockItems.formalShoes, formalityScore: 5 }
      };

      const bonus = calculateConsistencyBonus(selection);
      expect(bonus).toBe(7); // Should still get max bonus from 3 consistent items
    });
  });



  describe('calculateOutfitScore', () => {
    it('should calculate complete score breakdown with 93% formality + 7% consistency', () => {
      const selection: OutfitSelection = {
        jacket: mockItems.formalJacket,    // 8
        shirt: mockItems.formalShirt,      // 7
        pants: mockItems.formalPants,      // 8
        shoes: mockItems.formalShoes,      // 9
        belt: mockItems.formalBelt,        // 7
        watch: mockItems.formalWatch       // 8
      };

      const breakdown = calculateOutfitScore(selection);
      
      expect(breakdown.formalityScore).toBe(73); // 93% of formality
      expect(breakdown.consistencyBonus).toBeGreaterThan(0);
      expect(breakdown.total).toBe(breakdown.formalityScore + breakdown.consistencyBonus);
      expect(breakdown.percentage).toBe(breakdown.total);
    });

    it('should handle perfect scores (2 items with 10 formality each)', () => {
      const selection: OutfitSelection = {
        shirt: { ...mockItems.formalShirt, formalityScore: 10 },
        pants: { ...mockItems.formalPants, formalityScore: 10 }
      };

      const breakdown = calculateOutfitScore(selection);
      
      expect(breakdown.formalityScore).toBe(93); // 93% for perfect formality
      expect(breakdown.consistencyBonus).toBe(7); // 7% for perfect consistency
      expect(breakdown.total).toBe(100);
      expect(breakdown.percentage).toBe(100);
    });

    it('should handle perfect scores (6 items with 10 formality each)', () => {
      const maxItems = {
        jacket: { ...mockItems.formalJacket, formalityScore: 10 },
        shirt: { ...mockItems.formalShirt, formalityScore: 10 },
        pants: { ...mockItems.formalPants, formalityScore: 10 },
        shoes: { ...mockItems.formalShoes, formalityScore: 10 },
        belt: { ...mockItems.formalBelt, formalityScore: 10 },
        watch: { ...mockItems.formalWatch, formalityScore: 10 }
      };

      const breakdown = calculateOutfitScore(maxItems);
      
      expect(breakdown.formalityScore).toBe(93); // 93% for perfect formality
      expect(breakdown.consistencyBonus).toBe(7); // 7% for perfect consistency
      expect(breakdown.total).toBe(100);
      expect(breakdown.percentage).toBe(100);
    });

    it('should handle casual outfit', () => {
      const selection: OutfitSelection = {
        shirt: mockItems.casualShirt,      // 2
        pants: mockItems.casualPants,      // 3
        shoes: mockItems.casualShoes       // 1
      };

      const breakdown = calculateOutfitScore(selection);
      
      // Total: 6, Max possible: 30, Percentage: 20%, 93% of that: ~19%
      expect(breakdown.formalityScore).toBe(19);
      expect(breakdown.consistencyBonus).toBe(7); // Perfect consistency for low scores
      expect(breakdown.total).toBe(26);
      expect(breakdown.percentage).toBe(26);
    });

    it('should handle empty selection', () => {
      const breakdown = calculateOutfitScore({});
      
      expect(breakdown.formalityScore).toBe(0);
      expect(breakdown.consistencyBonus).toBe(0);
      expect(breakdown.total).toBe(0);
      expect(breakdown.percentage).toBe(0);
    });

    it('should handle missing optional items (jacket and belt)', () => {
      const selection: OutfitSelection = {
        shirt: { ...mockItems.formalShirt, formalityScore: 10 },
        pants: { ...mockItems.formalPants, formalityScore: 10 },
        shoes: { ...mockItems.formalShoes, formalityScore: 10 },
        watch: { ...mockItems.formalWatch, formalityScore: 10 }
      };

      const breakdown = calculateOutfitScore(selection);
      
      expect(breakdown.formalityScore).toBe(93); // 93% for perfect formality
      expect(breakdown.consistencyBonus).toBe(7); // 7% for perfect consistency
      expect(breakdown.total).toBe(100);
      expect(breakdown.percentage).toBe(100);
    });
  });

  describe('Constants', () => {
    it('should have correct weight values', () => {
      expect(FORMALITY_WEIGHT).toBe(0.93); // 93% of total score
      expect(CONSISTENCY_WEIGHT).toBe(0.07); // 7% of total score
      expect(FORMALITY_WEIGHT + CONSISTENCY_WEIGHT).toBe(1.0); // Should sum to 100%
    });
  });
});