import { describe, it, expect } from 'vitest'
import {
  areArraysEqual,
  findMin,
  findMax,
  findMinMax,
  immutableSort,
  immutableReverse,
  findFirst,
  findLast,
  hasAny,
  hasAll,
  count,
  partition,
  unique,
  uniqueBy,
  groupBy,
  chunk,
  flatten,
  sum,
  average,
  take,
  drop
} from '../array-operations'

describe('Array Operations Utilities', () => {
  describe('areArraysEqual', () => {
    it('should return false for different lengths (early return)', () => {
      expect(areArraysEqual([1, 2], [1, 2, 3])).toBe(false)
    })
    
    it('should return true for equal arrays', () => {
      expect(areArraysEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    })
    
    it('should return false for different values', () => {
      expect(areArraysEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    })
    
    it('should support custom compare function', () => {
      const arr1 = [{ id: 1 }, { id: 2 }]
      const arr2 = [{ id: 1 }, { id: 2 }]
      
      expect(areArraysEqual(arr1, arr2, (a, b) => a.id === b.id)).toBe(true)
    })
  })
  
  describe('findMin', () => {
    it('should find minimum value', () => {
      expect(findMin([5, 2, 8, 1, 9])).toBe(1)
    })
    
    it('should return default for empty array', () => {
      expect(findMin([], 0)).toBe(0)
    })
    
    it('should handle single element', () => {
      expect(findMin([42])).toBe(42)
    })
  })
  
  describe('findMax', () => {
    it('should find maximum value', () => {
      expect(findMax([5, 2, 8, 1, 9])).toBe(9)
    })
    
    it('should return default for empty array', () => {
      expect(findMax([], 0)).toBe(0)
    })
    
    it('should handle single element', () => {
      expect(findMax([42])).toBe(42)
    })
  })
  
  describe('findMinMax', () => {
    it('should find both min and max in single pass', () => {
      expect(findMinMax([5, 2, 8, 1, 9])).toEqual({ min: 1, max: 9 })
    })
    
    it('should return undefined for empty array', () => {
      expect(findMinMax([])).toBeUndefined()
    })
    
    it('should handle single element', () => {
      expect(findMinMax([42])).toEqual({ min: 42, max: 42 })
    })
  })
  
  describe('immutableSort', () => {
    it('should sort without mutating original', () => {
      const arr = [3, 1, 2]
      const sorted = immutableSort(arr)
      
      expect(sorted).toEqual([1, 2, 3])
      expect(arr).toEqual([3, 1, 2])
    })
    
    it('should support custom compare function', () => {
      const arr = [1, 2, 3]
      const sorted = immutableSort(arr, (a, b) => b - a)
      
      expect(sorted).toEqual([3, 2, 1])
    })
  })
  
  describe('immutableReverse', () => {
    it('should reverse without mutating original', () => {
      const arr = [1, 2, 3]
      const reversed = immutableReverse(arr)
      
      expect(reversed).toEqual([3, 2, 1])
      expect(arr).toEqual([1, 2, 3])
    })
  })
  
  describe('findFirst', () => {
    it('should find first matching element', () => {
      expect(findFirst([1, 2, 3, 4], x => x > 2)).toBe(3)
    })
    
    it('should return undefined if no match', () => {
      expect(findFirst([1, 2, 3], x => x > 10)).toBeUndefined()
    })
  })
  
  describe('findLast', () => {
    it('should find last matching element', () => {
      expect(findLast([1, 2, 3, 4, 3], x => x === 3)).toBe(3)
    })
    
    it('should return undefined if no match', () => {
      expect(findLast([1, 2, 3], x => x > 10)).toBeUndefined()
    })
  })
  
  describe('hasAny', () => {
    it('should return true if any element matches', () => {
      expect(hasAny([1, 2, 3], x => x > 2)).toBe(true)
    })
    
    it('should return false if no elements match', () => {
      expect(hasAny([1, 2, 3], x => x > 10)).toBe(false)
    })
    
    it('should return false for empty array', () => {
      expect(hasAny([], x => true)).toBe(false)
    })
  })
  
  describe('hasAll', () => {
    it('should return true if all elements match', () => {
      expect(hasAll([1, 2, 3], x => x > 0)).toBe(true)
    })
    
    it('should return false if any element does not match', () => {
      expect(hasAll([1, 2, 3], x => x > 2)).toBe(false)
    })
    
    it('should return true for empty array', () => {
      expect(hasAll([], x => false)).toBe(true)
    })
  })
  
  describe('count', () => {
    it('should count matching elements', () => {
      expect(count([1, 2, 3, 4, 5], x => x > 2)).toBe(3)
    })
    
    it('should return 0 for no matches', () => {
      expect(count([1, 2, 3], x => x > 10)).toBe(0)
    })
  })
  
  describe('partition', () => {
    it('should partition array by predicate', () => {
      const result = partition([1, 2, 3, 4, 5], x => x > 2)
      
      expect(result.pass).toEqual([3, 4, 5])
      expect(result.fail).toEqual([1, 2])
    })
    
    it('should handle all pass', () => {
      const result = partition([1, 2, 3], x => true)
      
      expect(result.pass).toEqual([1, 2, 3])
      expect(result.fail).toEqual([])
    })
    
    it('should handle all fail', () => {
      const result = partition([1, 2, 3], x => false)
      
      expect(result.pass).toEqual([])
      expect(result.fail).toEqual([1, 2, 3])
    })
  })
  
  describe('unique', () => {
    it('should remove duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
    })
    
    it('should handle no duplicates', () => {
      expect(unique([1, 2, 3])).toEqual([1, 2, 3])
    })
  })
  
  describe('uniqueBy', () => {
    it('should remove duplicates by key', () => {
      const arr = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' }
      ]
      
      const result = uniqueBy(arr, x => x.id)
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(2)
    })
  })
  
  describe('groupBy', () => {
    it('should group elements by key', () => {
      const arr = [
        { type: 'a', val: 1 },
        { type: 'b', val: 2 },
        { type: 'a', val: 3 }
      ]
      
      const groups = groupBy(arr, x => x.type)
      
      expect(groups.get('a')).toHaveLength(2)
      expect(groups.get('b')).toHaveLength(1)
    })
  })
  
  describe('chunk', () => {
    it('should chunk array into smaller arrays', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })
    
    it('should handle exact division', () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
    })
    
    it('should throw for invalid size', () => {
      expect(() => chunk([1, 2, 3], 0)).toThrow()
    })
  })
  
  describe('flatten', () => {
    it('should flatten nested arrays', () => {
      expect(flatten([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5])
    })
  })
  
  describe('sum', () => {
    it('should sum array of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15)
    })
    
    it('should return 0 for empty array', () => {
      expect(sum([])).toBe(0)
    })
  })
  
  describe('average', () => {
    it('should calculate average', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3)
    })
    
    it('should return undefined for empty array', () => {
      expect(average([])).toBeUndefined()
    })
  })
  
  describe('take', () => {
    it('should take first n elements', () => {
      expect(take([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3])
    })
    
    it('should handle n larger than array length', () => {
      expect(take([1, 2], 5)).toEqual([1, 2])
    })
    
    it('should handle negative n', () => {
      expect(take([1, 2, 3], -1)).toEqual([])
    })
  })
  
  describe('drop', () => {
    it('should drop first n elements', () => {
      expect(drop([1, 2, 3, 4, 5], 2)).toEqual([3, 4, 5])
    })
    
    it('should handle n larger than array length', () => {
      expect(drop([1, 2], 5)).toEqual([])
    })
    
    it('should handle negative n', () => {
      expect(drop([1, 2, 3], -1)).toEqual([1, 2, 3])
    })
  })
  
  describe('Performance comparison', () => {
    it('should demonstrate findMin is faster than sort', () => {
      const largeArray = Array.from({ length: 10000 }, () => Math.random())
      
      const startFindMin = performance.now()
      findMin(largeArray)
      const endFindMin = performance.now()
      const findMinTime = endFindMin - startFindMin
      
      const startSort = performance.now()
      Math.min(...largeArray.sort((a, b) => a - b))
      const endSort = performance.now()
      const sortTime = endSort - startSort
      
      // findMin should be significantly faster
      expect(findMinTime).toBeLessThan(sortTime)
    })
  })
})
