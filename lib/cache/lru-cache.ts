import { LRUCache } from 'lru-cache';

/**
 * Cross-request LRU caching for server-side data
 * 
 * This module provides LRU caching with automatic eviction for frequently
 * accessed data that can be safely cached across requests.
 * 
 * **Validates: Requirements 5.4**
 */

// User data cache with 5-minute TTL
export const userCache = new LRUCache<string, any>({
  max: 500, // Maximum 500 users in cache
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true, // Reset TTL on access
  updateAgeOnHas: false, // Don't reset TTL on has() check
});

// Category data cache with 10-minute TTL (changes less frequently)
export const categoryCache = new LRUCache<string, any>({
  max: 1000, // Maximum 1000 category entries
  ttl: 1000 * 60 * 10, // 10 minutes
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

// Wardrobe items cache with 5-minute TTL
export const wardrobeItemsCache = new LRUCache<string, any>({
  max: 1000, // Maximum 1000 wardrobe item lists
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

/**
 * Cache key generators
 */
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userCategories: (userId: string) => `categories:${userId}`,
  userWardrobeItems: (userId: string) => `wardrobe:${userId}`,
  userActiveItems: (userId: string) => `wardrobe:active:${userId}`,
};

/**
 * Cache invalidation helpers
 */
export const invalidateCache = {
  user: (userId: string) => {
    userCache.delete(cacheKeys.user(userId));
  },
  
  categories: (userId: string) => {
    categoryCache.delete(cacheKeys.userCategories(userId));
  },
  
  wardrobeItems: (userId: string) => {
    wardrobeItemsCache.delete(cacheKeys.userWardrobeItems(userId));
    wardrobeItemsCache.delete(cacheKeys.userActiveItems(userId));
  },
  
  all: (userId: string) => {
    invalidateCache.user(userId);
    invalidateCache.categories(userId);
    invalidateCache.wardrobeItems(userId);
  },
};

/**
 * Cached data fetcher with automatic caching
 */
export async function getCached<T>(
  cache: LRUCache<string, T>,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check cache first
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  
  // Fetch and cache
  const data = await fetcher();
  cache.set(key, data);
  return data;
}

/**
 * Example usage patterns
 */

// Example 1: Cache user data
// import { userCache, cacheKeys, getCached } from '@/lib/cache/lru-cache';
// 
// async function getUserData(userId: string) {
//   return getCached(
//     userCache,
//     cacheKeys.user(userId),
//     async () => {
//       const supabase = await createClient();
//       const { data } = await supabase
//         .from('users')
//         .select('*')
//         .eq('id', userId)
//         .single();
//       return data;
//     }
//   );
// }

// Example 2: Cache with invalidation
// import { wardrobeItemsCache, cacheKeys, invalidateCache } from '@/lib/cache/lru-cache';
// 
// async function updateWardrobeItem(userId: string, itemId: string, updates: any) {
//   const supabase = await createClient();
//   await supabase
//     .from('wardrobe_items')
//     .update(updates)
//     .eq('id', itemId);
//   
//   // Invalidate cache after mutation
//   invalidateCache.wardrobeItems(userId);
// }

// Example 3: Conditional caching
// async function getCategories(userId: string, useCache = true) {
//   if (!useCache) {
//     return fetchCategoriesFromDB(userId);
//   }
//   
//   return getCached(
//     categoryCache,
//     cacheKeys.userCategories(userId),
//     () => fetchCategoriesFromDB(userId)
//   );
// }
