import { createLogger } from './logger';

const logger = createLogger({ component: 'lib-utils-function-cache' });


/**
 * Function Performance Optimization Utilities
 * 
 * Provides utilities for caching function results and optimizing repeated computations.
 * These optimizations are particularly important for expensive operations in hot paths.
 * 
 * Performance improvements:
 * - Memoization prevents redundant calculations
 * - Storage caching reduces I/O operations
 * - Proper cache invalidation ensures data freshness
 */

/**
 * Creates a memoized version of a function with Map-based caching
 * 
 * @example
 * const expensiveCalculation = (n: number) => {
 *   // Complex computation
 *   return n * n * n
 * }
 * 
 * const memoized = memoize(expensiveCalculation)
 * memoized(5) // Calculates
 * memoized(5) // Returns cached result
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  keyGenerator?: (...args: TArgs) => string
): (...args: TArgs) => TResult {
  const cache = new Map<string, TResult>()
  
  return (...args: TArgs): TResult => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    
    return result
  }
}

/**
 * Creates a memoized function with LRU (Least Recently Used) cache
 * Automatically evicts old entries when cache size limit is reached
 * 
 * @example
 * const fetchUser = memoizeLRU(
 *   async (id: string) => fetch(`/api/users/${id}`).then(r => r.json()),
 *   { maxSize: 100 }
 * )
 */
export function memoizeLRU<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: {
    maxSize?: number
    keyGenerator?: (...args: TArgs) => string
  } = {}
): (...args: TArgs) => TResult {
  const { maxSize = 100, keyGenerator } = options
  const cache = new Map<string, TResult>()
  
  return (...args: TArgs): TResult => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key)!
      cache.delete(key)
      cache.set(key, value)
      return value
    }
    
    const result = fn(...args)
    
    // Evict oldest entry if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) {
        cache.delete(firstKey)
      }
    }
    
    cache.set(key, result)
    
    return result
  }
}

/**
 * Creates a memoized function with TTL (Time To Live) cache
 * Automatically invalidates cached entries after specified duration
 * 
 * @example
 * const getWeather = memoizeWithTTL(
 *   async (city: string) => fetch(`/api/weather/${city}`).then(r => r.json()),
 *   { ttl: 5 * 60 * 1000 } // 5 minutes
 * )
 */
export function memoizeWithTTL<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: {
    ttl: number // milliseconds
    keyGenerator?: (...args: TArgs) => string
  }
): (...args: TArgs) => TResult {
  const { ttl, keyGenerator } = options
  const cache = new Map<string, { value: TResult; timestamp: number }>()
  
  return (...args: TArgs): TResult => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    const now = Date.now()
    
    const cached = cache.get(key)
    if (cached && now - cached.timestamp < ttl) {
      return cached.value
    }
    
    const result = fn(...args)
    cache.set(key, { value: result, timestamp: now })
    
    return result
  }
}

/**
 * Storage cache for localStorage/sessionStorage with automatic serialization
 * Reduces repeated I/O operations and parsing overhead
 * 
 * @example
 * const storage = createStorageCache('localStorage')
 * storage.set('user', { id: '1', name: 'Alice' })
 * const user = storage.get('user') // Cached, no localStorage read
 */
export function createStorageCache(storageType: 'localStorage' | 'sessionStorage') {
  const cache = new Map<string, unknown>()
  const storage = typeof window !== 'undefined' 
    ? storageType === 'localStorage' ? window.localStorage : window.sessionStorage
    : null
  
  return {
    get<T>(key: string): T | null {
      // Check memory cache first
      if (cache.has(key)) {
        return (cache.get(key) as T | undefined) ?? null
      }
      
      // Read from storage and cache
      if (!storage) return null
      
      try {
        const value = storage.getItem(key)
        if (value === null) return null
        
        const parsed = JSON.parse(value)
        cache.set(key, parsed)
        return parsed
      } catch (error) {
        logger.error(`Error reading from ${storageType}:`, error)
        return null
      }
    },
    
    set<T>(key: string, value: T): void {
      // Update memory cache
      cache.set(key, value)
      
      // Write to storage
      if (!storage) return
      
      try {
        storage.setItem(key, JSON.stringify(value))
      } catch (error) {
        logger.error(`Error writing to ${storageType}:`, error)
      }
    },
    
    remove(key: string): void {
      cache.delete(key)
      storage?.removeItem(key)
    },
    
    clear(): void {
      cache.clear()
      storage?.clear()
    },
    
    invalidate(key: string): void {
      cache.delete(key)
    },
    
    invalidateAll(): void {
      cache.clear()
    }
  }
}

/**
 * Debounced function cache for expensive computations
 * Delays execution until after a specified wait time
 * 
 * @example
 * const search = debounce((query: string) => {
 *   // Expensive search operation
 * }, 300)
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return (...args: TArgs): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, wait)
  }
}

/**
 * Throttled function cache for rate-limiting expensive operations
 * Ensures function is called at most once per specified interval
 * 
 * @example
 * const handleScroll = throttle(() => {
 *   // Expensive scroll handler
 * }, 100)
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  interval: number
): (...args: TArgs) => void {
  let lastCall = 0
  
  return (...args: TArgs): void => {
    const now = Date.now()
    
    if (now - lastCall >= interval) {
      lastCall = now
      fn(...args)
    }
  }
}

/**
 * Creates a cached version of an async function with pending request deduplication
 * Prevents multiple simultaneous requests for the same data
 * 
 * @example
 * const fetchUser = cacheAsync(
 *   async (id: string) => fetch(`/api/users/${id}`).then(r => r.json())
 * )
 * 
 * // Both calls will use the same pending request
 * Promise.all([fetchUser('1'), fetchUser('1')])
 */
export function cacheAsync<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator?: (...args: TArgs) => string
): (...args: TArgs) => Promise<TResult> {
  const cache = new Map<string, TResult>()
  const pending = new Map<string, Promise<TResult>>()
  
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    // Return cached result
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    // Return pending request
    if (pending.has(key)) {
      return pending.get(key)!
    }
    
    // Create new request
    const promise = fn(...args)
    pending.set(key, promise)
    
    try {
      const result = await promise
      cache.set(key, result)
      return result
    } finally {
      pending.delete(key)
    }
  }
}

/**
 * Creates a function that caches results with automatic invalidation
 * Useful for data that changes based on external events
 * 
 * @example
 * const { fn: getUser, invalidate } = createInvalidatableCache(
 *   async (id: string) => fetch(`/api/users/${id}`).then(r => r.json())
 * )
 * 
 * // Later, when user data changes
 * invalidate('user-123')
 */
export function createInvalidatableCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  keyGenerator?: (...args: TArgs) => string
): {
  fn: (...args: TArgs) => TResult
  invalidate: (key: string) => void
  invalidateAll: () => void
  getCache: () => Map<string, TResult>
} {
  const cache = new Map<string, TResult>()
  
  return {
    fn: (...args: TArgs): TResult => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
      
      if (cache.has(key)) {
        return cache.get(key)!
      }
      
      const result = fn(...args)
      cache.set(key, result)
      
      return result
    },
    
    invalidate: (key: string): void => {
      cache.delete(key)
    },
    
    invalidateAll: (): void => {
      cache.clear()
    },
    
    getCache: (): Map<string, TResult> => {
      return cache
    }
  }
}

/**
 * Batches multiple function calls into a single execution
 * Useful for operations that can be performed more efficiently in bulk
 * 
 * @example
 * const batchedFetch = batchCalls(
 *   async (ids: string[]) => fetch(`/api/users?ids=${ids.join(',')}`).then(r => r.json()),
 *   { wait: 10, maxBatchSize: 50 }
 * )
 */
export function batchCalls<TArg, TResult>(
  fn: (args: TArg[]) => Promise<TResult[]>,
  options: {
    wait?: number
    maxBatchSize?: number
  } = {}
): (arg: TArg) => Promise<TResult> {
  const { wait = 10, maxBatchSize = 100 } = options
  
  let batch: Array<{
    arg: TArg
    resolve: (value: TResult) => void
    reject: (error: Error) => void
  }> = []
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  const executeBatch = async () => {
    const currentBatch = batch
    batch = []
    timeoutId = null
    
    try {
      const args = currentBatch.map(item => item.arg)
      const results = await fn(args)
      
      currentBatch.forEach((item, index) => {
        item.resolve(results[index])
      })
    } catch (error) {
      currentBatch.forEach(item => {
        item.reject(error instanceof Error ? error : new Error(String(error)))
      })
    }
  }
  
  return (arg: TArg): Promise<TResult> => {
    return new Promise((resolve, reject) => {
      batch.push({ arg, resolve, reject })
      
      if (batch.length >= maxBatchSize) {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
        executeBatch()
      } else if (timeoutId === null) {
        timeoutId = setTimeout(executeBatch, wait)
      }
    })
  }
}
