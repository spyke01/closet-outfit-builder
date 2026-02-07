/**
 * DOM Batch Operations Utility
 * 
 * Provides utilities for batching DOM reads and writes to avoid layout thrashing.
 * Layout thrashing occurs when JavaScript alternates between reading and writing
 * to the DOM, forcing the browser to recalculate layout multiple times.
 * 
 * Best practices:
 * 1. Batch all DOM reads together
 * 2. Batch all DOM writes together
 * 3. Use CSS classes instead of inline styles when possible
 * 4. Use requestAnimationFrame for visual updates
 */

interface DOMOperation {
  read?: () => void
  write?: () => void
}

/**
 * Batches DOM operations to avoid layout thrashing
 * Executes all reads first, then all writes
 */
export function batchDOMOperations(operations: DOMOperation[]): void {
  // Execute all reads first
  operations.forEach(op => op.read?.())
  
  // Then execute all writes
  operations.forEach(op => op.write?.())
}

/**
 * Schedules DOM operations in the next animation frame
 * Useful for visual updates that should be synchronized with the browser's repaint
 */
export function scheduleDOMUpdate(callback: () => void): number {
  return requestAnimationFrame(callback)
}

/**
 * Batches multiple DOM reads and returns results
 */
export function batchDOMReads<T>(reads: Array<() => T>): T[] {
  return reads.map(read => read())
}

/**
 * Batches multiple DOM writes
 */
export function batchDOMWrites(writes: Array<() => void>): void {
  writes.forEach(write => write())
}

/**
 * Applies multiple CSS classes at once instead of one-by-one
 * More efficient than multiple classList.add() calls
 */
export function applyClasses(element: HTMLElement, classes: string[]): void {
  element.className = [...new Set([...element.className.split(' '), ...classes])]
    .filter(Boolean)
    .join(' ')
}

/**
 * Removes multiple CSS classes at once
 */
export function removeClasses(element: HTMLElement, classes: string[]): void {
  const classSet = new Set(classes)
  element.className = element.className
    .split(' ')
    .filter(cls => !classSet.has(cls))
    .join(' ')
}

/**
 * Toggles multiple CSS classes at once
 */
export function toggleClasses(element: HTMLElement, classes: string[]): void {
  const currentClasses = new Set(element.className.split(' '))
  
  classes.forEach(cls => {
    if (currentClasses.has(cls)) {
      currentClasses.delete(cls)
    } else {
      currentClasses.add(cls)
    }
  })
  
  element.className = [...currentClasses].filter(Boolean).join(' ')
}

/**
 * Cache for computed styles to avoid repeated getComputedStyle calls
 */
const styleCache = new WeakMap<Element, Map<string, string>>()

/**
 * Gets computed style with caching
 * Note: Cache should be invalidated when styles change
 */
export function getCachedComputedStyle(
  element: Element,
  property: string
): string {
  let cache = styleCache.get(element)
  
  if (!cache) {
    cache = new Map()
    styleCache.set(element, cache)
  }
  
  if (cache.has(property)) {
    return cache.get(property)!
  }
  
  const value = window.getComputedStyle(element).getPropertyValue(property)
  cache.set(property, value)
  
  return value
}

/**
 * Clears the computed style cache for an element
 */
export function clearStyleCache(element: Element): void {
  styleCache.delete(element)
}
