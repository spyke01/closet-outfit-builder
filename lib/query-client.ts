import { QueryClient } from '@tantml:react-query';
import type { WardrobeItem } from '@/lib/types/database';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Optimized stale times based on data type
        staleTime: 5 * 60 * 1000, // 5 minutes default
        // Longer garbage collection time for better caching
        gcTime: 30 * 60 * 1000, // 30 minutes
        // Retry failed requests with exponential backoff
        retry: (failureCount, error: Error & { status?: number }) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status && error.status >= 400 && error.status < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        // Optimized retry delay
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Smart refetching strategy
        refetchOnWindowFocus: (query) => {
          // Only refetch if data is older than 2 minutes
          const dataUpdatedAt = query.state.dataUpdatedAt;
          const now = Date.now();
          return now - dataUpdatedAt > 2 * 60 * 1000;
        },
        // Don't refetch on reconnect to avoid excessive requests
        refetchOnReconnect: false,
        // Enable background refetching for better UX
        refetchOnMount: (query) => {
          // Only refetch if data is older than stale time
          const now = Date.now();
          const staleTime = 5 * 60 * 1000; // Use default stale time
          return now - query.state.dataUpdatedAt > staleTime;
        },
        // Network mode for better offline handling
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations once on network errors only
        retry: (failureCount, error: Error & { name?: string; code?: string }) => {
          // Only retry network errors, not validation errors
          if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
            return failureCount < 1;
          }
          return false;
        },
        // Shorter retry delay for mutations
        retryDelay: 1000,
        // Network mode for mutations
        networkMode: 'online',
      },
    },
  });
}

// Enhanced query keys factory with performance considerations
export const queryKeys = {
  wardrobe: {
    all: ['wardrobe'] as const,
    items: (userId: string) => ['wardrobe', 'items', userId] as const,
    item: (id: string) => ['wardrobe', 'item', id] as const,
    categories: (userId: string) => ['wardrobe', 'categories', userId] as const,
    category: (id: string) => ['wardrobe', 'category', id] as const,
    // Optimized keys for filtered data
    itemsByCategory: (userId: string, categoryId: string) => 
      ['wardrobe', 'items', userId, 'category', categoryId] as const,
    activeItems: (userId: string) => 
      ['wardrobe', 'items', userId, 'active'] as const,
  },
  outfits: {
    all: ['outfits'] as const,
    list: (userId: string) => ['outfits', 'list', userId] as const,
    detail: (id: string) => ['outfits', 'detail', id] as const,
    byAnchor: (itemId: string) => ['outfits', 'anchor', itemId] as const,
    duplicateCheck: (items: string[]) => 
      ['outfits', 'duplicate', items.sort().join(',')] as const,
    // Performance-optimized keys
    recent: (userId: string, limit: number = 10) => 
      ['outfits', 'recent', userId, limit] as const,
    loved: (userId: string) => 
      ['outfits', 'loved', userId] as const,
  },
  user: {
    preferences: (userId: string) => ['user', 'preferences', userId] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
  },
  // Edge function results caching
  edgeFunctions: {
    scoreOutfit: (selection: Record<string, any>) => 
      ['edge', 'score', JSON.stringify(selection)] as const,
    filterByAnchor: (anchorId: string, userId: string) => 
      ['edge', 'filter', anchorId, userId] as const,
    duplicateCheck: (outfitItems: string[]) => 
      ['edge', 'duplicate', outfitItems.sort().join(',')] as const,
  },
} as const;

// Cache management utilities
export const cacheUtils = {
  // Invalidate related queries efficiently
  invalidateWardrobeData: (queryClient: QueryClient, userId: string) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.items(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.categories(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.list(userId) }),
    ]);
  },
  
  // Prefetch related data
  prefetchOutfitData: (queryClient: QueryClient, userId: string) => {
    return Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.wardrobe.items(userId),
        staleTime: 10 * 60 * 1000, // 10 minutes for prefetched data
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.outfits.list(userId),
        staleTime: 5 * 60 * 1000, // 5 minutes for recent outfits
      }),
    ]);
  },
  
  // Optimistic update helpers
  updateItemInCache: (
    queryClient: QueryClient, 
    userId: string, 
    itemId: string, 
    updater: (item: WardrobeItem) => WardrobeItem
  ) => {
    queryClient.setQueryData(
      queryKeys.wardrobe.items(userId),
      (oldData: WardrobeItem[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(item => 
          item.id === itemId ? updater(item) : item
        );
      }
    );
  },
  
  // Memory management
  clearStaleQueries: (queryClient: QueryClient) => {
    // Remove queries that haven't been used in the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.state.dataUpdatedAt < oneHourAgo && !query.getObserversCount()) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  },
};

