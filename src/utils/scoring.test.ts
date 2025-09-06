import { describe, it, expect } from 'vitest';
import { 
  calculateOutfitScore, 
  calculateFormalityScore, 
  calculateConsistencyBonus,
  calculateLayerAwareFormalityScore,
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
    
    undershirt: { id: 'u1', name: 'Basic Undershirt', category: 'Undershirt', formalityScore: 1 } as WardrobeItem,
    formalUndershirt: { id: 'u2', name: 'Formal Undershirt', category: 'Undershirt', formalityScore: 3 } as WardrobeItem,
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

  describe('calculateLayerAwareFormalityScore', () => {
    it('should apply full weight to visible undershirt when no shirt or jacket', () => {
      const selection: OutfitSelection = {
        undershirt: mockItems.undershirt, // 1 formality, should get full weight (1.0)
        pants: mockItems.formalPants,     // 8 formality
        shoes: mockItems.formalShoes      // 9 formality
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Should have 3 adjustments
      expect(result.adjustments).toHaveLength(3);
      
      // Find undershirt adjustment
      const undershirtAdj = result.adjustments.find(adj => adj.category === 'Undershirt');
      expect(undershirtAdj).toBeDefined();
      expect(undershirtAdj!.weight).toBe(1.0);
      expect(undershirtAdj!.reason).toBe('visible');
      expect(undershirtAdj!.originalScore).toBe(1);
      expect(undershirtAdj!.adjustedScore).toBe(1);
    });

    it('should apply reduced weight (0.3x) to covered undershirt when shirt is present', () => {
      const selection: OutfitSelection = {
        shirt: mockItems.formalShirt,     // 7 formality
        undershirt: mockItems.undershirt, // 1 formality, should get 0.3 weight
        pants: mockItems.formalPants,     // 8 formality
        shoes: mockItems.formalShoes      // 9 formality
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Find undershirt adjustment
      const undershirtAdj = result.adjustments.find(adj => adj.category === 'Undershirt');
      expect(undershirtAdj).toBeDefined();
      expect(undershirtAdj!.weight).toBe(0.3);
      expect(undershirtAdj!.reason).toBe('covered');
      expect(undershirtAdj!.originalScore).toBe(1);
      expect(undershirtAdj!.adjustedScore).toBe(0.3);
    });

    it('should apply reduced weight (0.3x) to covered undershirt when jacket is present', () => {
      const selection: OutfitSelection = {
        jacket: mockItems.formalJacket,   // 8 formality
        undershirt: mockItems.undershirt, // 1 formality, should get 0.3 weight
        pants: mockItems.formalPants,     // 8 formality
        shoes: mockItems.formalShoes      // 9 formality
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Find undershirt adjustment
      const undershirtAdj = result.adjustments.find(adj => adj.category === 'Undershirt');
      expect(undershirtAdj).toBeDefined();
      expect(undershirtAdj!.weight).toBe(0.3);
      expect(undershirtAdj!.reason).toBe('covered');
    });

    it('should apply reduced weight (0.7x) to covered shirt when jacket is present', () => {
      const selection: OutfitSelection = {
        jacket: mockItems.formalJacket,   // 8 formality
        shirt: mockItems.formalShirt,     // 7 formality, should get 0.7 weight
        pants: mockItems.formalPants,     // 8 formality
        shoes: mockItems.formalShoes      // 9 formality
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Find shirt adjustment
      const shirtAdj = result.adjustments.find(adj => adj.category === 'Shirt');
      expect(shirtAdj).toBeDefined();
      expect(shirtAdj!.weight).toBe(0.7);
      expect(shirtAdj!.reason).toBe('covered');
      expect(shirtAdj!.originalScore).toBe(7);
      expect(shirtAdj!.adjustedScore).toBeCloseTo(4.9); // 7 * 0.7
    });

    it('should apply full weight to visible shirt when no jacket', () => {
      const selection: OutfitSelection = {
        shirt: mockItems.formalShirt,     // 7 formality, should get full weight
        pants: mockItems.formalPants,     // 8 formality
        shoes: mockItems.formalShoes      // 9 formality
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Find shirt adjustment
      const shirtAdj = result.adjustments.find(adj => adj.category === 'Shirt');
      expect(shirtAdj).toBeDefined();
      expect(shirtAdj!.weight).toBe(1.0);
      expect(shirtAdj!.reason).toBe('visible');
    });

    it('should apply accessory weight (0.8x) to belt and watch', () => {
      const selection: OutfitSelection = {
        shirt: mockItems.formalShirt,     // 7 formality
        pants: mockItems.formalPants,     // 8 formality
        shoes: mockItems.formalShoes,     // 9 formality
        belt: mockItems.formalBelt,       // 7 formality, should get 0.8 weight
        watch: mockItems.formalWatch      // 8 formality, should get 0.8 weight
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Find belt and watch adjustments
      const beltAdj = result.adjustments.find(adj => adj.category === 'Belt');
      const watchAdj = result.adjustments.find(adj => adj.category === 'Watch');
      
      expect(beltAdj).toBeDefined();
      expect(beltAdj!.weight).toBe(0.8);
      expect(beltAdj!.reason).toBe('accessory');
      expect(beltAdj!.adjustedScore).toBeCloseTo(5.6); // 7 * 0.8
      
      expect(watchAdj).toBeDefined();
      expect(watchAdj!.weight).toBe(0.8);
      expect(watchAdj!.reason).toBe('accessory');
      expect(watchAdj!.adjustedScore).toBeCloseTo(6.4); // 8 * 0.8
    });

    it('should handle complex layering scenario with all items', () => {
      const selection: OutfitSelection = {
        jacket: mockItems.formalJacket,     // 8 formality, visible (1.0x)
        shirt: mockItems.formalShirt,       // 7 formality, covered by jacket (0.7x)
        undershirt: mockItems.undershirt,   // 1 formality, covered by shirt (0.3x)
        pants: mockItems.formalPants,       // 8 formality, visible (1.0x)
        shoes: mockItems.formalShoes,       // 9 formality, visible (1.0x)
        belt: mockItems.formalBelt,         // 7 formality, accessory (0.8x)
        watch: mockItems.formalWatch        // 8 formality, accessory (0.8x)
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Should have 7 adjustments (one for each item)
      expect(result.adjustments).toHaveLength(7);
      
      // Verify each layer's weight
      const jacketAdj = result.adjustments.find(adj => adj.category === 'Jacket/Overshirt');
      const shirtAdj = result.adjustments.find(adj => adj.category === 'Shirt');
      const undershirtAdj = result.adjustments.find(adj => adj.category === 'Undershirt');
      const pantsAdj = result.adjustments.find(adj => adj.category === 'Pants');
      const shoesAdj = result.adjustments.find(adj => adj.category === 'Shoes');
      const beltAdj = result.adjustments.find(adj => adj.category === 'Belt');
      const watchAdj = result.adjustments.find(adj => adj.category === 'Watch');
      
      expect(jacketAdj!.weight).toBe(1.0);
      expect(jacketAdj!.reason).toBe('visible');
      
      expect(shirtAdj!.weight).toBe(0.7);
      expect(shirtAdj!.reason).toBe('covered');
      
      expect(undershirtAdj!.weight).toBe(0.3);
      expect(undershirtAdj!.reason).toBe('covered');
      
      expect(pantsAdj!.weight).toBe(1.0);
      expect(pantsAdj!.reason).toBe('visible');
      
      expect(shoesAdj!.weight).toBe(1.0);
      expect(shoesAdj!.reason).toBe('visible');
      
      expect(beltAdj!.weight).toBe(0.8);
      expect(beltAdj!.reason).toBe('accessory');
      
      expect(watchAdj!.weight).toBe(0.8);
      expect(watchAdj!.reason).toBe('accessory');
    });

    it('should calculate correct weighted average score', () => {
      const selection: OutfitSelection = {
        jacket: { ...mockItems.formalJacket, formalityScore: 10 },   // 10 * 1.0 = 10
        shirt: { ...mockItems.formalShirt, formalityScore: 8 },      // 8 * 0.7 = 5.6
        undershirt: { ...mockItems.undershirt, formalityScore: 2 },  // 2 * 0.3 = 0.6
        pants: { ...mockItems.formalPants, formalityScore: 6 }       // 6 * 1.0 = 6
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Total weighted score: 10 + 5.6 + 0.6 + 6 = 22.2
      // Total weight: 1.0 + 0.7 + 0.3 + 1.0 = 3.0
      // Average: 22.2 / 3.0 = 7.4
      // Percentage: (7.4 / 10) * 100 * 0.93 = 68.82, rounded = 69
      expect(result.score).toBe(69);
    });

    it('should handle empty selection', () => {
      const selection: OutfitSelection = {};
      const result = calculateLayerAwareFormalityScore(selection);
      
      expect(result.score).toBe(0);
      expect(result.adjustments).toHaveLength(0);
    });

    it('should handle items without formality scores', () => {
      const itemWithoutScore = { id: 'x1', name: 'No Score', category: 'Shirt' } as WardrobeItem;
      const selection: OutfitSelection = {
        shirt: itemWithoutScore,
        pants: mockItems.formalPants
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      // Should only have adjustment for pants
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].category).toBe('Pants');
    });

    it('should track all adjustment details correctly', () => {
      const selection: OutfitSelection = {
        shirt: mockItems.formalShirt,     // 7 formality
        undershirt: mockItems.undershirt  // 1 formality, covered
      };

      const result = calculateLayerAwareFormalityScore(selection);
      
      const undershirtAdj = result.adjustments.find(adj => adj.category === 'Undershirt');
      expect(undershirtAdj).toEqual({
        itemId: 'u1',
        itemName: 'Basic Undershirt',
        category: 'Undershirt',
        originalScore: 1,
        adjustedScore: 0.3,
        weight: 0.3,
        reason: 'covered'
      });
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
      
      expect(breakdown.formalityScore).toBe(74); // Layer-aware formality with accessory weights
      expect(breakdown.formalityWeight).toBe(0.93);
      expect(breakdown.consistencyBonus).toBeGreaterThan(0);
      expect(breakdown.consistencyWeight).toBe(0.07);
      expect(breakdown.layerAdjustments).toHaveLength(6); // All 6 items should have adjustments
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