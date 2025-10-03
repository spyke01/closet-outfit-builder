/**
 * Comprehensive tests for useOutfitEngine optimistic functionality
 * Tests optimistic outfit generation, error handling, and performance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOutfitEngine } from './useOutfitEngine';
import { WardrobeItem, OutfitSelection } from '../types';
import React from 'react';

// Mock the wardrobe hook
vi.mock('./useWardrobe', () => ({
  useWardrobe: () => ({
    outfits: [
      {
        id: 'outfit-1',
        items: ['shirt-1', 'pants-1', 'shoes-1'],
        tuck: 'untucked',
        loved: false
      },
      {
        id: 'outfit-2',
        items: ['jacket-1', 'shirt-2', 'pants-2', 'shoes-2'],
        tuck: 'tucked',
        loved: true
      }
    ],
    getItemById: (id: string) => {
      const items: Record<string, WardrobeItem> = {
        'shirt-1': {
          id: 'shirt-1',
          name: 'Blue Oxford Shirt',
          category: 'Shirt',
          formality: 'smart-casual',
          capsule: ['classic'],
          image: '/images/shirt-1.png'
        },
        'pants-1': {
          id: 'pants-1',
          name: 'Navy Chinos',
          category: 'Pants',
          formality: 'smart-casual',
          capsule: ['classic'],
          image: '/images/pants-1.png'
        },
        'shoes-1': {
          id: 'shoes-1',
          name: 'Brown Loafers',
          category: 'Shoes',
          formality: 'smart-casual',
          capsule: ['classic'],
          image: '/images/shoes-1.png'
        },
        'jacket-1': {
          id: 'jacket-1',
          name: 'Navy Blazer',
          category: 'Jacket/Overshirt',
          formality: 'formal',
          capsule: ['classic'],
          image: '/images/jacket-1.png'
        },
        'shirt-2': {
          id: 'shirt-2',
          name: 'White Dress Shirt',
          category: 'Shirt',
          formality: 'formal',
          capsule: ['classic'],
          image: '/images/shirt-2.png'
        },
        'pants-2': {
          id: 'pants-2',
          name: 'Charcoal Trousers',
          category: 'Pants',
          formality: 'formal',
          capsule: ['classic'],
          image: '/images/pants-2.png'
        },
        'shoes-2': {
          id: 'shoes-2',
          name: 'Black Oxford Shoes',
          category: 'Shoes',
          formality: 'formal',
          capsule: ['classic'],
          image: '/images/shoes-2.png'
        }
      };
      return items[id] || null;
    }
  })
}));

// Mock scoring utility
vi.mock('../utils/scoring', () => ({
  calculateOutfitScore: (selection: OutfitSelection) => ({
    percentage: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
    breakdown: {
      formality: 85,
      style: 90,
      color: 80,
      season: 75
    }
  })
}));

describe('useOutfitEngine - Optimistic Updates', () => {
  const mockAnchorItem: WardrobeItem = {
    id: 'shirt-1',
    name: 'Blue Oxford Shirt',
    category: 'Shirt',
    formality: 'smart-casual',
    capsule: ['classic'],
    image: '/images/shirt-1.png'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Math.random for consistent test results
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('optimistic outfit generation', () => {
    it('should show optimistic result immediately when generating outfit', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      expect(result.current.generatedOutfits).toHaveLength(0);
      expect(result.current.isGenerating).toBe(false);

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      // Should show optimistic result immediately
      expect(result.current.generatedOutfits).toHaveLength(1);
      expect(result.current.isGenerating).toBe(true);
      
      // Optimistic outfit should contain the anchor item
      const optimisticOutfit = result.current.generatedOutfits[0];
      expect(optimisticOutfit.shirt?.id).toBe(mockAnchorItem.id);
      expect(optimisticOutfit.source).toBe('generated');
      expect(optimisticOutfit.id).toMatch(/^optimistic-/);
    });

    it('should replace optimistic outfit with actual results', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      // Should show optimistic result
      expect(result.current.generatedOutfits).toHaveLength(1);
      expect(result.current.isGenerating).toBe(true);

      // Wait for actual results
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 2000 });

      // Should have actual results
      expect(result.current.generatedOutfits.length).toBeGreaterThan(0);
      expect(result.current.generationError).toBeNull();
    });

    it('should handle generation errors gracefully', async () => {
      // Mock Math.random to force error (< 0.05)
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      // Should show optimistic result initially
      expect(result.current.generatedOutfits).toHaveLength(1);
      expect(result.current.isGenerating).toBe(true);

      // Wait for error
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 2000 });

      // Should have error and optimistic update should be reverted
      expect(result.current.generationError).toBeTruthy();
      expect(result.current.generationError?.message).toContain('Outfit generation failed');
    });

    it('should create optimistic outfit with correct structure', () => {
      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      const optimisticOutfit = result.current.generatedOutfits[0];
      
      expect(optimisticOutfit).toHaveProperty('id');
      expect(optimisticOutfit).toHaveProperty('score');
      expect(optimisticOutfit).toHaveProperty('source', 'generated');
      expect(optimisticOutfit).toHaveProperty('loved', false);
      expect(optimisticOutfit.shirt?.id).toBe(mockAnchorItem.id);
    });

    it('should handle different anchor item categories', () => {
      const { result } = renderHook(() => useOutfitEngine());

      const jacketItem: WardrobeItem = {
        id: 'jacket-1',
        name: 'Navy Blazer',
        category: 'Jacket/Overshirt',
        formality: 'formal',
        capsule: ['classic'],
        image: '/images/jacket-1.png'
      };

      act(() => {
        result.current.generateOutfit(jacketItem);
      });

      const optimisticOutfit = result.current.generatedOutfits[0];
      expect(optimisticOutfit.jacket?.id).toBe(jacketItem.id);
    });
  });

  describe('optimistic random outfit generation', () => {
    it('should show optimistic random outfit immediately', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateRandomOutfit();
      });

      // Should show optimistic result immediately
      expect(result.current.generatedOutfits).toHaveLength(1);
      expect(result.current.isGenerating).toBe(true);

      const optimisticOutfit = result.current.generatedOutfits[0];
      expect(optimisticOutfit.id).toMatch(/^optimistic-random-/);
    });

    it('should replace optimistic random outfit with actual result', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateRandomOutfit();
      });

      expect(result.current.isGenerating).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 1000 });

      expect(result.current.generatedOutfits).toHaveLength(1);
      expect(result.current.generationError).toBeNull();
    });

    it('should handle random generation errors', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      // Mock getRandomOutfit to return null
      vi.spyOn(result.current, 'getRandomOutfit').mockReturnValue(null);

      act(() => {
        result.current.generateRandomOutfit();
      });

      await waitFor(() => {
        expect(result.current.generationError).toBeTruthy();
      }, { timeout: 1000 });

      expect(result.current.generationError?.message).toContain('No outfits available');
    });
  });

  describe('optimistic state management', () => {
    it('should track generation state correctly', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      expect(result.current.isGenerating).toBe(false);

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      expect(result.current.isGenerating).toBe(true);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 2000 });
    });

    it('should clear optimistic state', () => {
      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      expect(result.current.generatedOutfits).toHaveLength(1);

      act(() => {
        result.current.clearOptimistic();
      });

      expect(result.current.generatedOutfits).toHaveLength(0);
      expect(result.current.generationError).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle multiple concurrent generations', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      const jacketItem: WardrobeItem = {
        id: 'jacket-1',
        name: 'Navy Blazer',
        category: 'Jacket/Overshirt',
        formality: 'formal',
        capsule: ['classic'],
        image: '/images/jacket-1.png'
      };

      // Start multiple generations
      act(() => {
        result.current.generateOutfit(mockAnchorItem);
        result.current.generateOutfit(jacketItem);
      });

      // Should show multiple optimistic results
      expect(result.current.generatedOutfits.length).toBeGreaterThanOrEqual(2);
      expect(result.current.isGenerating).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 3000 });
    });
  });

  describe('performance considerations', () => {
    it('should use startTransition for optimistic updates', () => {
      const startTransitionSpy = vi.spyOn(React, 'startTransition');
      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      expect(startTransitionSpy).toHaveBeenCalled();
    });

    it('should simulate realistic generation delays', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      const startTime = Date.now();

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 2000 });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 800ms (minimum delay)
      expect(duration).toBeGreaterThan(800);
      // Should not take more than 1500ms (max delay + buffer)
      expect(duration).toBeLessThan(1500);
    });

    it('should maintain outfit order with optimistic updates', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      const optimisticOutfit = result.current.generatedOutfits[0];
      expect(optimisticOutfit.id).toMatch(/^optimistic-/);

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 2000 });

      // New outfits should be at the beginning
      const finalOutfits = result.current.generatedOutfits;
      expect(finalOutfits.length).toBeGreaterThan(0);
    });
  });

  describe('error handling and recovery', () => {
    it('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      await waitFor(() => {
        expect(result.current.generationError).toBeTruthy();
      }, { timeout: 2000 });

      expect(consoleSpy).toHaveBeenCalledWith('Outfit generation failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle invalid anchor items gracefully', () => {
      const { result } = renderHook(() => useOutfitEngine());

      const invalidItem = {
        id: '',
        name: '',
        category: 'Invalid' as any,
        formality: 'casual' as any,
        capsule: [],
        image: ''
      };

      act(() => {
        result.current.generateOutfit(invalidItem);
      });

      // Should still create optimistic outfit
      expect(result.current.generatedOutfits).toHaveLength(1);
    });

    it('should recover from errors on subsequent generations', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      // First generation fails
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      await waitFor(() => {
        expect(result.current.generationError).toBeTruthy();
      }, { timeout: 2000 });

      // Second generation succeeds
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 2000 });

      // Error should be cleared
      expect(result.current.generationError).toBeNull();
    });
  });

  describe('integration with existing functionality', () => {
    it('should work with existing outfit scoring', () => {
      const { result } = renderHook(() => useOutfitEngine());

      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      const optimisticOutfit = result.current.generatedOutfits[0];
      expect(typeof optimisticOutfit.score).toBe('number');
      expect(optimisticOutfit.score).toBeGreaterThan(0);
      expect(optimisticOutfit.score).toBeLessThanOrEqual(100);
    });

    it('should work with outfit filtering', async () => {
      const { result } = renderHook(() => useOutfitEngine());

      // Generate some outfits first
      act(() => {
        result.current.generateOutfit(mockAnchorItem);
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      }, { timeout: 2000 });

      // Test filtering functionality
      const selection: OutfitSelection = {
        shirt: mockAnchorItem
      };

      const filteredOutfits = result.current.getFilteredOutfits(selection);
      expect(Array.isArray(filteredOutfits)).toBe(true);
    });

    it('should work with anchor-based outfit retrieval', () => {
      const { result } = renderHook(() => useOutfitEngine());

      const anchorOutfits = result.current.getOutfitsForAnchor(mockAnchorItem);
      expect(Array.isArray(anchorOutfits)).toBe(true);
    });
  });
});