import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createQueryClient, queryKeys } from '../query-client';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
};

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

describe('Performance Tests', () => {
  let queryClient: QueryClient;
  let startTime: number;

  beforeEach(() => {
    queryClient = createQueryClient();
    startTime = Date.now();
    
    // Mock global performance
    global.performance = mockPerformance as any;
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('TanStack Query Cache Performance', () => {
    it('should cache queries efficiently', async () => {
      const userId = 'test-user-id';
      const queryKey = queryKeys.wardrobe.items(userId);
      
      // Mock data
      const mockData = [
        { id: '1', name: 'Test Item 1', category_id: 'cat1' },
        { id: '2', name: 'Test Item 2', category_id: 'cat2' },
      ];

      // Set initial data
      queryClient.setQueryData(queryKey, mockData);
      
      // Measure cache retrieval time
      const cacheStartTime = performance.now();
      const cachedData = queryClient.getQueryData(queryKey);
      const cacheEndTime = performance.now();
      
      const cacheRetrievalTime = cacheEndTime - cacheStartTime;
      
      expect(cachedData).toEqual(mockData);
      expect(cacheRetrievalTime).toBeLessThan(10); // Should be very fast
    });

    it('should validate cache hit rates', () => {
      const userId = 'test-user-id';
      const queryKey = queryKeys.wardrobe.items(userId);
      
      // Set data in cache
      queryClient.setQueryData(queryKey, []);
      
      // Multiple cache accesses
      const iterations = 100;
      let cacheHits = 0;
      
      for (let i = 0; i < iterations; i++) {
        const data = queryClient.getQueryData(queryKey);
        if (data !== undefined) {
          cacheHits++;
        }
      }
      
      const hitRate = cacheHits / iterations;
      expect(hitRate).toBe(1); // 100% hit rate for cached data
    });

    it('should handle cache invalidation efficiently', async () => {
      const userId = 'test-user-id';
      const wardrobeKey = queryKeys.wardrobe.items(userId);
      const outfitsKey = queryKeys.outfits.list(userId);
      
      // Set initial data
      queryClient.setQueryData(wardrobeKey, []);
      queryClient.setQueryData(outfitsKey, []);
      
      // Measure invalidation time
      const invalidationStart = performance.now();
      await queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
      const invalidationEnd = performance.now();
      
      const invalidationTime = invalidationEnd - invalidationStart;
      expect(invalidationTime).toBeLessThan(10); // Should be fast
    });

    it('should optimize memory usage', () => {
      const userId = 'test-user-id';
      
      // Add multiple queries to cache
      for (let i = 0; i < 50; i++) {
        const queryKey = queryKeys.wardrobe.item(`item-${i}`);
        queryClient.setQueryData(queryKey, { id: `item-${i}`, name: `Item ${i}` });
      }
      
      // Check cache size (approximate)
      const cacheSize = queryClient.getQueryCache().getAll().length;
      expect(cacheSize).toBeLessThanOrEqual(50);
      
      // Trigger garbage collection
      queryClient.getQueryCache().clear();
      const clearedCacheSize = queryClient.getQueryCache().getAll().length;
      expect(clearedCacheSize).toBe(0);
    });
  });

  describe('Query Key Performance', () => {
    it('should generate query keys efficiently', () => {
      const userId = 'test-user-id';
      const iterations = 1000;
      
      const keyGenerationStart = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        queryKeys.wardrobe.items(userId);
        queryKeys.outfits.list(userId);
        queryKeys.user.preferences(userId);
      }
      
      const keyGenerationEnd = performance.now();
      const keyGenerationTime = keyGenerationEnd - keyGenerationStart;
      
      // Should generate 3000 keys in under 10ms
      expect(keyGenerationTime).toBeLessThan(10);
    });

    it('should create consistent query keys', () => {
      const userId = 'test-user-id';
      
      const key1 = queryKeys.wardrobe.items(userId);
      const key2 = queryKeys.wardrobe.items(userId);
      
      expect(key1).toEqual(key2);
      expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
    });
  });

  describe('Memory Management', () => {
    it('should not persist data in browser storage', () => {
      // Verify no localStorage usage
      const localStorageKeys = Object.keys(localStorage);
      const queryRelatedKeys = localStorageKeys.filter(key => 
        key.includes('query') || key.includes('cache') || key.includes('tanstack')
      );
      
      expect(queryRelatedKeys).toHaveLength(0);
    });

    it('should clear cache on page refresh simulation', () => {
      const userId = 'test-user-id';
      const queryKey = queryKeys.wardrobe.items(userId);
      
      // Set data
      queryClient.setQueryData(queryKey, [{ id: '1', name: 'Test' }]);
      expect(queryClient.getQueryData(queryKey)).toBeDefined();
      
      // Simulate page refresh by creating new client
      const newQueryClient = createQueryClient();
      expect(newQueryClient.getQueryData(queryKey)).toBeUndefined();
    });
  });

  describe('Configuration Performance', () => {
    it('should have optimal default configurations', () => {
      const client = createQueryClient();
      const defaultOptions = client.getDefaultOptions();
      
      // Verify stale time is set for performance
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      
      // Verify garbage collection time
      expect(defaultOptions.queries?.gcTime).toBe(30 * 60 * 1000); // 30 minutes
      
      // Verify retry configuration (now functions)
      expect(typeof defaultOptions.queries?.retry).toBe('function');
      expect(typeof defaultOptions.mutations?.retry).toBe('function');
    });

    it('should handle retry delays efficiently', () => {
      const client = createQueryClient();
      const retryDelay = client.getDefaultOptions().queries?.retryDelay as Function;
      
      if (retryDelay) {
        // Test exponential backoff
        expect(retryDelay(0)).toBe(1000); // 1s
        expect(retryDelay(1)).toBe(2000); // 2s
        expect(retryDelay(2)).toBe(4000); // 4s
        expect(retryDelay(10)).toBe(30000); // Max 30s
      }
    });
  });
});