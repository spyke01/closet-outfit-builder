import { describe, it, expect, beforeEach } from 'vitest'
import {
  COMMON_REGEX,
  getCachedRegex,
  clearRegexCache,
  createSafeGlobalRegex,
  escapeRegex,
  createSearchRegex,
  testMultiplePatterns,
  extractAllMatches,
  replaceAll,
  validateAgainstPatterns,
  createFileExtensionRegex,
  createWordMatchRegex,
  highlightMatches,
  countMatches,
  createMemoizedRegex
} from '../regex-optimization'

describe('Regex Optimization Utilities', () => {
  beforeEach(() => {
    clearRegexCache()
  })
  
  describe('COMMON_REGEX', () => {
    it('should validate email addresses', () => {
      expect(COMMON_REGEX.EMAIL.test('test@example.com')).toBe(true)
      expect(COMMON_REGEX.EMAIL.test('invalid-email')).toBe(false)
    })
    
    it('should validate URLs', () => {
      expect(COMMON_REGEX.URL.test('https://example.com')).toBe(true)
      expect(COMMON_REGEX.URL.test('not-a-url')).toBe(false)
    })
    
    it('should validate UUIDs', () => {
      expect(COMMON_REGEX.UUID.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
      expect(COMMON_REGEX.UUID.test('invalid-uuid')).toBe(false)
    })
    
    it('should validate hex colors', () => {
      expect(COMMON_REGEX.HEX_COLOR.test('#FF5733')).toBe(true)
      expect(COMMON_REGEX.HEX_COLOR.test('#F57')).toBe(true)
      expect(COMMON_REGEX.HEX_COLOR.test('FF5733')).toBe(false)
    })
  })
  
  describe('getCachedRegex', () => {
    it('should cache regex patterns', () => {
      const regex1 = getCachedRegex('test', 'gi')
      const regex2 = getCachedRegex('test', 'gi')
      
      expect(regex1).toBe(regex2)
    })
    
    it('should create different cache entries for different flags', () => {
      const regex1 = getCachedRegex('test', 'g')
      const regex2 = getCachedRegex('test', 'i')
      
      expect(regex1).not.toBe(regex2)
    })
  })
  
  describe('createSafeGlobalRegex', () => {
    it('should reset lastIndex on each test', () => {
      const pattern = /\d+/g
      const safe = createSafeGlobalRegex(pattern)
      
      expect(safe.test('123')).toBe(true)
      expect(safe.test('456')).toBe(true)
    })
    
    it('should reset lastIndex on each exec', () => {
      const pattern = /\d+/g
      const safe = createSafeGlobalRegex(pattern)
      
      expect(safe.exec('123')?.[0]).toBe('123')
      expect(safe.exec('456')?.[0]).toBe('456')
    })
  })
  
  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegex('hello (world)')).toBe('hello \\(world\\)')
      expect(escapeRegex('$100')).toBe('\\$100')
      expect(escapeRegex('a.b*c+d?')).toBe('a\\.b\\*c\\+d\\?')
    })
  })
  
  describe('createSearchRegex', () => {
    it('should create case-insensitive search by default', () => {
      const regex = createSearchRegex('hello')
      
      expect(regex.test('Hello World')).toBe(true)
      
      // Reset lastIndex for global regex
      regex.lastIndex = 0
      expect(regex.test('HELLO')).toBe(true)
    })
    
    it('should support case-sensitive search', () => {
      const regex = createSearchRegex('hello', { caseSensitive: true })
      
      expect(regex.test('hello')).toBe(true)
      expect(regex.test('Hello')).toBe(false)
    })
    
    it('should support whole word matching', () => {
      const regex = createSearchRegex('cat', { wholeWord: true })
      
      expect(regex.test('cat')).toBe(true)
      expect(regex.test('category')).toBe(false)
    })
  })
  
  describe('testMultiplePatterns', () => {
    it('should test if any pattern matches', () => {
      const result = testMultiplePatterns('test@example.com', [
        COMMON_REGEX.EMAIL,
        COMMON_REGEX.URL
      ])
      
      expect(result).toBe(true)
    })
    
    it('should test if all patterns match', () => {
      const result = testMultiplePatterns('test@example.com', [
        COMMON_REGEX.EMAIL,
        /test/
      ], true)
      
      expect(result).toBe(true)
    })
    
    it('should return false if no patterns match', () => {
      const result = testMultiplePatterns('invalid', [
        COMMON_REGEX.EMAIL,
        COMMON_REGEX.URL
      ])
      
      expect(result).toBe(false)
    })
  })
  
  describe('extractAllMatches', () => {
    it('should extract all matches from string', () => {
      const matches = extractAllMatches('abc123def456', /\d+/g)
      
      expect(matches).toEqual(['123', '456'])
    })
    
    it('should handle non-global regex', () => {
      const matches = extractAllMatches('abc123def456', /\d+/)
      
      expect(matches).toEqual(['123'])
    })
    
    it('should return empty array for no matches', () => {
      const matches = extractAllMatches('abc', /\d+/g)
      
      expect(matches).toEqual([])
    })
  })
  
  describe('replaceAll', () => {
    it('should replace all occurrences', () => {
      const result = replaceAll('hello world hello', /hello/g, 'hi')
      
      expect(result).toBe('hi world hi')
    })
    
    it('should support function replacement', () => {
      const result = replaceAll('hello world', /\w+/g, (match) => match.toUpperCase())
      
      expect(result).toBe('HELLO WORLD')
    })
  })
  
  describe('validateAgainstPatterns', () => {
    it('should validate against multiple patterns', () => {
      const results = validateAgainstPatterns('test@example.com', {
        email: COMMON_REGEX.EMAIL,
        url: COMMON_REGEX.URL,
        uuid: COMMON_REGEX.UUID
      })
      
      expect(results.email).toBe(true)
      expect(results.url).toBe(false)
      expect(results.uuid).toBe(false)
    })
  })
  
  describe('createFileExtensionRegex', () => {
    it('should match file extensions', () => {
      const regex = createFileExtensionRegex(['jpg', 'png', 'gif'])
      
      expect(regex.test('photo.jpg')).toBe(true)
      expect(regex.test('image.PNG')).toBe(true)
      expect(regex.test('document.pdf')).toBe(false)
    })
  })
  
  describe('createWordMatchRegex', () => {
    it('should match multiple words', () => {
      const regex = createWordMatchRegex(['hello', 'world'])
      
      expect(regex.test('hello there')).toBe(true)
      
      // Reset lastIndex for global regex
      regex.lastIndex = 0
      expect(regex.test('world peace')).toBe(true)
      
      regex.lastIndex = 0
      expect(regex.test('goodbye')).toBe(false)
    })
    
    it('should support whole word matching', () => {
      const regex = createWordMatchRegex(['cat'], { wholeWord: true })
      
      expect(regex.test('cat')).toBe(true)
      expect(regex.test('category')).toBe(false)
    })
  })
  
  describe('highlightMatches', () => {
    it('should wrap matches in tags', () => {
      const result = highlightMatches('Hello World', /world/i)
      
      expect(result).toBe('Hello <mark>World</mark>')
    })
    
    it('should support custom wrapper', () => {
      const result = highlightMatches('Hello World', /world/i, '<strong>$&</strong>')
      
      expect(result).toBe('Hello <strong>World</strong>')
    })
  })
  
  describe('countMatches', () => {
    it('should count matches in string', () => {
      expect(countMatches('hello world hello', /hello/g)).toBe(2)
    })
    
    it('should handle non-global regex', () => {
      expect(countMatches('hello world hello', /hello/)).toBe(1)
    })
    
    it('should return 0 for no matches', () => {
      expect(countMatches('hello', /world/g)).toBe(0)
    })
  })
  
  describe('createMemoizedRegex', () => {
    it('should return same instance for same pattern', () => {
      const regex1 = createMemoizedRegex('test', 'gi')
      const regex2 = createMemoizedRegex('test', 'gi')
      
      expect(regex1).toBe(regex2)
    })
  })
  
  describe('Cache behavior', () => {
    it('should demonstrate cache returns same instance', () => {
      const pattern = 'test\\d+'
      
      clearRegexCache()
      
      const regex1 = getCachedRegex(pattern, 'gi')
      const regex2 = getCachedRegex(pattern, 'gi')
      
      // Should return exact same instance from cache
      expect(regex1).toBe(regex2)
      
      // Should work correctly
      expect(regex1.test('test123')).toBe(true)
    })
  })
})
