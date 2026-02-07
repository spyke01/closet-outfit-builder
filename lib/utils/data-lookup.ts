/**
 * Efficient Data Lookup Utilities
 * 
 * Provides utilities for O(1) data lookups using Maps and Sets instead of O(n) array operations.
 * These optimizations are particularly important for hot paths and large datasets.
 * 
 * Performance improvements:
 * - array.find() is O(n) → Map.get() is O(1)
 * - array.includes() is O(n) → Set.has() is O(1)
 * - Repeated property access in loops → cached once
 */

/**
 * Creates an index Map for O(1) lookups by a key property
 * 
 * @example
 * const users = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]
 * const userById = createIndexMap(users, 'id')
 * const user = userById.get('1') // O(1) instead of users.find(u => u.id === '1')
 */
export function createIndexMap<T, K extends keyof T>(
  items: T[],
  keyProperty: K
): Map<T[K], T> {
  const map = new Map<T[K], T>()
  
  for (const item of items) {
    map.set(item[keyProperty], item)
  }
  
  return map
}

/**
 * Creates a grouped Map for O(1) lookups of arrays by a key property
 * 
 * @example
 * const items = [
 *   { categoryId: '1', name: 'Item A' },
 *   { categoryId: '1', name: 'Item B' },
 *   { categoryId: '2', name: 'Item C' }
 * ]
 * const itemsByCategory = createGroupMap(items, 'categoryId')
 * const category1Items = itemsByCategory.get('1') // [Item A, Item B]
 */
export function createGroupMap<T, K extends keyof T>(
  items: T[],
  keyProperty: K
): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>()
  
  for (const item of items) {
    const key = item[keyProperty]
    const group = map.get(key)
    
    if (group) {
      group.push(item)
    } else {
      map.set(key, [item])
    }
  }
  
  return map
}

/**
 * Creates a Set for O(1) membership checks
 * 
 * @example
 * const activeIds = createSet(activeItems, 'id')
 * if (activeIds.has(itemId)) { ... } // O(1) instead of activeItems.some(i => i.id === itemId)
 */
export function createSet<T, K extends keyof T>(
  items: T[],
  keyProperty: K
): Set<T[K]> {
  const set = new Set<T[K]>()
  
  for (const item of items) {
    set.add(item[keyProperty])
  }
  
  return set
}

/**
 * Creates a multi-key index for lookups by multiple properties
 * 
 * @example
 * const items = [{ userId: '1', categoryId: 'A', name: 'Item' }]
 * const index = createMultiKeyIndex(items, ['userId', 'categoryId'])
 * const item = index.get('1:A') // O(1) lookup by composite key
 */
export function createMultiKeyIndex<T>(
  items: T[],
  keyProperties: Array<keyof T>,
  separator: string = ':'
): Map<string, T> {
  const map = new Map<string, T>()
  
  for (const item of items) {
    const key = keyProperties
      .map(prop => String(item[prop]))
      .join(separator)
    
    map.set(key, item)
  }
  
  return map
}

/**
 * Caches property access in loops to avoid repeated lookups
 * 
 * @example
 * // Before: Repeated property access
 * for (const item of items) {
 *   if (item.category.name === 'Jacket') { ... }
 * }
 * 
 * // After: Cached property access
 * const cache = createPropertyCache(items, item => item.category.name)
 * for (const item of items) {
 *   if (cache.get(item) === 'Jacket') { ... }
 * }
 */
export function createPropertyCache<T, V>(
  items: T[],
  accessor: (item: T) => V
): Map<T, V> {
  const cache = new Map<T, V>()
  
  for (const item of items) {
    cache.set(item, accessor(item))
  }
  
  return cache
}

/**
 * Efficiently finds items matching multiple criteria using indexed lookups
 * 
 * @example
 * const items = [
 *   { id: '1', categoryId: 'A', active: true },
 *   { id: '2', categoryId: 'B', active: true },
 *   { id: '3', categoryId: 'A', active: false }
 * ]
 * 
 * const result = findWithIndex(
 *   items,
 *   { categoryId: 'A', active: true }
 * )
 * // Returns [{ id: '1', categoryId: 'A', active: true }]
 */
export function findWithIndex<T extends Record<string, any>>(
  items: T[],
  criteria: Partial<T>
): T[] {
  const criteriaKeys = Object.keys(criteria) as Array<keyof T>
  
  if (criteriaKeys.length === 0) {
    return items
  }
  
  // Use the first criterion to create an index
  const firstKey = criteriaKeys[0]
  const index = createGroupMap(items, firstKey)
  
  // Get candidates from index
  const candidates = index.get(criteria[firstKey] as T[typeof firstKey]) || []
  
  // Filter candidates by remaining criteria
  if (criteriaKeys.length === 1) {
    return candidates
  }
  
  return candidates.filter(item => {
    for (let i = 1; i < criteriaKeys.length; i++) {
      const key = criteriaKeys[i]
      if (item[key] !== criteria[key]) {
        return false
      }
    }
    return true
  })
}

/**
 * Batch lookup utility for multiple IDs
 * More efficient than multiple individual lookups
 * 
 * @example
 * const userMap = createIndexMap(users, 'id')
 * const selectedUsers = batchLookup(userMap, ['1', '2', '3'])
 */
export function batchLookup<K, V>(
  map: Map<K, V>,
  keys: K[]
): V[] {
  const results: V[] = []
  
  for (const key of keys) {
    const value = map.get(key)
    if (value !== undefined) {
      results.push(value)
    }
  }
  
  return results
}

/**
 * Creates a reverse index (value -> keys that have that value)
 * Useful for finding all items with a specific property value
 * 
 * @example
 * const items = [
 *   { id: '1', tag: 'casual' },
 *   { id: '2', tag: 'casual' },
 *   { id: '3', tag: 'formal' }
 * ]
 * const reverseIndex = createReverseIndex(items, 'id', 'tag')
 * const casualIds = reverseIndex.get('casual') // ['1', '2']
 */
export function createReverseIndex<T, K extends keyof T, V extends keyof T>(
  items: T[],
  keyProperty: K,
  valueProperty: V
): Map<T[V], T[K][]> {
  const map = new Map<T[V], T[K][]>()
  
  for (const item of items) {
    const value = item[valueProperty]
    const key = item[keyProperty]
    
    const keys = map.get(value)
    if (keys) {
      keys.push(key)
    } else {
      map.set(value, [key])
    }
  }
  
  return map
}

/**
 * Efficiently checks if any items match criteria using Set
 * Faster than array.some() for large datasets
 * 
 * @example
 * const activeIds = createSet(activeItems, 'id')
 * const hasActive = hasAnyMatch(activeIds, selectedIds)
 */
export function hasAnyMatch<T>(
  set: Set<T>,
  values: T[]
): boolean {
  for (const value of values) {
    if (set.has(value)) {
      return true
    }
  }
  return false
}

/**
 * Efficiently checks if all items match criteria using Set
 * Faster than array.every() for large datasets
 * 
 * @example
 * const validIds = createSet(validItems, 'id')
 * const allValid = hasAllMatches(validIds, selectedIds)
 */
export function hasAllMatches<T>(
  set: Set<T>,
  values: T[]
): boolean {
  for (const value of values) {
    if (!set.has(value)) {
      return false
    }
  }
  return true
}
