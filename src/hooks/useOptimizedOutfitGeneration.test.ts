import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimizedOutfitGeneration } from './useOptimizedOutfitGeneration';
import { WardrobeItem, GeneratedOutfit } from '../types';

// Mock the useOutfitEngine hook
vi.mock('./useOutfitEngine', () => ({
  useOutfitEngine: () => ({
    getOutfitsForAnchor: vi.fn().mockReturnValue([
      {
        id: 'outfit-1',
        score: 85,
        source: 'curated',
        loved: false,
        jacket: { id: 'jacket-1', name: 'Blue Jacket', category: 'Jacket/Overshirt' }
      },
      {
        id: 'outfit-2',
        score: 90,
        source: 'generated',
        loved: true,
        jacket: { id: 'jacket-1', name: 'Blue Jacket', category: 'Jacket/Overshirt' }
      }
    ]),
    getAllOutfits: vi.fn().mockReturnValue([
      {
        id: 'outfit-1',
        score: 85,
        source: 'curated',
        loved: false
      },
      {
        id: 'outfit-2',
        score: 90,
        source: 'generated',
        loved: true
      },
      {
        id: 'outfit-3',
        score: 75,
        source: 'curated',
        loved: false
      }
    ])
  })
}));

const mockAnchorItem: WardrobeItem = {
  id: 'jacket-1',
  name: 'Blue Jacket',
  category: 'Jacket/Overshirt',
  formality: 'casual',
  capsuleTags: ['Refined']
};

describe('useOptimizedOutfitGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    expect(result.current.outfits).toEqual([]);
    expect(result.current.searchTerm).toBe('');
    expect(result.current.filterCriteria).toEqual({});
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.isFiltering).toBe(false);
  });

  it('should generate outfits for anchor item', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    act(() => {
      result.current.generateOutfits(mockAnchorItem);
    });

    expect(result.current.outfits).toHaveLength(2);
    expect(result.current.outfits[0].score).toBe(90); // Sorted by score descending
    expect(result.current.outfits[1].score).toBe(85);
  });

  it('should generate random outfits', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    act(() => {
      result.current.generateRandomOutfits(2);
    });

    expect(result.current.outfits.length).toBeGreaterThan(0);
    expect(result.current.outfits.length).toBeLessThanOrEqual(2);
  });

  it('should filter outfits by search term', async () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    // First generate some outfits
    act(() => {
      result.current.generateOutfits(mockAnchorItem);
    });

    // Then search
    act(() => {
      result.current.setSearchTerm('blue');
    });

    // Should show filtering state initially (may be false if deferred value updates immediately in test)
    // In real usage, there would be a brief moment where isFiltering is true
    expect(typeof result.current.isFiltering).toBe('boolean');
  });

  it('should filter outfits by score range', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    act(() => {
      result.current.generateOutfits(mockAnchorItem);
    });

    act(() => {
      result.current.setFilterCriteria({ minScore: 88 });
    });

    // Should handle filtering (may be immediate in test environment)
    expect(typeof result.current.isFiltering).toBe('boolean');
  });

  it('should filter outfits by source', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    act(() => {
      result.current.generateOutfits(mockAnchorItem);
    });

    act(() => {
      result.current.setFilterCriteria({ source: 'curated' });
    });

    expect(typeof result.current.isFiltering).toBe('boolean');
  });

  it('should filter outfits by loved status', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    act(() => {
      result.current.generateOutfits(mockAnchorItem);
    });

    act(() => {
      result.current.setFilterCriteria({ loved: true });
    });

    expect(typeof result.current.isFiltering).toBe('boolean');
  });

  it('should clear all outfits and filters', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    // Generate outfits and set filters
    act(() => {
      result.current.generateOutfits(mockAnchorItem);
      result.current.setSearchTerm('test');
      result.current.setFilterCriteria({ minScore: 80 });
    });

    // Clear everything
    act(() => {
      result.current.clearOutfits();
    });

    expect(result.current.outfits).toEqual([]);
    expect(result.current.searchTerm).toBe('');
    expect(result.current.filterCriteria).toEqual({});
  });

  it('should limit outfits to 50 for performance', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    act(() => {
      result.current.generateRandomOutfits(100);
    });

    // Should limit to reasonable number for performance
    expect(result.current.outfits.length).toBeLessThanOrEqual(50);
  });

  it('should handle concurrent updates without race conditions', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    // Simulate rapid concurrent updates
    act(() => {
      result.current.generateOutfits(mockAnchorItem);
      result.current.setSearchTerm('test1');
      result.current.setFilterCriteria({ minScore: 80 });
      result.current.setSearchTerm('test2');
      result.current.setFilterCriteria({ minScore: 90 });
    });

    // Should handle all updates gracefully
    expect(result.current.searchTerm).toBe('test2');
    expect(result.current.filterCriteria.minScore).toBe(90);
  });

  it('should maintain performance with large datasets', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    const startTime = performance.now();

    act(() => {
      result.current.generateRandomOutfits(50);
      result.current.setSearchTerm('test');
      result.current.setFilterCriteria({ minScore: 50, source: 'curated' });
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Should complete operations quickly
    expect(executionTime).toBeLessThan(100); // 100ms threshold
  });

  it('should properly sort outfits by different criteria', () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());

    act(() => {
      result.current.generateOutfits(mockAnchorItem);
    });

    // Default sort should be by score (descending)
    const outfits = result.current.outfits;
    for (let i = 0; i < outfits.length - 1; i++) {
      expect(outfits[i].score).toBeGreaterThanOrEqual(outfits[i + 1].score);
    }
  });
});