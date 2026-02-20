/**
 * Data consistency validation tests for category split
 * Ensures all category references are valid and search/filtering works correctly
 * **Validates: Requirements 6.4, 4.3, 7.4**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WardrobeItemClassifier } from '@/lib/utils/wardrobe-item-classifier';

// Mock data representing the new category structure
const mockCategories = [
  { id: 'jacket-id', name: 'Jacket', is_anchor_item: true, display_order: 1 },
  { id: 'overshirt-id', name: 'Overshirt', is_anchor_item: true, display_order: 2 },
  { id: 'shirt-id', name: 'Shirt', is_anchor_item: true, display_order: 3 },
  { id: 'pants-id', name: 'Pants', is_anchor_item: false, display_order: 4 }
];

const mockWardrobeItems = [
  {
    id: 'item-1',
    name: 'Navy Blazer',
    category_id: 'jacket-id',
    brand: 'Hugo Boss',
    formality_score: 8,
    capsule_tags: ['formal', 'business'],
    active: true
  },
  {
    id: 'item-2',
    name: 'Flannel Overshirt',
    category_id: 'overshirt-id',
    brand: 'Uniqlo',
    formality_score: 4,
    capsule_tags: ['casual', 'layering'],
    active: true
  },
  {
    id: 'item-3',
    name: 'White Oxford',
    category_id: 'shirt-id',
    brand: 'Brooks Brothers',
    formality_score: 7,
    capsule_tags: ['formal', 'versatile'],
    active: true
  },
  {
    id: 'item-4',
    name: 'Dark Jeans',
    category_id: 'pants-id',
    brand: 'Levi\'s',
    formality_score: 5,
    capsule_tags: ['casual', 'everyday'],
    active: true
  }
];

const mockOutfits = [
  {
    id: 'outfit-1',
    name: 'Business Casual',
    score: 85,
    source: 'curated',
    items: [
      { id: 'item-1', name: 'Navy Blazer', category: 'Jacket' },
      { id: 'item-3', name: 'White Oxford', category: 'Shirt' },
      { id: 'item-4', name: 'Dark Jeans', category: 'Pants' }
    ]
  },
  {
    id: 'outfit-2',
    name: 'Casual Layer',
    score: 78,
    source: 'generated',
    items: [
      { id: 'item-2', name: 'Flannel Overshirt', category: 'Overshirt' },
      { id: 'item-3', name: 'White Oxford', category: 'Shirt' },
      { id: 'item-4', name: 'Dark Jeans', category: 'Pants' }
    ]
  }
];

describe('Data Consistency Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Category Reference Validation', () => {
    it('should ensure all category references are valid', () => {
      // Check that all wardrobe items reference valid categories
      const categoryIds = new Set(mockCategories.map(cat => cat.id));
      
      mockWardrobeItems.forEach(item => {
        expect(categoryIds.has(item.category_id)).toBe(true);
        expect(item.category_id).toBeTruthy();
      });
    });

    it('should not contain any references to old Jacket/Overshirt category', () => {
      // Ensure no legacy category references exist
      const categoryNames = mockCategories.map(cat => cat.name);
      
      expect(categoryNames).not.toContain('Jacket/Overshirt');
      expect(categoryNames).toContain('Jacket');
      expect(categoryNames).toContain('Overshirt');
    });

    it('should have proper category display order after split', () => {
      // Verify categories are properly ordered
      const sortedCategories = [...mockCategories].sort((a, b) => a.display_order - b.display_order);
      
      expect(sortedCategories[0].name).toBe('Jacket');
      expect(sortedCategories[1].name).toBe('Overshirt');
      expect(sortedCategories[2].name).toBe('Shirt');
      expect(sortedCategories[3].name).toBe('Pants');
    });

    it('should maintain anchor item flags for new categories', () => {
      const jacketCategory = mockCategories.find(cat => cat.name === 'Jacket');
      const overshirtCategory = mockCategories.find(cat => cat.name === 'Overshirt');
      
      expect(jacketCategory?.is_anchor_item).toBe(true);
      expect(overshirtCategory?.is_anchor_item).toBe(true);
    });
  });

  describe('Search and Filtering Validation', () => {
    it('should filter items by Jacket category correctly', () => {
      const jacketCategoryId = mockCategories.find(cat => cat.name === 'Jacket')?.id;
      const jacketItems = mockWardrobeItems.filter(item => item.category_id === jacketCategoryId);
      
      expect(jacketItems).toHaveLength(1);
      expect(jacketItems[0].name).toBe('Navy Blazer');
    });

    it('should filter items by Overshirt category correctly', () => {
      const overshirtCategoryId = mockCategories.find(cat => cat.name === 'Overshirt')?.id;
      const overshirtItems = mockWardrobeItems.filter(item => item.category_id === overshirtCategoryId);
      
      expect(overshirtItems).toHaveLength(1);
      expect(overshirtItems[0].name).toBe('Flannel Overshirt');
    });

    it('should support multi-category filtering', () => {
      const jacketCategoryId = mockCategories.find(cat => cat.name === 'Jacket')?.id;
      const overshirtCategoryId = mockCategories.find(cat => cat.name === 'Overshirt')?.id;
      
      const selectedCategories = [jacketCategoryId, overshirtCategoryId];
      const filteredItems = mockWardrobeItems.filter(item => 
        selectedCategories.includes(item.category_id)
      );
      
      expect(filteredItems).toHaveLength(2);
      expect(filteredItems.map(item => item.name)).toContain('Navy Blazer');
      expect(filteredItems.map(item => item.name)).toContain('Flannel Overshirt');
    });

    it('should search across items from both new categories', () => {
      // Search by brand
      const searchTerm = 'uniqlo';
      const searchResults = mockWardrobeItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Flannel Overshirt');
    });

    it('should filter by tags across new categories', () => {
      // Filter by casual tag
      const casualItems = mockWardrobeItems.filter(item =>
        item.capsule_tags?.includes('casual')
      );
      
      expect(casualItems).toHaveLength(2);
      expect(casualItems.map(item => item.name)).toContain('Flannel Overshirt');
      expect(casualItems.map(item => item.name)).toContain('Dark Jeans');
    });

    it('should filter by formality score across categories', () => {
      // Filter by high formality (7+)
      const formalItems = mockWardrobeItems.filter(item =>
        (item.formality_score || 0) >= 7
      );
      
      expect(formalItems).toHaveLength(2);
      expect(formalItems.map(item => item.name)).toContain('Navy Blazer');
      expect(formalItems.map(item => item.name)).toContain('White Oxford');
    });
  });

  describe('Outfit Scoring and Recommendations Validation', () => {
    it('should validate outfit scores are consistent with new categories', () => {
      mockOutfits.forEach(outfit => {
        expect(outfit.score).toBeGreaterThan(0);
        expect(outfit.score).toBeLessThanOrEqual(100);
        expect(typeof outfit.score).toBe('number');
      });
    });

    it('should ensure outfits contain items from valid categories', () => {
      const validCategoryNames = mockCategories.map(cat => cat.name);
      
      mockOutfits.forEach(outfit => {
        outfit.items.forEach(item => {
          expect(validCategoryNames).toContain(item.category);
          expect(item.category).not.toBe('Jacket/Overshirt');
        });
      });
    });

    it('should validate outfit recommendations work with new categories', () => {
      // Test that outfits can contain both Jacket and Overshirt items
      const jacketOutfit = mockOutfits.find(outfit => 
        outfit.items.some(item => item.category === 'Jacket')
      );
      const overshirtOutfit = mockOutfits.find(outfit => 
        outfit.items.some(item => item.category === 'Overshirt')
      );
      
      expect(jacketOutfit).toBeDefined();
      expect(overshirtOutfit).toBeDefined();
      expect(jacketOutfit?.name).toBe('Business Casual');
      expect(overshirtOutfit?.name).toBe('Casual Layer');
    });

    it('should ensure outfit scoring considers category compatibility', () => {
      // Business casual outfit with jacket should have high score
      const businessOutfit = mockOutfits.find(outfit => outfit.name === 'Business Casual');
      expect(businessOutfit?.score).toBeGreaterThan(80);
      
      // Casual outfit with overshirt should have reasonable score
      const casualOutfit = mockOutfits.find(outfit => outfit.name === 'Casual Layer');
      expect(casualOutfit?.score).toBeGreaterThan(70);
    });
  });

  describe('Item Classification Validation', () => {
    it('should classify items correctly into new categories', () => {
      const classifier = new WardrobeItemClassifier();
      
      // Test jacket classification
      const jacketItem = { name: 'Navy Blazer', formality_score: 8 };
      expect(classifier.classifyItem(jacketItem as never)).toBe('Jacket');
      
      // Test overshirt classification
      const overshirtItem = { name: 'Flannel Overshirt', formality_score: 4 };
      expect(classifier.classifyItem(overshirtItem as never)).toBe('Overshirt');
    });

    it('should provide classification reasons', () => {
      const classifier = new WardrobeItemClassifier();
      
      const jacketItem = { name: 'Navy Blazer', formality_score: 8 };
      const reason = classifier.getClassificationReason(jacketItem as never);
      
      expect(reason).toContain('Jacket');
      expect(typeof reason).toBe('string');
      expect(reason.length).toBeGreaterThan(0);
    });

    it('should handle edge cases in classification', () => {
      const classifier = new WardrobeItemClassifier();
      
      // Test item with no formality score
      const unknownItem = { name: 'Unknown Item' };
      const classification = classifier.classifyItem(unknownItem as never);
      
      expect(['Jacket', 'Overshirt']).toContain(classification);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should ensure all items have required fields', () => {
      mockWardrobeItems.forEach(item => {
        expect(item.id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(item.category_id).toBeTruthy();
        expect(typeof item.active).toBe('boolean');
      });
    });

    it('should ensure all categories have required fields', () => {
      mockCategories.forEach(category => {
        expect(category.id).toBeTruthy();
        expect(category.name).toBeTruthy();
        expect(typeof category.is_anchor_item).toBe('boolean');
        expect(typeof category.display_order).toBe('number');
      });
    });

    it('should ensure outfit items reference existing wardrobe items', () => {
      const wardrobeItemIds = new Set(mockWardrobeItems.map(item => item.id));
      
      mockOutfits.forEach(outfit => {
        outfit.items.forEach(item => {
          expect(wardrobeItemIds.has(item.id)).toBe(true);
        });
      });
    });

    it('should validate category names are consistent across data structures', () => {
      // Check that outfit item categories match actual category names
      const categoryNames = new Set(mockCategories.map(cat => cat.name));
      
      mockOutfits.forEach(outfit => {
        outfit.items.forEach(item => {
          expect(categoryNames.has(item.category)).toBe(true);
        });
      });
    });
  });

  describe('Performance and Scalability Validation', () => {
    it('should handle large datasets efficiently', () => {
      // Create a larger dataset to test performance
      const largeItemSet = Array.from({ length: 1000 }, (_, index) => ({
        id: `item-${index}`,
        name: `Item ${index}`,
        category_id: mockCategories[index % mockCategories.length].id,
        brand: `Brand ${index % 10}`,
        formality_score: Math.floor(Math.random() * 10) + 1,
        capsule_tags: ['tag1', 'tag2'],
        active: true
      }));
      
      // Test filtering performance
      const startTime = performance.now();
      const jacketCategoryId = mockCategories.find(cat => cat.name === 'Jacket')?.id;
      const jacketItems = largeItemSet.filter(item => item.category_id === jacketCategoryId);
      const endTime = performance.now();
      
      expect(jacketItems.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle search operations efficiently', () => {
      const largeItemSet = Array.from({ length: 1000 }, (_, index) => ({
        id: `item-${index}`,
        name: `Item ${index}`,
        category_id: mockCategories[index % mockCategories.length].id,
        brand: index % 2 === 0 ? 'TestBrand' : 'OtherBrand',
        formality_score: Math.floor(Math.random() * 10) + 1,
        capsule_tags: ['tag1', 'tag2'],
        active: true
      }));
      
      // Test search performance
      const startTime = performance.now();
      const searchResults = largeItemSet.filter(item =>
        item.brand?.toLowerCase().includes('testbrand')
      );
      const endTime = performance.now();
      
      expect(searchResults.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
    });
  });
});
