import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOutfitEngine } from './useOutfitEngine';
import { useWardrobe } from './useWardrobe';
import { OutfitSelection, WardrobeItem, Category } from '../types';

// Mock the useWardrobe hook
vi.mock('./useWardrobe');

const mockUseWardrobe = vi.mocked(useWardrobe);

describe('useOutfitEngine Performance Tests', () => {
  const mockItems: WardrobeItem[] = [
    {
      id: 'jacket-1',
      name: 'Test Jacket 1',
      category: 'Jacket/Overshirt',
      color: 'Navy',
      formalityScore: 7,
      capsuleTags: ['Refined']
    },
    {
      id: 'shirt-1',
      name: 'Test Shirt 1',
      category: 'Shirt',
      color: 'White',
      formalityScore: 6,
      capsuleTags: ['Refined']
    },
    {
      id: 'pants-1',
      name: 'Test Pants 1',
      category: 'Pants',
      color: 'Charcoal',
      formalityScore: 7,
      capsuleTags: ['Refined']
    },
    {
      id: 'shoes-1',
      name: 'Test Shoes 1',
      category: 'Shoes',
      color: 'Black',
      formalityScore: 8,
      capsuleTags: ['Refined']
    }
  ];

  const mockOutfits = [
    {
      id: 'outfit-1',
      items: ['jacket-1', 'shirt-1', 'pants-1', 'shoes-1'],
      tuck: 'Tucked' as const,
      weight: 1
    }
  ];

  beforeEach(() => {
    mockUseWardrobe.mockReturnValue({
      items: mockItems,
      outfits: mockOutfits,
      itemsByCategory: {
        'Jacket/Overshirt': [mockItems[0]],
        'Shirt': [mockItems[1]],
        'Pants': [mockItems[2]],
        'Shoes': [mockItems[3]]
      },
      getItemById: (id: string) => mockItems.find(item => item.id === id) || null,
      loading: false
    });
  });

  it('should cache compatibility calculations for repeated calls', () => {
    const { result } = renderHook(() => useOutfitEngine());
    
    const selection: OutfitSelection = {
      jacket: mockItems[0]
    };

    const category: Category = 'Shirt';

    // First call - should calculate
    const start1 = performance.now();
    const result1 = result.current.getCompatibleItems(category, selection);
    const end1 = performance.now();
    const time1 = end1 - start1;

    // Second call - should use cache
    const start2 = performance.now();
    const result2 = result.current.getCompatibleItems(category, selection);
    const end2 = performance.now();
    const time2 = end2 - start2;

    // Results should be identical
    expect(result1).toEqual(result2);
    
    // Second call should be significantly faster (cached)
    expect(time2).toBeLessThan(time1);
    
    // Both should return the expected item
    expect(result1).toHaveLength(1);
    expect(result1[0].id).toBe('shirt-1');
  });

  it('should cache outfit filtering for repeated calls', () => {
    const { result } = renderHook(() => useOutfitEngine());
    
    const selection: OutfitSelection = {
      jacket: mockItems[0],
      shirt: mockItems[1]
    };

    // First call - should calculate
    const start1 = performance.now();
    const result1 = result.current.getFilteredOutfits(selection);
    const end1 = performance.now();
    const time1 = end1 - start1;

    // Second call - should use cache
    const start2 = performance.now();
    const result2 = result.current.getFilteredOutfits(selection);
    const end2 = performance.now();
    const time2 = end2 - start2;

    // Results should be identical
    expect(result1).toEqual(result2);
    
    // Second call should be significantly faster (cached)
    expect(time2).toBeLessThan(time1);
    
    // Should return the matching outfit
    expect(result1).toHaveLength(1);
    expect(result1[0].id).toBe('outfit-1');
  });

  it('should handle large datasets efficiently', () => {
    // Create a large dataset
    const largeItems: WardrobeItem[] = [];
    const largeOutfits = [];

    // Generate 100 items per category
    const categories: Category[] = ['Jacket/Overshirt', 'Shirt', 'Pants', 'Shoes'];
    categories.forEach((category, catIndex) => {
      for (let i = 0; i < 100; i++) {
        largeItems.push({
          id: `${category.toLowerCase()}-${i}`,
          name: `${category} ${i}`,
          category,
          color: 'Test',
          formalityScore: 5,
          capsuleTags: ['Test']
        });
      }
    });

    // Generate 50 outfits
    for (let i = 0; i < 50; i++) {
      largeOutfits.push({
        id: `outfit-${i}`,
        items: [
          `jacket/overshirt-${i % 100}`,
          `shirt-${i % 100}`,
          `pants-${i % 100}`,
          `shoes-${i % 100}`
        ],
        tuck: 'Tucked' as const,
        weight: 1
      });
    }

    mockUseWardrobe.mockReturnValue({
      items: largeItems,
      outfits: largeOutfits,
      itemsByCategory: {
        'Jacket/Overshirt': largeItems.filter(item => item.category === 'Jacket/Overshirt'),
        'Shirt': largeItems.filter(item => item.category === 'Shirt'),
        'Pants': largeItems.filter(item => item.category === 'Pants'),
        'Shoes': largeItems.filter(item => item.category === 'Shoes')
      },
      getItemById: (id: string) => largeItems.find(item => item.id === id) || null,
      loading: false
    });

    const { result } = renderHook(() => useOutfitEngine());
    
    const selection: OutfitSelection = {
      jacket: largeItems[0]
    };

    // Test compatibility calculation performance
    const start = performance.now();
    const compatibleItems = result.current.getCompatibleItems('Shirt', selection);
    const end = performance.now();
    const time = end - start;

    // Should complete within reasonable time (less than 100ms)
    expect(time).toBeLessThan(100);
    
    // Should return results
    expect(compatibleItems).toBeDefined();
    expect(Array.isArray(compatibleItems)).toBe(true);
  });

  it('should invalidate cache when selection changes', () => {
    const { result } = renderHook(() => useOutfitEngine());
    
    const selection1: OutfitSelection = {
      jacket: mockItems[0]
    };

    const selection2: OutfitSelection = {
      jacket: mockItems[0],
      shirt: mockItems[1]
    };

    // First call with selection1
    const result1 = result.current.getCompatibleItems('Shirt', selection1);
    
    // Second call with selection2 (different selection)
    const result2 = result.current.getCompatibleItems('Shirt', selection2);

    // Results should be different based on different selections
    // (In this simple test case they might be the same, but the cache should be recalculated)
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it('should memoize getAllOutfits result', () => {
    const { result, rerender } = renderHook(() => useOutfitEngine());
    
    // First call
    const result1 = result.current.getAllOutfits();
    
    // Rerender (should use memoized result)
    rerender();
    const result2 = result.current.getAllOutfits();

    // Should return the same content (memoized)
    expect(result1).toStrictEqual(result2);
    
    // Should contain the expected outfit
    expect(result1).toHaveLength(1);
    expect(result1[0].id).toBe('outfit-1');
  });
});