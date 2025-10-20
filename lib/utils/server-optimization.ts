import { QueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/server';
import { queryKeys, cacheUtils } from '../query-client';

// Server-side optimization utilities
export class ServerOptimizer {
  private supabase = createClient();
  private edgeFunctionCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Batch multiple Edge Function calls
  async batchEdgeFunctionCalls<T>(
    calls: Array<{
      functionName: string;
      payload: any;
      cacheKey?: string;
    }>
  ): Promise<T[]> {
    const results = await Promise.allSettled(
      calls.map(async ({ functionName, payload, cacheKey }) => {
        // Check cache first
        if (cacheKey && this.isValidCache(cacheKey)) {
          return this.edgeFunctionCache.get(cacheKey)!.data;
        }
        
        // Make Edge Function call
        const supabase = await this.supabase;
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload,
        });
        
        if (error) throw error;
        
        // Cache the result
        if (cacheKey) {
          this.edgeFunctionCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });
        }
        
        return data;
      })
    );
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error('Edge function call failed:', result.reason);
        return null;
      }
    });
  }
  
  // Optimize outfit scoring with caching
  async scoreOutfitOptimized(
    selection: Record<string, any>,
    userId: string
  ): Promise<{ score: number; breakdown: any }> {
    const cacheKey = `score_${userId}_${JSON.stringify(selection)}`;
    
    if (this.isValidCache(cacheKey)) {
      return this.edgeFunctionCache.get(cacheKey)!.data;
    }
    
    // Check if we can calculate score client-side for simple cases
    const simpleScore = this.calculateSimpleScore(selection);
    if (simpleScore !== null) {
      const result = { score: simpleScore, breakdown: { simple: true } };
      this.edgeFunctionCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      return result;
    }
    
    // Fall back to Edge Function for complex scoring
    const supabase = await this.supabase;
    const { data, error } = await supabase.functions.invoke('score-outfit', {
      body: { selection, userId },
    });
    
    if (error) {
      console.error('Outfit scoring failed:', error);
      return { score: 0, breakdown: {} };
    }
    
    // Cache the result
    this.edgeFunctionCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    
    return data;
  }
  
  // Optimize anchor filtering with server-side caching
  async filterByAnchorOptimized(
    anchorItemId: string,
    userId: string,
    queryClient: QueryClient
  ): Promise<any[]> {
    const cacheKey = `filter_${anchorItemId}_${userId}`;
    
    // Check server cache first
    if (this.isValidCache(cacheKey)) {
      return this.edgeFunctionCache.get(cacheKey)!.data;
    }
    
    // Check if we have wardrobe data in query cache
    const wardrobeItems = queryClient.getQueryData(queryKeys.wardrobe.items(userId));
    if (wardrobeItems) {
      // Perform client-side filtering for better performance
      const filtered = this.filterItemsClientSide(wardrobeItems as any[], anchorItemId);
      
      // Cache the result
      this.edgeFunctionCache.set(cacheKey, {
        data: filtered,
        timestamp: Date.now(),
      });
      
      return filtered;
    }
    
    // Fall back to Edge Function
    const supabase = await this.supabase;
    const { data, error } = await supabase.functions.invoke('filter-by-anchor', {
      body: { anchorItemId, userId },
    });
    
    if (error) {
      console.error('Anchor filtering failed:', error);
      return [];
    }
    
    // Cache the result
    this.edgeFunctionCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    
    return data;
  }
  
  // Batch duplicate checks
  async batchDuplicateChecks(
    outfitCombinations: Array<{ items: string[]; userId: string }>
  ): Promise<boolean[]> {
    const calls = outfitCombinations.map(({ items, userId }) => ({
      functionName: 'check-outfit-duplicate',
      payload: { items, userId },
      cacheKey: `duplicate_${userId}_${items.sort().join(',')}`,
    }));
    
    return this.batchEdgeFunctionCalls<boolean>(calls);
  }
  
  // Prefetch and cache common data
  async prefetchCommonData(userId: string, queryClient: QueryClient): Promise<void> {
    try {
      // Prefetch wardrobe data
      await cacheUtils.prefetchOutfitData(queryClient, userId);
      
      // Prefetch user preferences
      queryClient.prefetchQuery({
        queryKey: queryKeys.user.preferences(userId),
        staleTime: 30 * 60 * 1000, // 30 minutes
      });
      
      // Warm up Edge Function caches with common operations
      const wardrobeItems = queryClient.getQueryData(queryKeys.wardrobe.items(userId));
      if (wardrobeItems && Array.isArray(wardrobeItems) && wardrobeItems.length > 0) {
        // Pre-calculate scores for common combinations
        const commonCombinations = this.generateCommonCombinations(wardrobeItems);
        await Promise.all(
          commonCombinations.slice(0, 5).map(combination =>
            this.scoreOutfitOptimized(combination, userId)
          )
        );
      }
    } catch (error) {
      console.error('Prefetch failed:', error);
    }
  }
  
  // Clean up expired cache entries
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, { timestamp }] of this.edgeFunctionCache.entries()) {
      if (now - timestamp > this.CACHE_TTL) {
        this.edgeFunctionCache.delete(key);
      }
    }
  }
  
  // Get cache statistics
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number;
  } {
    const now = Date.now();
    let oldestTimestamp = now;
    
    for (const { timestamp } of this.edgeFunctionCache.values()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
      }
    }
    
    return {
      size: this.edgeFunctionCache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      oldestEntry: now - oldestTimestamp,
    };
  }
  
  // Private helper methods
  private isValidCache(key: string): boolean {
    const cached = this.edgeFunctionCache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return now - cached.timestamp < this.CACHE_TTL;
  }
  
  private calculateSimpleScore(selection: Record<string, any>): number | null {
    // Simple scoring logic for basic combinations
    const items = Object.values(selection).filter(Boolean);
    if (items.length < 2) return null;
    
    // Basic compatibility scoring
    let score = 50; // Base score
    
    // Add points for complete outfits
    if (items.length >= 3) score += 20;
    if (items.length >= 4) score += 10;
    
    // Simple formality matching (would need actual item data)
    // This is a placeholder for demonstration
    score += Math.random() * 30; // Random variation for demo
    
    return Math.min(100, Math.max(0, Math.round(score)));
  }
  
  private filterItemsClientSide(items: any[], anchorItemId: string): any[] {
    const anchorItem = items.find(item => item.id === anchorItemId);
    if (!anchorItem) return [];
    
    // Simple client-side filtering logic
    return items.filter(item => {
      if (item.id === anchorItemId) return false;
      if (item.category_id === anchorItem.category_id) return false;
      
      // Basic compatibility check (placeholder)
      return true;
    });
  }
  
  private generateCommonCombinations(items: any[]): Array<Record<string, any>> {
    // Generate a few common outfit combinations for pre-caching
    const combinations: Array<Record<string, any>> = [];
    
    const categories = ['jacket', 'shirt', 'pants', 'shoes'];
    const itemsByCategory = categories.reduce((acc, category) => {
      acc[category] = items.filter(item => 
        item.category_id?.toLowerCase().includes(category) ||
        item.name?.toLowerCase().includes(category)
      );
      return acc;
    }, {} as Record<string, any[]>);
    
    // Generate a few combinations
    for (let i = 0; i < 3; i++) {
      const combination: Record<string, any> = {};
      
      categories.forEach(category => {
        const categoryItems = itemsByCategory[category];
        if (categoryItems && categoryItems.length > 0) {
          combination[category] = categoryItems[i % categoryItems.length];
        }
      });
      
      if (Object.keys(combination).length >= 2) {
        combinations.push(combination);
      }
    }
    
    return combinations;
  }
}

// Singleton instance
export const serverOptimizer = new ServerOptimizer();

// Utility for automatic cache cleanup
export const startCacheCleanup = () => {
  if (typeof window !== 'undefined') {
    // Clean up cache every 5 minutes
    setInterval(() => {
      serverOptimizer.cleanupCache();
    }, 5 * 60 * 1000);
  }
};

// Performance monitoring for server operations
export const serverPerformanceMonitor = {
  operationTimes: new Map<string, number[]>(),
  
  startOperation(operationName: string): string {
    const operationId = `${operationName}_${Date.now()}_${Math.random()}`;
    const startTime = performance.now();
    
    if (!this.operationTimes.has(operationName)) {
      this.operationTimes.set(operationName, []);
    }
    
    // Store start time temporarily
    (globalThis as any)[`_perf_${operationId}`] = startTime;
    
    return operationId;
  },
  
  endOperation(operationId: string): number {
    const startTime = (globalThis as any)[`_perf_${operationId}`];
    if (!startTime) return 0;
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Extract operation name from ID
    const operationName = operationId.split('_')[0];
    const times = this.operationTimes.get(operationName) || [];
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
    
    this.operationTimes.set(operationName, times);
    
    // Clean up temporary storage
    delete (globalThis as any)[`_perf_${operationId}`];
    
    return duration;
  },
  
  getAverageTime(operationName: string): number {
    const times = this.operationTimes.get(operationName) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  },
  
  getStats(): Record<string, { average: number; count: number; min: number; max: number }> {
    const stats: Record<string, any> = {};
    
    for (const [operation, times] of this.operationTimes.entries()) {
      if (times.length > 0) {
        stats[operation] = {
          average: times.reduce((a, b) => a + b, 0) / times.length,
          count: times.length,
          min: Math.min(...times),
          max: Math.max(...times),
        };
      }
    }
    
    return stats;
  },
};