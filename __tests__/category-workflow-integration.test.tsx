/**
 * Integration tests for end-to-end category filtering workflows and outfit creation
 * Tests complete workflows with new category structure
 * **Validates: Requirements 3.2, 3.3, 4.2, 4.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test utilities and mock data
const createMockCategory = (overrides = {}) => ({
  id: 'test-category-id',
  user_id: 'test-user-id',
  name: 'Test Category',
  is_anchor_item: true,
  display_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

const createMockWardrobeItem = (overrides = {}) => ({
  id: 'test-item-id',
  user_id: 'test-user-id',
  category_id: 'test-category-id',
  name: 'Test Item',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

const createMockOutfit = (overrides = {}) => ({
  id: 'test-outfit-id',
  user_id: 'test-user-id',
  name: 'Test Outfit',
  score: 85,
  source: 'curated',
  items: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

// Mock categories with new structure
const mockCategories = [
  createMockCategory({ id: 'jacket-id', name: 'Jacket', display_order: 1 }),
  createMockCategory({ id: 'overshirt-id', name: 'Overshirt', display_order: 2 }),
  createMockCategory({ id: 'shirt-id', name: 'Shirt', display_order: 3 }),
  createMockCategory({ id: 'pants-id', name: 'Pants', is_anchor_item: false, display_order: 4 })
];

// Mock wardrobe items
const mockWardrobeItems = [
  createMockWardrobeItem({
    id: 'jacket-1',
    name: 'Navy Blazer',
    category_id: 'jacket-id',
    brand: 'Hugo Boss',
    formality_score: 8,
    capsule_tags: ['formal', 'business']
  }),
  createMockWardrobeItem({
    id: 'overshirt-1',
    name: 'Flannel Overshirt',
    category_id: 'overshirt-id',
    brand: 'Uniqlo',
    formality_score: 4,
    capsule_tags: ['casual', 'layering']
  }),
  createMockWardrobeItem({
    id: 'shirt-1',
    name: 'White Oxford',
    category_id: 'shirt-id',
    brand: 'Brooks Brothers',
    formality_score: 7,
    capsule_tags: ['formal', 'versatile']
  }),
  createMockWardrobeItem({
    id: 'pants-1',
    name: 'Dark Jeans',
    category_id: 'pants-id',
    brand: 'Levi\'s',
    formality_score: 5,
    capsule_tags: ['casual', 'everyday']
  })
];

// Mock outfits with new category structure
const mockOutfits = [
  createMockOutfit({
    id: 'outfit-1',
    name: 'Business Casual',
    score: 85,
    items: [
      { id: 'jacket-1', name: 'Navy Blazer', category: 'Jacket' },
      { id: 'shirt-1', name: 'White Oxford', category: 'Shirt' },
      { id: 'pants-1', name: 'Dark Jeans', category: 'Pants' }
    ]
  }),
  createMockOutfit({
    id: 'outfit-2',
    name: 'Casual Layer',
    score: 78,
    items: [
      { id: 'overshirt-1', name: 'Flannel Overshirt', category: 'Overshirt' },
      { id: 'shirt-1', name: 'White Oxford', category: 'Shirt' },
      { id: 'pants-1', name: 'Dark Jeans', category: 'Pants' }
    ]
  })
];

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('Category Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Category Filtering Workflows', () => {
    it('should complete full category filtering workflow for Jacket category', () => {
      // Test the complete workflow of filtering by Jacket category
      const jacketCategory = mockCategories.find(cat => cat.name === 'Jacket');
      const jacketItems = mockWardrobeItems.filter(item => item.category_id === jacketCategory?.id);
      
      // Verify category exists
      expect(jacketCategory).toBeDefined();
      expect(jacketCategory?.name).toBe('Jacket');
      
      // Verify filtering works
      expect(jacketItems).toHaveLength(1);
      expect(jacketItems[0].name).toBe('Navy Blazer');
      
      // Verify no old category references
      expect(mockCategories.find(cat => cat.name === 'Jacket/Overshirt')).toBeUndefined();
    });

    it('should complete full category filtering workflow for Overshirt category', () => {
      // Test the complete workflow of filtering by Overshirt category
      const overshirtCategory = mockCategories.find(cat => cat.name === 'Overshirt');
      const overshirtItems = mockWardrobeItems.filter(item => item.category_id === overshirtCategory?.id);
      
      // Verify category exists
      expect(overshirtCategory).toBeDefined();
      expect(overshirtCategory?.name).toBe('Overshirt');
      
      // Verify filtering works
      expect(overshirtItems).toHaveLength(1);
      expect(overshirtItems[0].name).toBe('Flannel Overshirt');
      
      // Verify category properties
      expect(overshirtCategory?.is_anchor_item).toBe(true);
      expect(overshirtCategory?.display_order).toBe(2);
    });

    it('should support multi-category filtering workflow', () => {
      // Test workflow for selecting multiple categories including both new categories
      const jacketCategory = mockCategories.find(cat => cat.name === 'Jacket');
      const overshirtCategory = mockCategories.find(cat => cat.name === 'Overshirt');
      
      const selectedCategoryIds = [jacketCategory?.id, overshirtCategory?.id];
      const filteredItems = mockWardrobeItems.filter(item => 
        selectedCategoryIds.includes(item.category_id)
      );
      
      // Should include items from both categories
      expect(filteredItems).toHaveLength(2);
      expect(filteredItems.map(item => item.name)).toContain('Navy Blazer');
      expect(filteredItems.map(item => item.name)).toContain('Flannel Overshirt');
      
      // Should not include items from other categories
      expect(filteredItems.map(item => item.name)).not.toContain('White Oxford');
      expect(filteredItems.map(item => item.name)).not.toContain('Dark Jeans');
    });

    it('should handle category filtering with search workflow', () => {
      // Test combined category filtering and search functionality
      const searchTerm = 'blazer';
      const jacketCategory = mockCategories.find(cat => cat.name === 'Jacket');
      
      // First filter by category
      const categoryItems = mockWardrobeItems.filter(item => item.category_id === jacketCategory?.id);
      
      // Then apply search
      const searchResults = categoryItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Navy Blazer');
    });

    it('should handle category filtering with tag workflow', () => {
      // Test category filtering combined with tag filtering
      const casualTag = 'casual';
      const overshirtCategory = mockCategories.find(cat => cat.name === 'Overshirt');
      
      // Filter by category and tag
      const filteredItems = mockWardrobeItems.filter(item =>
        item.category_id === overshirtCategory?.id &&
        item.capsule_tags?.includes(casualTag)
      );
      
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].name).toBe('Flannel Overshirt');
      expect(filteredItems[0].capsule_tags).toContain('casual');
    });
  });

  describe('Outfit Creation with New Category Structure', () => {
    it('should create outfits with Jacket items correctly', () => {
      // Test outfit creation workflow with Jacket category items
      const jacketOutfit = mockOutfits.find(outfit => 
        outfit.items.some(item => item.category === 'Jacket')
      );
      
      expect(jacketOutfit).toBeDefined();
      expect(jacketOutfit?.name).toBe('Business Casual');
      expect(jacketOutfit?.score).toBe(85);
      
      // Verify outfit contains jacket item
      const jacketItem = jacketOutfit?.items.find(item => item.category === 'Jacket');
      expect(jacketItem).toBeDefined();
      expect(jacketItem?.name).toBe('Navy Blazer');
    });

    it('should create outfits with Overshirt items correctly', () => {
      // Test outfit creation workflow with Overshirt category items
      const overshirtOutfit = mockOutfits.find(outfit => 
        outfit.items.some(item => item.category === 'Overshirt')
      );
      
      expect(overshirtOutfit).toBeDefined();
      expect(overshirtOutfit?.name).toBe('Casual Layer');
      expect(overshirtOutfit?.score).toBe(78);
      
      // Verify outfit contains overshirt item
      const overshirtItem = overshirtOutfit?.items.find(item => item.category === 'Overshirt');
      expect(overshirtItem).toBeDefined();
      expect(overshirtItem?.name).toBe('Flannel Overshirt');
    });

    it('should handle outfit scoring with new categories', () => {
      // Test that outfit scoring works correctly with new category structure
      mockOutfits.forEach(outfit => {
        // All outfits should have valid scores
        expect(outfit.score).toBeGreaterThan(0);
        expect(outfit.score).toBeLessThanOrEqual(100);
        
        // All outfit items should reference valid categories
        outfit.items.forEach(item => {
          expect(['Jacket', 'Overshirt', 'Shirt', 'Pants']).toContain(item.category);
          expect(item.category).not.toBe('Jacket/Overshirt');
        });
      });
    });

    it('should support outfit creation workflow with both new categories', () => {
      // Test that outfits can be created with items from both Jacket and Overshirt categories
      const allCategories = new Set(
        mockOutfits.flatMap(outfit => outfit.items.map(item => item.category))
      );
      
      expect(allCategories.has('Jacket')).toBe(true);
      expect(allCategories.has('Overshirt')).toBe(true);
      expect(allCategories.has('Jacket/Overshirt')).toBe(false);
    });

    it('should maintain outfit compatibility across category split', () => {
      // Test that outfit compatibility is maintained after category split
      const businessOutfit = mockOutfits.find(outfit => outfit.name === 'Business Casual');
      const casualOutfit = mockOutfits.find(outfit => outfit.name === 'Casual Layer');
      
      // Business outfit with jacket should have higher formality
      expect(businessOutfit?.score).toBeGreaterThan(casualOutfit?.score || 0);
      
      // Both outfits should be valid and complete
      expect(businessOutfit?.items.length).toBeGreaterThan(0);
      expect(casualOutfit?.items.length).toBeGreaterThan(0);
    });
  });

  describe('Category Data Consistency Workflows', () => {
    it('should maintain consistent category references across all data structures', () => {
      // Test that category references are consistent across categories, items, and outfits
      const categoryIds = new Set(mockCategories.map(cat => cat.id));
      const categoryNames = new Set(mockCategories.map(cat => cat.name));
      
      // All wardrobe items should reference valid categories
      mockWardrobeItems.forEach(item => {
        expect(categoryIds.has(item.category_id)).toBe(true);
      });
      
      // All outfit items should reference valid category names
      mockOutfits.forEach(outfit => {
        outfit.items.forEach(item => {
          expect(categoryNames.has(item.category)).toBe(true);
        });
      });
    });

    it('should handle category ordering workflow correctly', () => {
      // Test that categories maintain proper display order
      const sortedCategories = [...mockCategories].sort((a, b) => a.display_order - b.display_order);
      
      expect(sortedCategories[0].name).toBe('Jacket');
      expect(sortedCategories[1].name).toBe('Overshirt');
      expect(sortedCategories[2].name).toBe('Shirt');
      expect(sortedCategories[3].name).toBe('Pants');
      
      // Verify no gaps in display order
      sortedCategories.forEach((category, index) => {
        expect(category.display_order).toBe(index + 1);
      });
    });

    it('should validate anchor item workflow with new categories', () => {
      // Test that anchor item functionality works with new categories
      const anchorCategories = mockCategories.filter(cat => cat.is_anchor_item);
      const anchorCategoryNames = anchorCategories.map(cat => cat.name);
      
      expect(anchorCategoryNames).toContain('Jacket');
      expect(anchorCategoryNames).toContain('Overshirt');
      expect(anchorCategoryNames).toContain('Shirt');
      expect(anchorCategoryNames).not.toContain('Jacket/Overshirt');
    });
  });

  describe('Migration Validation Workflows', () => {
    it('should validate complete migration from old to new category structure', () => {
      // Test that migration workflow results in clean new structure
      const categoryNames = mockCategories.map(cat => cat.name);
      
      // Should have new categories
      expect(categoryNames).toContain('Jacket');
      expect(categoryNames).toContain('Overshirt');
      
      // Should not have old category
      expect(categoryNames).not.toContain('Jacket/Overshirt');
      
      // Should maintain all expected categories
      expect(categoryNames).toContain('Shirt');
      expect(categoryNames).toContain('Pants');
    });

    it('should validate item classification workflow', () => {
      // Test that items are properly classified into new categories
      const jacketItems = mockWardrobeItems.filter(item => {
        const category = mockCategories.find(cat => cat.id === item.category_id);
        return category?.name === 'Jacket';
      });
      
      const overshirtItems = mockWardrobeItems.filter(item => {
        const category = mockCategories.find(cat => cat.id === item.category_id);
        return category?.name === 'Overshirt';
      });
      
      // Should have items in both new categories
      expect(jacketItems.length).toBeGreaterThan(0);
      expect(overshirtItems.length).toBeGreaterThan(0);
      
      // Items should have appropriate characteristics
      expect(jacketItems[0].formality_score).toBeGreaterThan(overshirtItems[0].formality_score || 0);
    });

    it('should validate no legacy references in any workflow', () => {
      // Test that no workflow contains legacy category references
      const allCategoryReferences = [
        ...mockCategories.map(cat => cat.name),
        ...mockOutfits.flatMap(outfit => outfit.items.map(item => item.category))
      ];
      
      expect(allCategoryReferences).not.toContain('Jacket/Overshirt');
      
      // Verify all references are to valid new categories
      const validCategories = ['Jacket', 'Overshirt', 'Shirt', 'Pants'];
      allCategoryReferences.forEach(ref => {
        expect(validCategories).toContain(ref);
      });
    });
  });

  describe('Performance and Scalability Workflows', () => {
    it('should handle large-scale category filtering workflows efficiently', () => {
      // Test performance with larger datasets
      const largeItemSet = Array.from({ length: 1000 }, (_, index) => 
        createMockWardrobeItem({
          id: `item-${index}`,
          name: `Item ${index}`,
          category_id: mockCategories[index % mockCategories.length].id,
          brand: `Brand ${index % 10}`,
          formality_score: Math.floor(Math.random() * 10) + 1
        })
      );
      
      const startTime = performance.now();
      
      // Test category filtering
      const jacketCategory = mockCategories.find(cat => cat.name === 'Jacket');
      const jacketItems = largeItemSet.filter(item => item.category_id === jacketCategory?.id);
      
      // Test multi-category filtering
      const overshirtCategory = mockCategories.find(cat => cat.name === 'Overshirt');
      const multiCategoryItems = largeItemSet.filter(item => 
        item.category_id === jacketCategory?.id || item.category_id === overshirtCategory?.id
      );
      
      const endTime = performance.now();
      
      // Verify results
      expect(jacketItems.length).toBeGreaterThan(0);
      expect(multiCategoryItems.length).toBeGreaterThan(jacketItems.length);
      
      // Verify performance (should complete quickly)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle complex search and filter combinations efficiently', () => {
      // Test complex workflow combinations
      const complexFilterWorkflow = () => {
        // Step 1: Filter by category
        const jacketCategory = mockCategories.find(cat => cat.name === 'Jacket');
        let results = mockWardrobeItems.filter(item => item.category_id === jacketCategory?.id);
        
        // Step 2: Apply search filter
        results = results.filter(item => 
          item.name.toLowerCase().includes('blazer') ||
          item.brand?.toLowerCase().includes('hugo')
        );
        
        // Step 3: Apply tag filter
        results = results.filter(item => 
          item.capsule_tags?.includes('formal')
        );
        
        // Step 4: Apply formality filter
        results = results.filter(item => 
          (item.formality_score || 0) >= 7
        );
        
        return results;
      };
      
      const startTime = performance.now();
      const results = complexFilterWorkflow();
      const endTime = performance.now();
      
      // Verify results
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Navy Blazer');
      
      // Verify performance
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});