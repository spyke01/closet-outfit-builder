import { describe, it, expect } from 'vitest';
import { generateWardrobeItems } from '../onboarding-generator';
import type { CategoryKey, StyleBaseline, SubcategoryColorSelection } from '@/lib/types/onboarding';

/**
 * Test suite for onboarding item generation
 * 
 * Tests critical business logic:
 * - Item generation from user selections
 * - Item naming conventions
 * - Formality score assignment
 * - Season tag determination
 * - Item cap enforcement
 * - Color normalization
 */

describe('generateWardrobeItems', () => {
  describe('Basic Item Generation', () => {
    it('should generate 1 item per selected color', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy', 'white', 'black'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items).toHaveLength(3);
      expect(items.map(i => i.color)).toEqual(['navy', 'white', 'black']);
    });

    it('should generate items for multiple subcategories', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt', 'Polo'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy', 'white'],
        },
        'Tops-Polo': {
          subcategory: 'Polo',
          colors: ['blue'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items).toHaveLength(3);
      expect(items.filter(i => i.subcategory === 'T-Shirt')).toHaveLength(2);
      expect(items.filter(i => i.subcategory === 'Polo')).toHaveLength(1);
    });

    it('should generate items for multiple categories', () => {
      const selectedCategories: CategoryKey[] = ['Tops', 'Bottoms'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
        Bottoms: ['Jeans'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy'],
        },
        'Bottoms-Jeans': {
          subcategory: 'Jeans',
          colors: ['blue'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items).toHaveLength(2);
      expect(items.find(i => i.category === 'Tops')).toBeDefined();
      expect(items.find(i => i.category === 'Bottoms')).toBeDefined();
    });
  });

  describe('Item Naming', () => {
    it('should generate names as "{Color} {Subcategory}"', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['Polo'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-Polo': {
          subcategory: 'Polo',
          colors: ['navy'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].name).toBe('Navy Polo');
    });

    it('should capitalize first letter of color in name', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['light-blue'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].name).toBe('Light-blue T-Shirt');
    });

    it('should use subcategory name only when color is empty', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: [''],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].name).toBe('T-Shirt');
    });
  });

  describe('Formality Scores', () => {
    it('should assign correct formality scores from subcategory definitions', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt', 'Polo', 'OCBD', 'Dress Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['white'],
        },
        'Tops-Polo': {
          subcategory: 'Polo',
          colors: ['navy'],
        },
        'Tops-OCBD': {
          subcategory: 'OCBD',
          colors: ['blue'],
        },
        'Tops-Dress Shirt': {
          subcategory: 'Dress Shirt',
          colors: ['white'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Work',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      const tshirt = items.find(i => i.subcategory === 'T-Shirt');
      const polo = items.find(i => i.subcategory === 'Polo');
      const ocbd = items.find(i => i.subcategory === 'OCBD');
      const dressShirt = items.find(i => i.subcategory === 'Dress Shirt');

      expect(tshirt?.formality_score).toBe(2);
      expect(polo?.formality_score).toBe(4);
      expect(ocbd?.formality_score).toBe(6);
      expect(dressShirt?.formality_score).toBe(8);
    });

    it('should ensure all formality scores are between 1 and 10', () => {
      const selectedCategories: CategoryKey[] = ['Tops', 'Bottoms', 'Shoes'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt', 'Dress Shirt'],
        Bottoms: ['Jeans', 'Trousers'],
        Shoes: ['Sneakers', 'Dress Shoes'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': { subcategory: 'T-Shirt', colors: ['white'] },
        'Tops-Dress Shirt': { subcategory: 'Dress Shirt', colors: ['white'] },
        'Bottoms-Jeans': { subcategory: 'Jeans', colors: ['blue'] },
        'Bottoms-Trousers': { subcategory: 'Trousers', colors: ['grey'] },
        'Shoes-Sneakers': { subcategory: 'Sneakers', colors: ['white'] },
        'Shoes-Dress Shoes': { subcategory: 'Dress Shoes', colors: ['black'] },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Mixed',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      items.forEach(item => {
        expect(item.formality_score).toBeGreaterThanOrEqual(1);
        expect(item.formality_score).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Season Tags', () => {
    it('should set seasons to Summer/Spring for Hot climate with All-season items', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'], // T-Shirt has seasons: ['All']
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['white'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Hot',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].season).toEqual(['Summer', 'Spring']);
    });

    it('should set seasons to Fall/Winter for Cold climate with All-season items', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['Polo'], // Polo has seasons: ['All']
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-Polo': {
          subcategory: 'Polo',
          colors: ['navy'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Cold',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].season).toEqual(['Fall', 'Winter']);
    });

    it('should set seasons to All for Mixed climate with All-season items', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['OCBD'], // OCBD has seasons: ['All']
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-OCBD': {
          subcategory: 'OCBD',
          colors: ['blue'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Work',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].season).toEqual(['All']);
    });

    it('should use subcategory default seasons for seasonal items', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['Tank Top', 'Sweater'], // Tank Top: Summer, Sweater: Fall/Winter
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-Tank Top': {
          subcategory: 'Tank Top',
          colors: ['white'],
        },
        'Tops-Sweater': {
          subcategory: 'Sweater',
          colors: ['grey'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      const tankTop = items.find(i => i.subcategory === 'Tank Top');
      const sweater = items.find(i => i.subcategory === 'Sweater');

      expect(tankTop?.season).toEqual(['Summer']);
      expect(sweater?.season).toEqual(['Fall', 'Winter']);
    });
  });

  describe('Item Cap', () => {
    it('should enforce item cap when enabled', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: Array(100).fill('navy').map((c, i) => `${c}-${i}`), // 100 colors
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        true,
        50
      );

      expect(items).toHaveLength(50);
    });

    it('should not enforce item cap when disabled', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy', 'white', 'black', 'grey', 'blue'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        3
      );

      expect(items).toHaveLength(5); // All 5 items generated despite cap of 3
    });

    it('should respect custom item cap values', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: Array(50).fill('navy').map((c, i) => `${c}-${i}`),
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        true,
        10
      );

      expect(items).toHaveLength(10);
    });
  });

  describe('Color Normalization', () => {
    it('should normalize colors to lowercase', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['NAVY', 'White', 'BLACK'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].color).toBe('navy');
      expect(items[1].color).toBe('white');
      expect(items[2].color).toBe('black');
    });

    it('should trim whitespace from colors', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['  navy  ', ' white ', 'black  '],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].color).toBe('navy');
      expect(items[1].color).toBe('white');
      expect(items[2].color).toBe('black');
    });
  });

  describe('Item Metadata', () => {
    it('should set source to "onboarding"', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items[0].source).toBe('onboarding');
    });

    it('should generate unique temporary IDs', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy', 'white', 'black'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      const ids = items.map(i => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set image_url to null or string', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      items.forEach(item => {
        expect(item.image_url === null || typeof item.image_url === 'string').toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when no categories selected', () => {
      const selectedCategories: CategoryKey[] = [];
      const selectedSubcategories: Record<CategoryKey, string[]> = {};
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {};
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items).toHaveLength(0);
    });

    it('should skip subcategories with no colors selected', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt', 'Polo'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy'],
        },
        'Tops-Polo': {
          subcategory: 'Polo',
          colors: [],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items).toHaveLength(1);
      expect(items[0].subcategory).toBe('T-Shirt');
    });

    it('should skip subcategories with no color selection entry', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt', 'Polo'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy'],
        },
        // No entry for Polo
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: 'Mixed',
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items).toHaveLength(1);
      expect(items[0].subcategory).toBe('T-Shirt');
    });

    it('should handle null climate gracefully', () => {
      const selectedCategories: CategoryKey[] = ['Tops'];
      const selectedSubcategories: Record<CategoryKey, string[]> = {
        Tops: ['T-Shirt'],
      };
      const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
        'Tops-T-Shirt': {
          subcategory: 'T-Shirt',
          colors: ['navy'],
        },
      };
      const styleBaseline: StyleBaseline = {
        primaryUse: 'Casual',
        climate: null,
      };

      const items = generateWardrobeItems(
        selectedCategories,
        selectedSubcategories,
        colorQuantitySelections,
        styleBaseline,
        false,
        50
      );

      expect(items).toHaveLength(1);
      expect(items[0].season).toEqual(['All']);
    });
  });
});
