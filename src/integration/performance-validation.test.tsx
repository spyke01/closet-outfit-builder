import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimizedOutfitGeneration } from '../hooks/useOptimizedOutfitGeneration';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { WardrobeItem } from '../types';

// Mock the outfit engine with realistic data
vi.mock('../hooks/useOutfitEngine', () => ({
  useOutfitEngine: () => ({
    getOutfitsForAnchor: vi.fn().mockImplementation(() => {
      // Simulate realistic outfit generation time
      const outfits = Array.from({ length: 10 }, (_, i) => ({
        id: `outfit-${i}`,
        score: 70 + Math.random() * 30,
        source: i % 2 === 0 ? 'curated' : 'generated',
        loved: Math.random() > 0.7,
        jacket: { id: 'jacket-1', name: 'Blue Jacket', category: 'Jacket/Overshirt' }
      }));
      return outfits;
    }),
    getAllOutfits: vi.fn().mockImplementation(() => {
      return Array.from({ length: 100 }, (_, i) => ({
        id: `outfit-${i}`,
        score: Math.random() * 100,
        source: i % 3 === 0 ? 'curated' : 'generated',
        loved: Math.random() > 0.8
      }));
    })
  })
}));

describe('Performance Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Interaction Response Time Validation', () => {
    it('should maintain sub-100ms response times for outfit generation', async () => {
      const { result } = renderHook(() => useOptimizedOutfitGeneration());
      const { result: perfResult } = renderHook(() => usePerformanceMonitoring());

      const mockAnchorItem: WardrobeItem = {
        id: 'test-jacket',
        name: 'Test Jacket',
        category: 'Jacket/Overshirt',
        formality: 'casual'
      };

      const measurements: number[] = [];

      // Perform multiple outfit generations to get average response time
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        await act(async () => {
          await perfResult.current.measureInteraction('outfit-generation', () => {
            result.current.generateOutfits(mockAnchorItem);
          });
        });
        
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }

      const averageTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
      const maxTime = Math.max(...measurements);

      // Validate performance targets
      expect(averageTime).toBeLessThan(100); // Average should be under 100ms
      expect(maxTime).toBeLessThan(200); // No single operation should exceed 200ms
      
      // Validate that 95% of operations are under 100ms
      const sortedTimes = measurements.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95Time = sortedTimes[p95Index];
      expect(p95Time).toBeLessThan(100);
    });

    it('should maintain responsiveness during concurrent search and filtering', async () => {
      const { result } = renderHook(() => useOptimizedOutfitGeneration());
      const { result: perfResult } = renderHook(() => usePerformanceMonitoring());

      // Generate initial data
      const mockAnchorItem: WardrobeItem = {
        id: 'test-jacket',
        name: 'Test Jacket',
        category: 'Jacket/Overshirt',
        formality: 'casual'
      };

      act(() => {
        result.current.generateOutfits(mockAnchorItem);
      });

      const searchOperations: number[] = [];
      const filterOperations: number[] = [];

      // Perform concurrent search and filter operations
      for (let i = 0; i < 20; i++) {
        // Search operation
        const searchStart = performance.now();
        await act(async () => {
          await perfResult.current.measureInteraction('search', () => {
            result.current.setSearchTerm(`search-${i}`);
          });
        });
        const searchEnd = performance.now();
        searchOperations.push(searchEnd - searchStart);

        // Filter operation
        const filterStart = performance.now();
        await act(async () => {
          await perfResult.current.measureInteraction('filter', () => {
            result.current.setFilterCriteria({ minScore: 50 + (i % 50) });
          });
        });
        const filterEnd = performance.now();
        filterOperations.push(filterEnd - filterStart);
      }

      // Validate search performance
      const avgSearchTime = searchOperations.reduce((sum, time) => sum + time, 0) / searchOperations.length;
      expect(avgSearchTime).toBeLessThan(50); // Search should be very fast

      // Validate filter performance
      const avgFilterTime = filterOperations.reduce((sum, time) => sum + time, 0) / filterOperations.length;
      expect(avgFilterTime).toBeLessThan(50); // Filtering should be very fast

      // Validate that concurrent operations don't block each other
      const maxSearchTime = Math.max(...searchOperations);
      const maxFilterTime = Math.max(...filterOperations);
      expect(maxSearchTime).toBeLessThan(100);
      expect(maxFilterTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage Validation', () => {
    it('should not leak memory during repeated operations', async () => {
      const { result } = renderHook(() => useOptimizedOutfitGeneration());

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform many operations that could potentially leak memory
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.setSearchTerm(`search-${i}`);
          result.current.setFilterCriteria({ 
            minScore: Math.random() * 100,
            source: i % 2 === 0 ? 'curated' : 'generated'
          });
          result.current.generateRandomOutfits(5);
        });

        // Clear periodically to simulate real usage
        if (i % 20 === 0) {
          act(() => {
            result.current.clearOutfits();
          });
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 5MB for this test)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should limit collection sizes to prevent unbounded growth', () => {
      const { result } = renderHook(() => usePerformanceMonitoring());

      // Add many samples to test limits
      act(() => {
        for (let i = 0; i < 200; i++) {
          result.current.recordCustomMetric('outfitGenerationTime', Math.random() * 100);
          result.current.recordCustomMetric('searchResponseTime', Math.random() * 50);
          result.current.recordCustomMetric('filterResponseTime', Math.random() * 25);
        }
      });

      // Verify that collections are limited
      expect(result.current.metrics.customMetrics.outfitGenerationTime.length).toBeLessThanOrEqual(50);
      expect(result.current.metrics.customMetrics.searchResponseTime.length).toBeLessThanOrEqual(50);
      expect(result.current.metrics.customMetrics.filterResponseTime.length).toBeLessThanOrEqual(50);

      // Add interaction samples
      for (let i = 0; i < 150; i++) {
        act(() => {
          result.current.measureInteraction('test', () => {
            // Simulate work
            Math.random();
          });
        });
      }

      // Verify interaction samples are limited
      expect(result.current.metrics.interactionResponse.samples.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Concurrent Rendering Validation', () => {
    it('should handle rapid state updates without blocking', async () => {
      const { result } = renderHook(() => useOptimizedOutfitGeneration());

      const updateTimes: number[] = [];

      // Perform rapid state updates
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        
        act(() => {
          result.current.setSearchTerm(`rapid-${i}`);
          result.current.setFilterCriteria({ 
            minScore: i,
            source: i % 2 === 0 ? 'curated' : 'generated',
            loved: i % 3 === 0
          });
        });
        
        const endTime = performance.now();
        updateTimes.push(endTime - startTime);
      }

      // All updates should complete quickly
      const maxUpdateTime = Math.max(...updateTimes);
      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;

      expect(maxUpdateTime).toBeLessThan(50); // No single update should take more than 50ms
      expect(avgUpdateTime).toBeLessThan(20); // Average should be very fast
    });

    it('should maintain UI responsiveness during heavy filtering', async () => {
      const { result } = renderHook(() => useOptimizedOutfitGeneration());

      // Generate a large dataset
      act(() => {
        result.current.generateRandomOutfits(50);
      });

      const filteringTimes: number[] = [];

      // Apply complex filters rapidly
      const complexFilters = [
        { minScore: 80, source: 'curated' as const, loved: true },
        { minScore: 60, source: 'generated' as const },
        { minScore: 90, loved: false },
        { minScore: 70, source: 'curated' as const },
        { minScore: 85, loved: true }
      ];

      for (let i = 0; i < 20; i++) {
        const filter = complexFilters[i % complexFilters.length];
        const searchTerm = `complex-search-${i}`;

        const startTime = performance.now();
        
        act(() => {
          result.current.setSearchTerm(searchTerm);
          result.current.setFilterCriteria(filter);
        });
        
        const endTime = performance.now();
        filteringTimes.push(endTime - startTime);
      }

      // Filtering should remain responsive
      const maxFilterTime = Math.max(...filteringTimes);
      const avgFilterTime = filteringTimes.reduce((sum, time) => sum + time, 0) / filteringTimes.length;

      expect(maxFilterTime).toBeLessThan(100);
      expect(avgFilterTime).toBeLessThan(50);

      // Verify that filtering state is properly managed
      expect(typeof result.current.isFiltering).toBe('boolean');
      expect(Array.isArray(result.current.outfits)).toBe(true);
    });
  });

  describe('Performance Metrics Validation', () => {
    it('should accurately track Core Web Vitals', () => {
      const { result } = renderHook(() => usePerformanceMonitoring());

      // Verify initial state
      expect(result.current.metrics.coreWebVitals).toEqual({
        fcp: null,
        lcp: null,
        cls: null,
        fid: null,
        inp: null
      });

      // Verify metrics structure
      expect(result.current.metrics.interactionResponse.target).toBe(100);
      expect(Array.isArray(result.current.metrics.interactionResponse.samples)).toBe(true);
      expect(typeof result.current.metrics.interactionResponse.average).toBe('number');
      expect(typeof result.current.metrics.interactionResponse.p95).toBe('number');
    });

    it('should generate comprehensive performance reports', () => {
      const { result } = renderHook(() => usePerformanceMonitoring());

      // Add some sample data
      act(() => {
        result.current.recordCustomMetric('outfitGenerationTime', 150);
        result.current.recordCustomMetric('searchResponseTime', 25);
        result.current.recordCustomMetric('filterResponseTime', 15);
      });

      const report = result.current.getPerformanceReport();

      // Verify report contains expected sections
      expect(report).toContain('Performance Report');
      expect(report).toContain('Core Web Vitals');
      expect(report).toContain('Interaction Response');
      expect(report).toContain('Custom Metrics');
      expect(report).toContain('Performance Status');

      // Verify custom metrics are included
      expect(report).toContain('150.00ms'); // outfit generation time
      expect(report).toContain('25.00ms');  // search response time
      expect(report).toContain('15.00ms');  // filter response time
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle empty datasets efficiently', () => {
      const { result } = renderHook(() => useOptimizedOutfitGeneration());

      const startTime = performance.now();
      
      act(() => {
        result.current.setSearchTerm('nonexistent');
        result.current.setFilterCriteria({ minScore: 99 });
      });
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // Operations on empty datasets should be very fast
      expect(operationTime).toBeLessThan(10);
      expect(result.current.outfits).toEqual([]);
    });

    it('should handle malformed filter criteria gracefully', () => {
      const { result } = renderHook(() => useOptimizedOutfitGeneration());

      const startTime = performance.now();
      
      act(() => {
        // Test with undefined/null values
        result.current.setFilterCriteria({
          minScore: undefined,
          maxScore: null as any,
          source: undefined,
          loved: undefined
        });
      });
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // Should handle gracefully without performance impact
      expect(operationTime).toBeLessThan(20);
      expect(typeof result.current.isFiltering).toBe('boolean');
    });
  });
});