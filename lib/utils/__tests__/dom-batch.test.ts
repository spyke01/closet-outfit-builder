import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  batchDOMOperations,
  scheduleDOMUpdate,
  batchDOMReads,
  batchDOMWrites,
  applyClasses,
  removeClasses,
  toggleClasses,
  getCachedComputedStyle,
  clearStyleCache
} from '../dom-batch'

describe('DOM Batch Operations', () => {
  describe('batchDOMOperations', () => {
    it('should execute all reads before writes', () => {
      const executionOrder: string[] = []
      
      const operations = [
        {
          read: () => executionOrder.push('read1'),
          write: () => executionOrder.push('write1')
        },
        {
          read: () => executionOrder.push('read2'),
          write: () => executionOrder.push('write2')
        }
      ]
      
      batchDOMOperations(operations)
      
      expect(executionOrder).toEqual(['read1', 'read2', 'write1', 'write2'])
    })
    
    it('should handle operations with only reads', () => {
      const executionOrder: string[] = []
      
      const operations = [
        { read: () => executionOrder.push('read1') },
        { read: () => executionOrder.push('read2') }
      ]
      
      batchDOMOperations(operations)
      
      expect(executionOrder).toEqual(['read1', 'read2'])
    })
    
    it('should handle operations with only writes', () => {
      const executionOrder: string[] = []
      
      const operations = [
        { write: () => executionOrder.push('write1') },
        { write: () => executionOrder.push('write2') }
      ]
      
      batchDOMOperations(operations)
      
      expect(executionOrder).toEqual(['write1', 'write2'])
    })
  })
  
  describe('scheduleDOMUpdate', () => {
    it('should schedule callback in animation frame', () => {
      const callback = vi.fn()
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame')
      
      scheduleDOMUpdate(callback)
      
      expect(rafSpy).toHaveBeenCalledWith(callback)
      
      rafSpy.mockRestore()
    })
  })
  
  describe('batchDOMReads', () => {
    it('should execute all reads and return results', () => {
      const reads = [
        () => 100,
        () => 200,
        () => 300
      ]
      
      const results = batchDOMReads(reads)
      
      expect(results).toEqual([100, 200, 300])
    })
  })
  
  describe('batchDOMWrites', () => {
    it('should execute all writes', () => {
      const executionOrder: string[] = []
      
      const writes = [
        () => executionOrder.push('write1'),
        () => executionOrder.push('write2'),
        () => executionOrder.push('write3')
      ]
      
      batchDOMWrites(writes)
      
      expect(executionOrder).toEqual(['write1', 'write2', 'write3'])
    })
  })
  
  describe('applyClasses', () => {
    let element: HTMLElement
    
    beforeEach(() => {
      element = document.createElement('div')
    })
    
    it('should add multiple classes at once', () => {
      applyClasses(element, ['class1', 'class2', 'class3'])
      
      expect(element.className).toBe('class1 class2 class3')
    })
    
    it('should not duplicate existing classes', () => {
      element.className = 'class1 class2'
      
      applyClasses(element, ['class2', 'class3'])
      
      expect(element.className).toBe('class1 class2 class3')
    })
    
    it('should handle empty class list', () => {
      element.className = 'existing'
      
      applyClasses(element, [])
      
      expect(element.className).toBe('existing')
    })
  })
  
  describe('removeClasses', () => {
    let element: HTMLElement
    
    beforeEach(() => {
      element = document.createElement('div')
    })
    
    it('should remove multiple classes at once', () => {
      element.className = 'class1 class2 class3 class4'
      
      removeClasses(element, ['class2', 'class4'])
      
      expect(element.className).toBe('class1 class3')
    })
    
    it('should handle removing non-existent classes', () => {
      element.className = 'class1 class2'
      
      removeClasses(element, ['class3', 'class4'])
      
      expect(element.className).toBe('class1 class2')
    })
  })
  
  describe('toggleClasses', () => {
    let element: HTMLElement
    
    beforeEach(() => {
      element = document.createElement('div')
    })
    
    it('should toggle multiple classes', () => {
      element.className = 'class1 class2'
      
      toggleClasses(element, ['class2', 'class3'])
      
      expect(element.className).toBe('class1 class3')
    })
    
    it('should add classes that do not exist', () => {
      element.className = 'class1'
      
      toggleClasses(element, ['class2', 'class3'])
      
      expect(element.className).toBe('class1 class2 class3')
    })
    
    it('should remove classes that exist', () => {
      element.className = 'class1 class2 class3'
      
      toggleClasses(element, ['class1', 'class3'])
      
      expect(element.className).toBe('class2')
    })
  })
  
  describe('getCachedComputedStyle', () => {
    let element: HTMLElement
    
    beforeEach(() => {
      element = document.createElement('div')
      document.body.appendChild(element)
    })
    
    afterEach(() => {
      element.remove()
      clearStyleCache(element)
    })
    
    it('should cache computed style values', () => {
      const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle')
      
      // First call should compute
      getCachedComputedStyle(element, 'display')
      expect(getComputedStyleSpy).toHaveBeenCalledTimes(1)
      
      // Second call should use cache
      getCachedComputedStyle(element, 'display')
      expect(getComputedStyleSpy).toHaveBeenCalledTimes(1)
      
      getComputedStyleSpy.mockRestore()
    })
    
    it('should cache different properties separately', () => {
      getCachedComputedStyle(element, 'display')
      getCachedComputedStyle(element, 'color')
      
      const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle')
      
      // Both should be cached
      getCachedComputedStyle(element, 'display')
      getCachedComputedStyle(element, 'color')
      
      expect(getComputedStyleSpy).not.toHaveBeenCalled()
      
      getComputedStyleSpy.mockRestore()
    })
  })
  
  describe('clearStyleCache', () => {
    it('should clear cache for element', () => {
      const element = document.createElement('div')
      document.body.appendChild(element)
      
      // Cache a value
      getCachedComputedStyle(element, 'display')
      
      // Clear cache
      clearStyleCache(element)
      
      const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle')
      
      // Should recompute after cache clear
      getCachedComputedStyle(element, 'display')
      expect(getComputedStyleSpy).toHaveBeenCalledTimes(1)
      
      element.remove()
      getComputedStyleSpy.mockRestore()
    })
  })
})
