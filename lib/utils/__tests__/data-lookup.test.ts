import { describe, it, expect } from 'vitest'
import {
  createIndexMap,
  createGroupMap,
  createSet,
  createMultiKeyIndex,
  createPropertyCache,
  findWithIndex,
  batchLookup,
  createReverseIndex,
  hasAnyMatch,
  hasAllMatches
} from '../data-lookup'

interface TestItem {
  id: string
  categoryId: string
  name: string
  active: boolean
  tags?: string[]
}

describe('Data Lookup Utilities', () => {
  const testItems: TestItem[] = [
    { id: '1', categoryId: 'A', name: 'Item 1', active: true, tags: ['casual'] },
    { id: '2', categoryId: 'A', name: 'Item 2', active: false, tags: ['formal'] },
    { id: '3', categoryId: 'B', name: 'Item 3', active: true, tags: ['casual', 'sport'] },
    { id: '4', categoryId: 'B', name: 'Item 4', active: true, tags: ['formal'] },
    { id: '5', categoryId: 'C', name: 'Item 5', active: false, tags: ['casual'] }
  ]
  
  describe('createIndexMap', () => {
    it('should create O(1) lookup map by key', () => {
      const itemById = createIndexMap(testItems, 'id')
      
      expect(itemById.get('1')).toEqual(testItems[0])
      expect(itemById.get('3')).toEqual(testItems[2])
      expect(itemById.get('999')).toBeUndefined()
    })
    
    it('should handle empty arrays', () => {
      const emptyMap = createIndexMap([], 'id')
      
      expect(emptyMap.size).toBe(0)
    })
    
    it('should handle duplicate keys by keeping last value', () => {
      const items = [
        { id: '1', name: 'First' },
        { id: '1', name: 'Second' }
      ]
      
      const map = createIndexMap(items, 'id')
      
      expect(map.get('1')).toEqual({ id: '1', name: 'Second' })
    })
  })
  
  describe('createGroupMap', () => {
    it('should group items by key', () => {
      const itemsByCategory = createGroupMap(testItems, 'categoryId')
      
      expect(itemsByCategory.get('A')).toHaveLength(2)
      expect(itemsByCategory.get('B')).toHaveLength(2)
      expect(itemsByCategory.get('C')).toHaveLength(1)
    })
    
    it('should return undefined for non-existent groups', () => {
      const itemsByCategory = createGroupMap(testItems, 'categoryId')
      
      expect(itemsByCategory.get('Z')).toBeUndefined()
    })
    
    it('should handle empty arrays', () => {
      const emptyMap = createGroupMap([], 'categoryId')
      
      expect(emptyMap.size).toBe(0)
    })
  })
  
  describe('createSet', () => {
    it('should create set for O(1) membership checks', () => {
      const activeIds = createSet(
        testItems.filter(item => item.active),
        'id'
      )
      
      expect(activeIds.has('1')).toBe(true)
      expect(activeIds.has('3')).toBe(true)
      expect(activeIds.has('2')).toBe(false)
      expect(activeIds.has('5')).toBe(false)
    })
    
    it('should handle empty arrays', () => {
      const emptySet = createSet([], 'id')
      
      expect(emptySet.size).toBe(0)
    })
  })
  
  describe('createMultiKeyIndex', () => {
    it('should create composite key index', () => {
      const index = createMultiKeyIndex(testItems, ['categoryId', 'active'])
      
      expect(index.get('A:true')).toEqual(testItems[0])
      expect(index.get('B:true')).toBeDefined()
      expect(index.get('C:false')).toEqual(testItems[4])
    })
    
    it('should support custom separator', () => {
      const index = createMultiKeyIndex(testItems, ['categoryId', 'active'], '|')
      
      expect(index.get('A|true')).toEqual(testItems[0])
    })
    
    it('should handle single key', () => {
      const index = createMultiKeyIndex(testItems, ['id'])
      
      expect(index.get('1')).toEqual(testItems[0])
    })
  })
  
  describe('createPropertyCache', () => {
    it('should cache property access', () => {
      const cache = createPropertyCache(testItems, item => item.name.toUpperCase())
      
      expect(cache.get(testItems[0])).toBe('ITEM 1')
      expect(cache.get(testItems[2])).toBe('ITEM 3')
    })
    
    it('should cache complex property access', () => {
      const cache = createPropertyCache(
        testItems,
        item => `${item.categoryId}-${item.name}`
      )
      
      expect(cache.get(testItems[0])).toBe('A-Item 1')
      expect(cache.get(testItems[2])).toBe('B-Item 3')
    })
  })
  
  describe('findWithIndex', () => {
    it('should find items matching single criterion', () => {
      const results = findWithIndex(testItems, { categoryId: 'A' })
      
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('1')
      expect(results[1].id).toBe('2')
    })
    
    it('should find items matching multiple criteria', () => {
      const results = findWithIndex(testItems, { categoryId: 'B', active: true })
      
      expect(results).toHaveLength(2)
      expect(results.every(item => item.categoryId === 'B' && item.active)).toBe(true)
    })
    
    it('should return empty array for no matches', () => {
      const results = findWithIndex(testItems, { categoryId: 'Z' })
      
      expect(results).toHaveLength(0)
    })
    
    it('should return all items for empty criteria', () => {
      const results = findWithIndex(testItems, {})
      
      expect(results).toHaveLength(testItems.length)
    })
  })
  
  describe('batchLookup', () => {
    it('should lookup multiple keys efficiently', () => {
      const itemById = createIndexMap(testItems, 'id')
      const results = batchLookup(itemById, ['1', '3', '5'])
      
      expect(results).toHaveLength(3)
      expect(results[0].id).toBe('1')
      expect(results[1].id).toBe('3')
      expect(results[2].id).toBe('5')
    })
    
    it('should skip non-existent keys', () => {
      const itemById = createIndexMap(testItems, 'id')
      const results = batchLookup(itemById, ['1', '999', '3'])
      
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('1')
      expect(results[1].id).toBe('3')
    })
    
    it('should handle empty key array', () => {
      const itemById = createIndexMap(testItems, 'id')
      const results = batchLookup(itemById, [])
      
      expect(results).toHaveLength(0)
    })
  })
  
  describe('createReverseIndex', () => {
    it('should create reverse index', () => {
      const reverseIndex = createReverseIndex(testItems, 'id', 'categoryId')
      
      expect(reverseIndex.get('A')).toEqual(['1', '2'])
      expect(reverseIndex.get('B')).toEqual(['3', '4'])
      expect(reverseIndex.get('C')).toEqual(['5'])
    })
    
    it('should handle non-existent values', () => {
      const reverseIndex = createReverseIndex(testItems, 'id', 'categoryId')
      
      expect(reverseIndex.get('Z')).toBeUndefined()
    })
  })
  
  describe('hasAnyMatch', () => {
    it('should return true if any value matches', () => {
      const activeIds = createSet(
        testItems.filter(item => item.active),
        'id'
      )
      
      expect(hasAnyMatch(activeIds, ['1', '2'])).toBe(true)
      expect(hasAnyMatch(activeIds, ['3', '4'])).toBe(true)
    })
    
    it('should return false if no values match', () => {
      const activeIds = createSet(
        testItems.filter(item => item.active),
        'id'
      )
      
      expect(hasAnyMatch(activeIds, ['2', '5'])).toBe(false)
    })
    
    it('should handle empty value array', () => {
      const activeIds = createSet(
        testItems.filter(item => item.active),
        'id'
      )
      
      expect(hasAnyMatch(activeIds, [])).toBe(false)
    })
  })
  
  describe('hasAllMatches', () => {
    it('should return true if all values match', () => {
      const activeIds = createSet(
        testItems.filter(item => item.active),
        'id'
      )
      
      expect(hasAllMatches(activeIds, ['1', '3', '4'])).toBe(true)
    })
    
    it('should return false if any value does not match', () => {
      const activeIds = createSet(
        testItems.filter(item => item.active),
        'id'
      )
      
      expect(hasAllMatches(activeIds, ['1', '2', '3'])).toBe(false)
    })
    
    it('should return true for empty value array', () => {
      const activeIds = createSet(
        testItems.filter(item => item.active),
        'id'
      )
      
      expect(hasAllMatches(activeIds, [])).toBe(true)
    })
  })
  
  describe('Performance comparison', () => {
    it('should demonstrate Map.get() is faster than array.find()', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `Item ${i}`
      }))
      
      // Create index
      const itemById = createIndexMap(largeArray, 'id')
      
      // Map lookup is O(1)
      const startMap = performance.now()
      for (let i = 0; i < 100; i++) {
        itemById.get('500')
      }
      const endMap = performance.now()
      const mapTime = endMap - startMap
      
      // Array find is O(n)
      const startArray = performance.now()
      for (let i = 0; i < 100; i++) {
        largeArray.find(item => item.id === '500')
      }
      const endArray = performance.now()
      const arrayTime = endArray - startArray
      
      // Map should be significantly faster
      expect(mapTime).toBeLessThan(arrayTime)
    })
  })
})
