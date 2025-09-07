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

  describe('Edge Cases and Additional Scenarios', () => {
    describe('Layer-aware formality edge cases', () => {
      it('should handle zero formality scores', () => {
        const selection: OutfitSelection = {
          shirt: { ...mockItems.formalShirt, formalityScore: 0 },
          pants: { ...mockItems.formalPants, formalityScore: 0 },
          shoes: { ...mockItems.formalShoes, formalityScore: 0 }
        };

        const result = calculateLayerAwareFormalityScore(selection);
        expect(result.score).toBe(0);
        expect(result.adjustments).toHaveLength(3);
        result.adjustments.forEach(adj => {
          expect(adj.originalScore).toBe(0);
          expect(adj.adjustedScore).toBe(0);
        });
      });

      it('should handle maximum formality scores (10)', () => {
        const selection: OutfitSelection = {
          jacket: { ...mockItems.formalJacket, formalityScore: 10 },
          shirt: { ...mockItems.formalShirt, formalityScore: 10 },
          undershirt: { ...mockItems.undershirt, formalityScore: 10 },
          pants: { ...mockItems.formalPants, formalityScore: 10 },
          shoes: { ...mockItems.formalShoes, formalityScore: 10 },
          belt: { ...mockItems.formalBelt, formalityScore: 10 },
          watch: { ...mockItems.formalWatch, formalityScore: 10 }
        };

        const result = calculateLayerAwareFormalityScore(selection);
        expect(result.score).toBe(93); // Should be exactly 93% for perfect scores
        expect(result.adjustments).toHaveLength(7);
      });

      it('should handle single category selection', () => {
        const selection: OutfitSelection = {
          shirt: mockItems.formalShirt
        };

        const result = calculateLayerAwareFormalityScore(selection);
        expect(result.adjustments).toHaveLength(1);
        expect(result.adjustments[0].category).toBe('Shirt');
        expect(result.adjustments[0].weight).toBe(1.0);
        expect(result.adjustments[0].reason).toBe('visible');
      });

      it('should handle undershirt only selection', () => {
        const selection: OutfitSelection = {
          undershirt: mockItems.undershirt
        };

        const result = calculateLayerAwareFormalityScore(selection);
        expect(result.adjustments).toHaveLength(1);
        expect(result.adjustments[0].category).toBe('Undershirt');
        expect(result.adjustments[0].weight).toBe(1.0);
        expect(result.adjustments[0].reason).toBe('visible');
      });

      it('should handle jacket only selection', () => {
        const selection: OutfitSelection = {
          jacket: mockItems.formalJacket
        };

        const result = calculateLayerAwareFormalityScore(selection);
        expect(result.adjustments).toHaveLength(1);
        expect(result.adjustments[0].category).toBe('Jacket/Overshirt');
        expect(result.adjustments[0].weight).toBe(1.0);
        expect(result.adjustments[0].reason).toBe('visible');
      });

      it('should handle accessories only selection', () => {
        const selection: OutfitSelection = {
          belt: mockItems.formalBelt,
          watch: mockItems.formalWatch
        };

        const result = calculateLayerAwareFormalityScore(selection);
        expect(result.adjustments).toHaveLength(2);
        
        const beltAdj = result.adjustments.find(adj => adj.category === 'Belt');
        const watchAdj = result.adjustments.find(adj => adj.category === 'Watch');
        
        expect(beltAdj!.weight).toBe(0.8);
        expect(beltAdj!.reason).toBe('accessory');
        expect(watchAdj!.weight).toBe(0.8);
        expect(watchAdj!.reason).toBe('accessory');
      });

      it('should handle mixed formality scores with layering', () => {
        const selection: OutfitSelection = {
          jacket: { ...mockItems.formalJacket, formalityScore: 9 },     // 9 * 1.0 = 9
          shirt: { ...mockItems.formalShirt, formalityScore: 3 },       // 3 * 0.7 = 2.1
          undershirt: { ...mockItems.undershirt, formalityScore: 1 },   // 1 * 0.3 = 0.3
          pants: { ...mockItems.formalPants, formalityScore: 7 },       // 7 * 1.0 = 7
          shoes: { ...mockItems.formalShoes, formalityScore: 5 }        // 5 * 1.0 = 5
        };

        const result = calculateLayerAwareFormalityScore(selection);
        
        // Total weighted: 9 + 2.1 + 0.3 + 7 + 5 = 23.4
        // Total weight: 1.0 + 0.7 + 0.3 + 1.0 + 1.0 = 4.0
        // Average: 23.4 / 4.0 = 5.85
        // Percentage: (5.85 / 10) * 100 * 0.93 = 54.405, rounded = 54
        expect(result.score).toBe(54);
      });

      it('should handle undefined formality scores correctly', () => {
        const itemWithUndefinedScore = { 
          id: 'x1', 
          name: 'Undefined Score', 
          category: 'Shirt' as Category,
          formalityScore: undefined 
        } as WardrobeItem;
        
        const selection: OutfitSelection = {
          shirt: itemWithUndefinedScore,
          pants: mockItems.formalPants
        };

        const result = calculateLayerAwareFormalityScore(selection);
        
        // Should only process pants, ignore shirt with undefined score
        expect(result.adjustments).toHaveLength(1);
        expect(result.adjustments[0].category).toBe('Pants');
      });

      it('should handle fractional formality scores', () => {
        const selection: OutfitSelection = {
          shirt: { ...mockItems.formalShirt, formalityScore: 5.5 },
          pants: { ...mockItems.formalPants, formalityScore: 7.3 }
        };

        const result = calculateLayerAwareFormalityScore(selection);
        
        expect(result.adjustments).toHaveLength(2);
        expect(result.adjustments[0].originalScore).toBe(5.5);
        expect(result.adjustments[1].originalScore).toBe(7.3);
      });
    });

    describe('Consistency bonus edge cases', () => {
      it('should handle identical formality scores across many items', () => {
        const identicalScore = 6;
        const selection: OutfitSelection = {
          jacket: { ...mockItems.formalJacket, formalityScore: identicalScore },
          shirt: { ...mockItems.formalShirt, formalityScore: identicalScore },
          undershirt: { ...mockItems.undershirt, formalityScore: identicalScore },
          pants: { ...mockItems.formalPants, formalityScore: identicalScore },
          shoes: { ...mockItems.formalShoes, formalityScore: identicalScore },
          belt: { ...mockItems.formalBelt, formalityScore: identicalScore },
          watch: { ...mockItems.formalWatch, formalityScore: identicalScore }
        };

        const bonus = calculateConsistencyBonus(selection);
        expect(bonus).toBe(7); // Perfect consistency should give maximum bonus
      });

      it('should handle maximum variance scenario', () => {
        const selection: OutfitSelection = {
          jacket: { ...mockItems.formalJacket, formalityScore: 10 },
          shirt: { ...mockItems.formalShirt, formalityScore: 1 },
          pants: { ...mockItems.formalPants, formalityScore: 10 },
          shoes: { ...mockItems.formalShoes, formalityScore: 1 }
        };

        const bonus = calculateConsistencyBonus(selection);
        expect(bonus).toBeGreaterThanOrEqual(0);
        expect(bonus).toBeLessThan(7); // Should be significantly less than max
      });

      it('should handle fractional formality scores in consistency calculation', () => {
        const selection: OutfitSelection = {
          shirt: { ...mockItems.formalShirt, formalityScore: 5.5 },
          pants: { ...mockItems.formalPants, formalityScore: 5.5 }
        };

        const bonus = calculateConsistencyBonus(selection);
        expect(bonus).toBe(7); // Perfect consistency with fractional scores
      });

      it('should handle very small variance', () => {
        const selection: OutfitSelection = {
          shirt: { ...mockItems.formalShirt, formalityScore: 5.0 },
          pants: { ...mockItems.formalPants, formalityScore: 5.1 },
          shoes: { ...mockItems.formalShoes, formalityScore: 4.9 }
        };

        const bonus = calculateConsistencyBonus(selection);
        expect(bonus).toBeGreaterThan(6); // Very small variance should give high bonus
        expect(bonus).toBeLessThanOrEqual(7);
      });
    });

    describe('Complete outfit scoring edge cases', () => {
      it('should cap percentage at 100%', () => {
        // Create a scenario that might theoretically exceed 100%
        const selection: OutfitSelection = {
          jacket: { ...mockItems.formalJacket, formalityScore: 10 },
          shirt: { ...mockItems.formalShirt, formalityScore: 10 },
          pants: { ...mockItems.formalPants, formalityScore: 10 },
          shoes: { ...mockItems.formalShoes, formalityScore: 10 }
        };

        const breakdown = calculateOutfitScore(selection);
        expect(breakdown.percentage).toBeLessThanOrEqual(100);
      });

      it('should handle outfit with only accessories', () => {
        const selection: OutfitSelection = {
          belt: mockItems.formalBelt,
          watch: mockItems.formalWatch
        };

        const breakdown = calculateOutfitScore(selection);
        expect(breakdown.layerAdjustments).toHaveLength(2);
        expect(breakdown.formalityScore).toBeGreaterThan(0);
        expect(breakdown.consistencyBonus).toBe(7); // Perfect consistency with 2 items
      });

      it('should handle outfit with mixed categories and missing items', () => {
        const selection: OutfitSelection = {
          jacket: mockItems.formalJacket,
          // No shirt
          undershirt: mockItems.undershirt,
          pants: mockItems.formalPants,
          // No shoes
          belt: mockItems.formalBelt
          // No watch
        };

        const breakdown = calculateOutfitScore(selection);
        expect(breakdown.layerAdjustments).toHaveLength(4); // Only selected items
        expect(breakdown.formalityScore).toBeGreaterThan(0);
        expect(breakdown.consistencyBonus).toBeGreaterThanOrEqual(0);
      });

      it('should maintain score consistency across multiple calculations', () => {
        const selection: OutfitSelection = {
          shirt: mockItems.formalShirt,
          pants: mockItems.formalPants,
          shoes: mockItems.formalShoes,
          watch: mockItems.formalWatch
        };

        const breakdown1 = calculateOutfitScore(selection);
        const breakdown2 = calculateOutfitScore(selection);
        
        expect(breakdown1.percentage).toBe(breakdown2.percentage);
        expect(breakdown1.formalityScore).toBe(breakdown2.formalityScore);
        expect(breakdown1.consistencyBonus).toBe(breakdown2.consistencyBonus);
      });

      it('should handle extreme formality differences with layering', () => {
        const selection: OutfitSelection = {
          jacket: { ...mockItems.formalJacket, formalityScore: 10 },     // Formal jacket visible
          shirt: { ...mockItems.casualShirt, formalityScore: 1 },       // Casual shirt covered
          undershirt: { ...mockItems.formalUndershirt, formalityScore: 9 }, // Formal undershirt covered
          pants: { ...mockItems.casualPants, formalityScore: 2 },       // Casual pants visible
          shoes: { ...mockItems.formalShoes, formalityScore: 10 }       // Formal shoes visible
        };

        const breakdown = calculateOutfitScore(selection);
        
        // Verify layering affects the score appropriately
        const jacketAdj = breakdown.layerAdjustments.find(adj => adj.category === 'Jacket/Overshirt');
        const shirtAdj = breakdown.layerAdjustments.find(adj => adj.category === 'Shirt');
        const undershirtAdj = breakdown.layerAdjustments.find(adj => adj.category === 'Undershirt');
        
        expect(jacketAdj!.weight).toBe(1.0); // Visible
        expect(shirtAdj!.weight).toBe(0.7);  // Covered by jacket
        expect(undershirtAdj!.weight).toBe(0.3); // Covered by shirt
        
        expect(breakdown.formalityScore).toBeGreaterThan(0);
        expect(breakdown.consistencyBonus).toBeGreaterThanOrEqual(0);
      });
    });

    describe('LayerAdjustment tracking accuracy', () => {
      it('should track all required fields in LayerAdjustment', () => {
        const selection: OutfitSelection = {
          shirt: mockItems.formalShirt
        };

        const result = calculateLayerAwareFormalityScore(selection);
        const adjustment = result.adjustments[0];
        
        expect(adjustment).toHaveProperty('itemId');
        expect(adjustment).toHaveProperty('itemName');
        expect(adjustment).toHaveProperty('category');
        expect(adjustment).toHaveProperty('originalScore');
        expect(adjustment).toHaveProperty('adjustedScore');
        expect(adjustment).toHaveProperty('weight');
        expect(adjustment).toHaveProperty('reason');
        
        expect(typeof adjustment.itemId).toBe('string');
        expect(typeof adjustment.itemName).toBe('string');
        expect(typeof adjustment.category).toBe('string');
        expect(typeof adjustment.originalScore).toBe('number');
        expect(typeof adjustment.adjustedScore).toBe('number');
        expect(typeof adjustment.weight).toBe('number');
        expect(['covered', 'visible', 'accessory']).toContain(adjustment.reason);
      });

      it('should maintain adjustment order consistency', () => {
        const selection: OutfitSelection = {
          jacket: mockItems.formalJacket,
          shirt: mockItems.formalShirt,
          undershirt: mockItems.undershirt,
          pants: mockItems.formalPants,
          shoes: mockItems.formalShoes,
          belt: mockItems.formalBelt,
          watch: mockItems.formalWatch
        };

        const result1 = calculateLayerAwareFormalityScore(selection);
        const result2 = calculateLayerAwareFormalityScore(selection);
        
        expect(result1.adjustments).toHaveLength(result2.adjustments.length);
        
        // Adjustments should be in the same order
        for (let i = 0; i < result1.adjustments.length; i++) {
          expect(result1.adjustments[i].itemId).toBe(result2.adjustments[i].itemId);
          expect(result1.adjustments[i].category).toBe(result2.adjustments[i].category);
        }
      });

      it('should calculate adjusted scores correctly for all weight scenarios', () => {
        const selection: OutfitSelection = {
          jacket: { ...mockItems.formalJacket, formalityScore: 8 },     // 8 * 1.0 = 8
          shirt: { ...mockItems.formalShirt, formalityScore: 6 },       // 6 * 0.7 = 4.2
          undershirt: { ...mockItems.undershirt, formalityScore: 2 },   // 2 * 0.3 = 0.6
          pants: { ...mockItems.formalPants, formalityScore: 7 },       // 7 * 1.0 = 7
          shoes: { ...mockItems.formalShoes, formalityScore: 9 },       // 9 * 1.0 = 9
          belt: { ...mockItems.formalBelt, formalityScore: 5 },         // 5 * 0.8 = 4.0
          watch: { ...mockItems.formalWatch, formalityScore: 4 }        // 4 * 0.8 = 3.2
        };

        const result = calculateLayerAwareFormalityScore(selection);
        
        const adjustmentsByCategory = result.adjustments.reduce((acc, adj) => {
          acc[adj.category] = adj;
          return acc;
        }, {} as Record<string, LayerAdjustment>);
        
        expect(adjustmentsByCategory['Jacket/Overshirt'].adjustedScore).toBeCloseTo(8.0);
        expect(adjustmentsByCategory['Shirt'].adjustedScore).toBeCloseTo(4.2);
        expect(adjustmentsByCategory['Undershirt'].adjustedScore).toBeCloseTo(0.6);
        expect(adjustmentsByCategory['Pants'].adjustedScore).toBeCloseTo(7.0);
        expect(adjustmentsByCategory['Shoes'].adjustedScore).toBeCloseTo(9.0);
        expect(adjustmentsByCategory['Belt'].adjustedScore).toBeCloseTo(4.0);
        expect(adjustmentsByCategory['Watch'].adjustedScore).toBeCloseTo(3.2);
      });
    });
  });
});