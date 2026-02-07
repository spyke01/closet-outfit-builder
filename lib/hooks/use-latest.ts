import { useRef, useLayoutEffect } from 'react'

/**
 * useLatest hook for stable callback refs
 * 
 * This hook stores the latest value in a ref, allowing you to access
 * fresh values in callbacks without adding them to dependency arrays.
 * This prevents unnecessary effect re-runs while avoiding stale closures.
 * 
 * @example
 * ```tsx
 * function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
 *   const [query, setQuery] = useState('')
 *   const onSearchRef = useLatest(onSearch)
 * 
 *   useEffect(() => {
 *     const timeout = setTimeout(() => onSearchRef.current(query), 300)
 *     return () => clearTimeout(timeout)
 *   }, [query]) // onSearch not in deps, but always fresh
 * }
 * ```
 * 
 * @param value - The value to keep fresh
 * @returns A ref containing the latest value
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  
  // Use useLayoutEffect to ensure ref is updated before any effects run
  useLayoutEffect(() => {
    ref.current = value
  }, [value])
  
  return ref
}
