import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  memoize,
  memoizeLRU,
  memoizeWithTTL,
  createStorageCache,
  debounce,
  throttle,
  cacheAsync,
  createInvalidatableCache,
  batchCalls
} from '../function-cache'

describe('Function Cache Utilities', () => {
  describe('memoize', () => {
    it('should cache function results', () => {
      const fn = vi.fn((n: number) => n * n)
      const memoized = memoize(fn)
      
      expect(memoized(5)).toBe(25)
      expect(memoized(5)).toBe(25)
      expect(fn).toHaveBeenCalledTimes(1)
    })
    
    it('should handle multiple arguments', () => {
      const fn = vi.fn((a: number, b: number) => a + b)
      const memoized = memoize(fn)
      
      expect(memoized(2, 3)).toBe(5)
      expect(memoized(2, 3)).toBe(5)
      expect(fn).toHaveBeenCalledTimes(1)
      
      expect(memoized(3, 4)).toBe(7)
      expect(fn).toHaveBeenCalledTimes(2)
    })
    
    it('should support custom key generator', () => {
      const fn = vi.fn((obj: { id: string }) => obj.id.toUpperCase())
      const memoized = memoize(fn, (obj) => obj.id)
      
      expect(memoized({ id: 'abc' })).toBe('ABC')
      expect(memoized({ id: 'abc' })).toBe('ABC')
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('memoizeLRU', () => {
    it('should cache with LRU eviction', () => {
      const fn = vi.fn((n: number) => n * n)
      const memoized = memoizeLRU(fn, { maxSize: 2 })
      
      memoized(1) // Cache: [1]
      memoized(2) // Cache: [1, 2]
      memoized(3) // Cache: [2, 3] (1 evicted)
      
      expect(fn).toHaveBeenCalledTimes(3)
      
      memoized(2) // Cache hit
      expect(fn).toHaveBeenCalledTimes(3)
      
      memoized(1) // Cache miss (was evicted)
      expect(fn).toHaveBeenCalledTimes(4)
    })
    
    it('should move accessed items to end', () => {
      const fn = vi.fn((n: number) => n * n)
      const memoized = memoizeLRU(fn, { maxSize: 2 })
      
      memoized(1) // Cache: [1]
      memoized(2) // Cache: [1, 2]
      memoized(1) // Cache: [2, 1] (1 moved to end)
      memoized(3) // Cache: [1, 3] (2 evicted, not 1)
      
      expect(fn).toHaveBeenCalledTimes(3)
      
      memoized(1) // Cache hit
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })
  
  describe('memoizeWithTTL', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    
    afterEach(() => {
      vi.useRealTimers()
    })
    
    it('should cache with TTL expiration', () => {
      const fn = vi.fn((n: number) => n * n)
      const memoized = memoizeWithTTL(fn, { ttl: 1000 })
      
      expect(memoized(5)).toBe(25)
      expect(fn).toHaveBeenCalledTimes(1)
      
      // Within TTL
      vi.advanceTimersByTime(500)
      expect(memoized(5)).toBe(25)
      expect(fn).toHaveBeenCalledTimes(1)
      
      // After TTL
      vi.advanceTimersByTime(600)
      expect(memoized(5)).toBe(25)
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('createStorageCache', () => {
    beforeEach(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    it('should cache localStorage reads', () => {
      const cache = createStorageCache('localStorage')
      
      // Set value directly in localStorage (not through cache)
      localStorage.setItem('key', JSON.stringify({ value: 'test' }))
      
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
      
      // First get reads from storage
      expect(cache.get('key')).toEqual({ value: 'test' })
      expect(getItemSpy).toHaveBeenCalledTimes(1)
      
      // Second get uses cache
      expect(cache.get('key')).toEqual({ value: 'test' })
      expect(getItemSpy).toHaveBeenCalledTimes(1)
      
      getItemSpy.mockRestore()
    })
    
    it('should handle remove and clear', () => {
      const cache = createStorageCache('localStorage')
      
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      
      cache.remove('key1')
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBe('value2')
      
      cache.clear()
      expect(cache.get('key2')).toBeNull()
    })
    
    it('should handle invalidation', () => {
      const cache = createStorageCache('localStorage')
      
      cache.set('key', 'value')
      expect(cache.get('key')).toBe('value')
      
      cache.invalidate('key')
      
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
      
      // Should read from storage again
      cache.get('key')
      expect(getItemSpy).toHaveBeenCalled()
      
      getItemSpy.mockRestore()
    })
  })
  
  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    
    afterEach(() => {
      vi.useRealTimers()
    })
    
    it('should delay execution', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      
      debounced()
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
    })
    
    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      
      debounced()
      vi.advanceTimersByTime(50)
      debounced()
      vi.advanceTimersByTime(50)
      
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(50)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    
    afterEach(() => {
      vi.useRealTimers()
    })
    
    it('should limit execution rate', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)
      
      throttled()
      expect(fn).toHaveBeenCalledTimes(1)
      
      throttled()
      expect(fn).toHaveBeenCalledTimes(1)
      
      vi.advanceTimersByTime(100)
      throttled()
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('cacheAsync', () => {
    it('should cache async results', async () => {
      const fn = vi.fn(async (n: number) => n * n)
      const cached = cacheAsync(fn)
      
      expect(await cached(5)).toBe(25)
      expect(await cached(5)).toBe(25)
      expect(fn).toHaveBeenCalledTimes(1)
    })
    
    it('should deduplicate pending requests', async () => {
      let resolveCount = 0
      const fn = vi.fn(async (n: number) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        resolveCount++
        return n * n
      })
      
      const cached = cacheAsync(fn)
      
      const results = await Promise.all([
        cached(5),
        cached(5),
        cached(5)
      ])
      
      expect(results).toEqual([25, 25, 25])
      expect(fn).toHaveBeenCalledTimes(1)
      expect(resolveCount).toBe(1)
    })
  })
  
  describe('createInvalidatableCache', () => {
    it('should cache with manual invalidation', () => {
      const fn = vi.fn((n: number) => n * n)
      const { fn: cached, invalidate } = createInvalidatableCache(fn)
      
      expect(cached(5)).toBe(25)
      expect(cached(5)).toBe(25)
      expect(fn).toHaveBeenCalledTimes(1)
      
      invalidate('[5]')
      
      expect(cached(5)).toBe(25)
      expect(fn).toHaveBeenCalledTimes(2)
    })
    
    it('should support invalidateAll', () => {
      const fn = vi.fn((n: number) => n * n)
      const { fn: cached, invalidateAll } = createInvalidatableCache(fn)
      
      cached(5)
      cached(10)
      expect(fn).toHaveBeenCalledTimes(2)
      
      invalidateAll()
      
      cached(5)
      cached(10)
      expect(fn).toHaveBeenCalledTimes(4)
    })
  })
  
  describe('batchCalls', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    
    afterEach(() => {
      vi.useRealTimers()
    })
    
    it('should batch multiple calls', async () => {
      const fn = vi.fn(async (ids: number[]) => ids.map(id => id * 2))
      const batched = batchCalls(fn, { wait: 10 })
      
      const promise1 = batched(1)
      const promise2 = batched(2)
      const promise3 = batched(3)
      
      vi.advanceTimersByTime(10)
      
      const results = await Promise.all([promise1, promise2, promise3])
      
      expect(results).toEqual([2, 4, 6])
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith([1, 2, 3])
    })
    
    it('should respect maxBatchSize', async () => {
      const fn = vi.fn(async (ids: number[]) => ids.map(id => id * 2))
      const batched = batchCalls(fn, { wait: 100, maxBatchSize: 2 })
      
      const promise1 = batched(1)
      const promise2 = batched(2)
      const promise3 = batched(3)
      
      // First batch executes immediately when size limit reached
      await vi.runAllTimersAsync()
      
      expect(fn).toHaveBeenCalledTimes(2)
      expect(fn).toHaveBeenNthCalledWith(1, [1, 2])
      expect(fn).toHaveBeenNthCalledWith(2, [3])
      
      const results = await Promise.all([promise1, promise2, promise3])
      expect(results).toEqual([2, 4, 6])
    })
  })
})
