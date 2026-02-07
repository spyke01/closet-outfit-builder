/**
 * Efficient Array Operations Utilities
 * 
 * Provides optimized array operations that are more efficient than standard methods.
 * These optimizations are particularly important for large arrays and hot paths.
 * 
 * Performance improvements:
 * - Early returns reduce unnecessary iterations
 * - Single-pass algorithms reduce time complexity
 * - Immutable operations prevent mutation bugs
 * - Optimized min/max without sorting
 */

/**
 * Checks if two arrays are equal with early length check
 * O(1) for different lengths, O(n) for same length
 * 
 * @example
 * areArraysEqual([1, 2, 3], [1, 2, 3]) // true
 * areArraysEqual([1, 2], [1, 2, 3]) // false (early return)
 */
export function areArraysEqual<T>(
  arr1: T[],
  arr2: T[],
  compareFn?: (a: T, b: T) => boolean
): boolean {
  // Early return for length mismatch - O(1)
  if (arr1.length !== arr2.length) {
    return false
  }
  
  const compare = compareFn || ((a, b) => a === b)
  
  // Early return on first mismatch
  for (let i = 0; i < arr1.length; i++) {
    if (!compare(arr1[i], arr2[i])) {
      return false
    }
  }
  
  return true
}

/**
 * Finds minimum value in array using single pass
 * O(n) instead of O(n log n) for sort-based approach
 * 
 * @example
 * findMin([5, 2, 8, 1, 9]) // 1
 * findMin([], 0) // 0 (default value)
 */
export function findMin(
  arr: number[],
  defaultValue?: number
): number | undefined {
  if (arr.length === 0) {
    return defaultValue
  }
  
  let min = arr[0]
  
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) {
      min = arr[i]
    }
  }
  
  return min
}

/**
 * Finds maximum value in array using single pass
 * O(n) instead of O(n log n) for sort-based approach
 * 
 * @example
 * findMax([5, 2, 8, 1, 9]) // 9
 * findMax([], 0) // 0 (default value)
 */
export function findMax(
  arr: number[],
  defaultValue?: number
): number | undefined {
  if (arr.length === 0) {
    return defaultValue
  }
  
  let max = arr[0]
  
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i]
    }
  }
  
  return max
}

/**
 * Finds both min and max in a single pass
 * More efficient than calling findMin and findMax separately
 * 
 * @example
 * findMinMax([5, 2, 8, 1, 9]) // { min: 1, max: 9 }
 */
export function findMinMax(
  arr: number[]
): { min: number; max: number } | undefined {
  if (arr.length === 0) {
    return undefined
  }
  
  let min = arr[0]
  let max = arr[0]
  
  for (let i = 1; i < arr.length; i++) {
    const value = arr[i]
    if (value < min) {
      min = value
    } else if (value > max) {
      max = value
    }
  }
  
  return { min, max }
}

/**
 * Immutable sort using toSorted()
 * Prevents mutation bugs from sort()
 * 
 * @example
 * const arr = [3, 1, 2]
 * const sorted = immutableSort(arr)
 * // arr is unchanged: [3, 1, 2]
 * // sorted is: [1, 2, 3]
 */
export function immutableSort<T>(
  arr: T[],
  compareFn?: (a: T, b: T) => number
): T[] {
  // Use toSorted if available (ES2023)
  if ('toSorted' in Array.prototype) {
    return (arr as any).toSorted(compareFn)
  }
  
  // Fallback: create copy and sort
  return [...arr].sort(compareFn)
}

/**
 * Immutable reverse using toReversed()
 * Prevents mutation bugs from reverse()
 * 
 * @example
 * const arr = [1, 2, 3]
 * const reversed = immutableReverse(arr)
 * // arr is unchanged: [1, 2, 3]
 * // reversed is: [3, 2, 1]
 */
export function immutableReverse<T>(arr: T[]): T[] {
  // Use toReversed if available (ES2023)
  if ('toReversed' in Array.prototype) {
    return (arr as any).toReversed()
  }
  
  // Fallback: create copy and reverse
  return [...arr].reverse()
}

/**
 * Finds first element matching predicate with early return
 * More explicit than array.find() for performance-critical code
 * 
 * @example
 * findFirst([1, 2, 3, 4], x => x > 2) // 3
 * findFirst([1, 2, 3], x => x > 10) // undefined
 */
export function findFirst<T>(
  arr: T[],
  predicate: (item: T, index: number) => boolean
): T | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i)) {
      return arr[i]
    }
  }
  
  return undefined
}

/**
 * Finds last element matching predicate
 * More efficient than reversing and finding first
 * 
 * @example
 * findLast([1, 2, 3, 4, 3], x => x === 3) // 3 (last occurrence)
 */
export function findLast<T>(
  arr: T[],
  predicate: (item: T, index: number) => boolean
): T | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i], i)) {
      return arr[i]
    }
  }
  
  return undefined
}

/**
 * Checks if array contains any element matching predicate with early return
 * More efficient than filter().length > 0
 * 
 * @example
 * hasAny([1, 2, 3], x => x > 2) // true
 * hasAny([1, 2, 3], x => x > 10) // false
 */
export function hasAny<T>(
  arr: T[],
  predicate: (item: T) => boolean
): boolean {
  for (const item of arr) {
    if (predicate(item)) {
      return true
    }
  }
  
  return false
}

/**
 * Checks if all elements match predicate with early return
 * More efficient than filter().length === arr.length
 * 
 * @example
 * hasAll([1, 2, 3], x => x > 0) // true
 * hasAll([1, 2, 3], x => x > 2) // false
 */
export function hasAll<T>(
  arr: T[],
  predicate: (item: T) => boolean
): boolean {
  for (const item of arr) {
    if (!predicate(item)) {
      return false
    }
  }
  
  return true
}

/**
 * Counts elements matching predicate in single pass
 * More efficient than filter().length
 * 
 * @example
 * count([1, 2, 3, 4, 5], x => x > 2) // 3
 */
export function count<T>(
  arr: T[],
  predicate: (item: T) => boolean
): number {
  let count = 0
  
  for (const item of arr) {
    if (predicate(item)) {
      count++
    }
  }
  
  return count
}

/**
 * Partitions array into two arrays based on predicate in single pass
 * More efficient than separate filter calls
 * 
 * @example
 * partition([1, 2, 3, 4, 5], x => x > 2)
 * // { pass: [3, 4, 5], fail: [1, 2] }
 */
export function partition<T>(
  arr: T[],
  predicate: (item: T) => boolean
): { pass: T[]; fail: T[] } {
  const pass: T[] = []
  const fail: T[] = []
  
  for (const item of arr) {
    if (predicate(item)) {
      pass.push(item)
    } else {
      fail.push(item)
    }
  }
  
  return { pass, fail }
}

/**
 * Removes duplicates from array efficiently
 * Uses Set for O(n) instead of O(n²) for nested loops
 * 
 * @example
 * unique([1, 2, 2, 3, 3, 3]) // [1, 2, 3]
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/**
 * Removes duplicates based on key function
 * 
 * @example
 * uniqueBy([{id: 1}, {id: 2}, {id: 1}], x => x.id)
 * // [{id: 1}, {id: 2}]
 */
export function uniqueBy<T, K>(
  arr: T[],
  keyFn: (item: T) => K
): T[] {
  const seen = new Set<K>()
  const result: T[] = []
  
  for (const item of arr) {
    const key = keyFn(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  
  return result
}

/**
 * Groups array elements by key function
 * More efficient than multiple filter calls
 * 
 * @example
 * groupBy([{type: 'a', val: 1}, {type: 'b', val: 2}, {type: 'a', val: 3}], x => x.type)
 * // Map { 'a' => [{type: 'a', val: 1}, {type: 'a', val: 3}], 'b' => [{type: 'b', val: 2}] }
 */
export function groupBy<T, K>(
  arr: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  
  for (const item of arr) {
    const key = keyFn(item)
    const group = groups.get(key)
    
    if (group) {
      group.push(item)
    } else {
      groups.set(key, [item])
    }
  }
  
  return groups
}

/**
 * Chunks array into smaller arrays of specified size
 * 
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be positive')
  }
  
  const chunks: T[][] = []
  
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  
  return chunks
}

/**
 * Flattens nested arrays by one level
 * More efficient than recursive flatten for known depth
 * 
 * @example
 * flatten([[1, 2], [3, 4], [5]]) // [1, 2, 3, 4, 5]
 */
export function flatten<T>(arr: T[][]): T[] {
  return arr.flat()
}

/**
 * Sums array of numbers efficiently
 * 
 * @example
 * sum([1, 2, 3, 4, 5]) // 15
 */
export function sum(arr: number[]): number {
  let total = 0
  
  for (const value of arr) {
    total += value
  }
  
  return total
}

/**
 * Calculates average of array of numbers
 * 
 * @example
 * average([1, 2, 3, 4, 5]) // 3
 */
export function average(arr: number[]): number | undefined {
  if (arr.length === 0) {
    return undefined
  }
  
  return sum(arr) / arr.length
}

/**
 * Takes first n elements from array
 * More explicit than slice for readability
 * 
 * @example
 * take([1, 2, 3, 4, 5], 3) // [1, 2, 3]
 */
export function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, n))
}

/**
 * Drops first n elements from array
 * 
 * @example
 * drop([1, 2, 3, 4, 5], 2) // [3, 4, 5]
 */
export function drop<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, n))
}
