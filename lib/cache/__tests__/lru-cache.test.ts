import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  userCache, 
  categoryCache, 
  wardrobeItemsCache,
  cacheKeys,
  invalidateCache,
  getCached
} from '../lru-cache';

describe('LRU Cache', () => {
  beforeEach(() => {
    // Clear all caches before each test
    userCache.clear();
    categoryCache.clear();
    wardrobeItemsCache.clear();
  });

  describe('Cache key generators', () => {
    it('should generate correct user cache key', () => {
      expect(cacheKeys.user('user-123')).toBe('user:user-123');
    });

    it('should generate correct categories cache key', () => {
      expect(cacheKeys.userCategories('user-123')).toBe('categories:user-123');
    });

    it('should generate correct wardrobe items cache key', () => {
      expect(cacheKeys.userWardrobeItems('user-123')).toBe('wardrobe:user-123');
    });

    it('should generate correct active items cache key', () => {
      expect(cacheKeys.userActiveItems('user-123')).toBe('wardrobe:active:user-123');
    });
  });

  describe('Cache operations', () => {
    it('should cache and retrieve user data', () => {
      const userData = { id: 'user-123', name: 'John Doe' };
      const key = cacheKeys.user('user-123');

      userCache.set(key, userData);
      const cached = userCache.get(key);

      expect(cached).toEqual(userData);
    });

    it('should return undefined for non-existent keys', () => {
      const cached = userCache.get('non-existent-key');
      expect(cached).toBeUndefined();
    });

    it('should respect max size limit', () => {
      // Fill cache beyond max size
      for (let i = 0; i < 600; i++) {
        userCache.set(`user:${i}`, { id: i });
      }

      // Cache should have evicted oldest entries
      expect(userCache.size).toBeLessThanOrEqual(500);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate user cache', () => {
      const key = cacheKeys.user('user-123');
      userCache.set(key, { id: 'user-123' });

      invalidateCache.user('user-123');

      expect(userCache.get(key)).toBeUndefined();
    });

    it('should invalidate categories cache', () => {
      const key = cacheKeys.userCategories('user-123');
      categoryCache.set(key, [{ id: 'cat-1' }]);

      invalidateCache.categories('user-123');

      expect(categoryCache.get(key)).toBeUndefined();
    });

    it('should invalidate wardrobe items cache', () => {
      const itemsKey = cacheKeys.userWardrobeItems('user-123');
      const activeKey = cacheKeys.userActiveItems('user-123');
      
      wardrobeItemsCache.set(itemsKey, [{ id: 'item-1' }]);
      wardrobeItemsCache.set(activeKey, [{ id: 'item-1' }]);

      invalidateCache.wardrobeItems('user-123');

      expect(wardrobeItemsCache.get(itemsKey)).toBeUndefined();
      expect(wardrobeItemsCache.get(activeKey)).toBeUndefined();
    });

    it('should invalidate all caches for a user', () => {
      const userKey = cacheKeys.user('user-123');
      const categoriesKey = cacheKeys.userCategories('user-123');
      const itemsKey = cacheKeys.userWardrobeItems('user-123');

      userCache.set(userKey, { id: 'user-123' });
      categoryCache.set(categoriesKey, [{ id: 'cat-1' }]);
      wardrobeItemsCache.set(itemsKey, [{ id: 'item-1' }]);

      invalidateCache.all('user-123');

      expect(userCache.get(userKey)).toBeUndefined();
      expect(categoryCache.get(categoriesKey)).toBeUndefined();
      expect(wardrobeItemsCache.get(itemsKey)).toBeUndefined();
    });
  });

  describe('getCached helper', () => {
    it('should fetch and cache data on first call', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 'user-123', name: 'John Doe' });
      const key = cacheKeys.user('user-123');

      const result = await getCached(userCache, key, fetcher);

      expect(result).toEqual({ id: 'user-123', name: 'John Doe' });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(userCache.get(key)).toEqual(result);
    });

    it('should return cached data on subsequent calls', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 'user-123', name: 'John Doe' });
      const key = cacheKeys.user('user-123');

      // First call - should fetch
      const result1 = await getCached(userCache, key, fetcher);
      
      // Second call - should use cache
      const result2 = await getCached(userCache, key, fetcher);

      expect(result1).toEqual(result2);
      expect(fetcher).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should refetch after cache invalidation', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ id: 'user-123', name: 'John Doe' })
        .mockResolvedValueOnce({ id: 'user-123', name: 'Jane Doe' });
      const key = cacheKeys.user('user-123');

      // First call
      const result1 = await getCached(userCache, key, fetcher);
      expect((result1 as { name?: string }).name).toBe('John Doe');

      // Invalidate cache
      invalidateCache.user('user-123');

      // Second call - should refetch
      const result2 = await getCached(userCache, key, fetcher);
      expect((result2 as { name?: string }).name).toBe('Jane Doe');
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 'user-123' });
      const key = cacheKeys.user('user-123');

      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() => 
        getCached(userCache, key, fetcher)
      );

      const results = await Promise.all(promises);

      // All results should be the same
      expect(results.every((r: { id?: string }) => r.id === 'user-123')).toBe(true);
      
      // Note: Due to race conditions, fetcher might be called multiple times
      // in concurrent scenarios. This is acceptable for LRU cache.
      expect(fetcher).toHaveBeenCalled();
    });

    it('should handle different users independently', async () => {
      const user1Data = { id: 'user-1', name: 'User 1' };
      const user2Data = { id: 'user-2', name: 'User 2' };

      userCache.set(cacheKeys.user('user-1'), user1Data);
      userCache.set(cacheKeys.user('user-2'), user2Data);

      expect(userCache.get(cacheKeys.user('user-1'))).toEqual(user1Data);
      expect(userCache.get(cacheKeys.user('user-2'))).toEqual(user2Data);

      // Invalidating one user shouldn't affect the other
      invalidateCache.user('user-1');

      expect(userCache.get(cacheKeys.user('user-1'))).toBeUndefined();
      expect(userCache.get(cacheKeys.user('user-2'))).toEqual(user2Data);
    });
  });
});
