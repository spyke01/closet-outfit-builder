/**
 * Regular Expression Optimization Utilities
 * 
 * Provides utilities for optimizing RegExp usage in React components and hot paths.
 * These optimizations prevent unnecessary RegExp recreation and handle global regex state properly.
 * 
 * Performance improvements:
 * - Hoisted RegExp creation avoids recreation on each render
 * - Memoized RegExp prevents unnecessary recompilation
 * - Proper global regex state handling prevents bugs
 * - Compiled regex cache for dynamic patterns
 */

/**
 * Common pre-compiled regular expressions
 * Hoisted to module scope to avoid recreation
 */
export const COMMON_REGEX = {
  // Email validation
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // URL validation
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  
  // UUID validation
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  // Phone number (basic)
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  
  // Alphanumeric
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  
  // Whitespace
  WHITESPACE: /\s+/g,
  
  // HTML tags
  HTML_TAGS: /<[^>]*>/g,
  
  // Numbers
  NUMBERS: /\d+/g,
  
  // Decimal numbers
  DECIMAL: /^-?\d+\.?\d*$/,
  
  // Hex color
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  
  // Slug (URL-friendly)
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  
  // Credit card (basic)
  CREDIT_CARD: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  
  // Postal code (US)
  US_ZIP: /^\d{5}(-\d{4})?$/,
  
  // IP address (v4)
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
} as const

/**
 * Cache for dynamically compiled regular expressions
 * Prevents recompilation of the same pattern
 */
const regexCache = new Map<string, RegExp>()

/**
 * Creates or retrieves a cached RegExp
 * Use this for dynamic patterns that might be created multiple times
 * 
 * @example
 * // Instead of: new RegExp(pattern, 'gi')
 * const regex = getCachedRegex(pattern, 'gi')
 */
export function getCachedRegex(pattern: string, flags?: string): RegExp {
  const key = `${pattern}:${flags || ''}`
  
  if (regexCache.has(key)) {
    return regexCache.get(key)!
  }
  
  const regex = new RegExp(pattern, flags)
  regexCache.set(key, regex)
  
  return regex
}

/**
 * Clears the regex cache
 * Useful for testing or memory management
 */
export function clearRegexCache(): void {
  regexCache.clear()
}

/**
 * Creates a RegExp with proper global state handling
 * Global regexes maintain lastIndex state which can cause bugs
 * This wrapper resets lastIndex before each use
 * 
 * @example
 * const regex = createSafeGlobalRegex(/\d+/g)
 * regex.test('123') // true
 * regex.test('456') // true (lastIndex is reset)
 */
export function createSafeGlobalRegex(pattern: RegExp): {
  test: (str: string) => boolean
  exec: (str: string) => RegExpExecArray | null
  match: (str: string) => RegExpMatchArray | null
  matchAll: (str: string) => IterableIterator<RegExpMatchArray>
} {
  return {
    test: (str: string) => {
      pattern.lastIndex = 0
      return pattern.test(str)
    },
    
    exec: (str: string) => {
      pattern.lastIndex = 0
      return pattern.exec(str)
    },
    
    match: (str: string) => {
      pattern.lastIndex = 0
      return str.match(pattern)
    },
    
    matchAll: (str: string) => {
      pattern.lastIndex = 0
      return str.matchAll(pattern)
    }
  }
}

/**
 * Escapes special regex characters in a string
 * Useful for creating regex from user input
 * 
 * @example
 * const userInput = 'hello (world)'
 * const pattern = escapeRegex(userInput) // 'hello \(world\)'
 * const regex = new RegExp(pattern)
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Creates a case-insensitive search regex from a string
 * Escapes special characters and adds word boundary matching
 * 
 * @example
 * const regex = createSearchRegex('hello')
 * regex.test('Hello World') // true
 */
export function createSearchRegex(searchTerm: string, options: {
  caseSensitive?: boolean
  wholeWord?: boolean
  escapeSpecialChars?: boolean
} = {}): RegExp {
  const {
    caseSensitive = false,
    wholeWord = false,
    escapeSpecialChars = true
  } = options
  
  let pattern = escapeSpecialChars ? escapeRegex(searchTerm) : searchTerm
  
  if (wholeWord) {
    pattern = `\\b${pattern}\\b`
  }
  
  const flags = caseSensitive ? 'g' : 'gi'
  
  return new RegExp(pattern, flags)
}

/**
 * Tests multiple patterns against a string efficiently
 * More efficient than multiple individual regex tests
 * 
 * @example
 * testMultiplePatterns('hello@example.com', [
 *   COMMON_REGEX.EMAIL,
 *   COMMON_REGEX.URL
 * ]) // true (matches email)
 */
export function testMultiplePatterns(
  str: string,
  patterns: RegExp[],
  matchAll: boolean = false
): boolean {
  if (matchAll) {
    return patterns.every(pattern => {
      pattern.lastIndex = 0
      return pattern.test(str)
    })
  }
  
  return patterns.some(pattern => {
    pattern.lastIndex = 0
    return pattern.test(str)
  })
}

/**
 * Extracts all matches from a string using a regex
 * Handles global regex state properly
 * 
 * @example
 * extractAllMatches('abc123def456', /\d+/g)
 * // ['123', '456']
 */
export function extractAllMatches(
  str: string,
  pattern: RegExp
): string[] {
  const matches: string[] = []
  
  // Ensure global flag
  if (!pattern.global) {
    const match = str.match(pattern)
    return match ? [match[0]] : []
  }
  
  pattern.lastIndex = 0
  let match: RegExpExecArray | null
  
  while ((match = pattern.exec(str)) !== null) {
    matches.push(match[0])
    
    // Prevent infinite loop on zero-width matches
    if (match.index === pattern.lastIndex) {
      pattern.lastIndex++
    }
  }
  
  return matches
}

/**
 * Replaces all occurrences using a regex with proper state handling
 * 
 * @example
 * replaceAll('hello world', /o/g, '0')
 * // 'hell0 w0rld'
 */
export function replaceAll(
  str: string,
  pattern: RegExp,
  replacement: string | ((match: string, ...args: unknown[]) => string)
): string {
  pattern.lastIndex = 0
  return str.replace(pattern, replacement as string & ((substring: string, ...args: unknown[]) => string))
}

/**
 * Validates a string against multiple regex patterns
 * Returns which patterns matched
 * 
 * @example
 * validateAgainstPatterns('test@example.com', {
 *   email: COMMON_REGEX.EMAIL,
 *   url: COMMON_REGEX.URL
 * })
 * // { email: true, url: false }
 */
export function validateAgainstPatterns(
  str: string,
  patterns: Record<string, RegExp>
): Record<string, boolean> {
  const results: Record<string, boolean> = {}
  
  for (const [key, pattern] of Object.entries(patterns)) {
    pattern.lastIndex = 0
    results[key] = pattern.test(str)
  }
  
  return results
}

/**
 * Creates a regex for matching file extensions
 * 
 * @example
 * const imageRegex = createFileExtensionRegex(['jpg', 'png', 'gif'])
 * imageRegex.test('photo.jpg') // true
 */
export function createFileExtensionRegex(extensions: string[]): RegExp {
  const pattern = `\\.(${extensions.join('|')})$`
  return new RegExp(pattern, 'i')
}

/**
 * Creates a regex for matching multiple words (OR logic)
 * 
 * @example
 * const regex = createWordMatchRegex(['hello', 'world'])
 * regex.test('hello there') // true
 * regex.test('goodbye') // false
 */
export function createWordMatchRegex(
  words: string[],
  options: {
    caseSensitive?: boolean
    wholeWord?: boolean
  } = {}
): RegExp {
  const { caseSensitive = false, wholeWord = true } = options
  
  const escapedWords = words.map(escapeRegex)
  const pattern = wholeWord
    ? `\\b(${escapedWords.join('|')})\\b`
    : `(${escapedWords.join('|')})`
  
  const flags = caseSensitive ? 'g' : 'gi'
  
  return new RegExp(pattern, flags)
}

/**
 * Highlights matches in a string by wrapping them in a tag
 * 
 * @example
 * highlightMatches('Hello World', /world/i, '<mark>$&</mark>')
 * // 'Hello <mark>World</mark>'
 */
export function highlightMatches(
  str: string,
  pattern: RegExp,
  wrapper: string = '<mark>$&</mark>'
): string {
  pattern.lastIndex = 0
  return str.replace(pattern, wrapper)
}

/**
 * Counts occurrences of a pattern in a string
 * 
 * @example
 * countMatches('hello world hello', /hello/g)
 * // 2
 */
export function countMatches(str: string, pattern: RegExp): number {
  if (!pattern.global) {
    return pattern.test(str) ? 1 : 0
  }
  
  pattern.lastIndex = 0
  let count = 0
  
  while (pattern.exec(str) !== null) {
    count++
  }
  
  return count
}

/**
 * React hook for memoized regex
 * Use this in components to avoid recreating regex on each render
 * 
 * Note: This is a utility function, not a React hook.
 * Import useMemo from React and use it like:
 * 
 * @example
 * import { useMemo } from 'react'
 * 
 * function MyComponent({ pattern }: { pattern: string }) {
 *   const regex = useMemo(() => new RegExp(pattern, 'gi'), [pattern])
 *   // Use regex...
 * }
 */
export function createMemoizedRegex(pattern: string, flags?: string): RegExp {
  return getCachedRegex(pattern, flags)
}
