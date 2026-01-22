import { useRef, useLayoutEffect } from 'react';

/**
 * useLatest hook for stable callback refs
 * Follows Vercel React best practices for advanced patterns
 * 
 * This hook ensures that callbacks always reference the latest value
 * without causing re-renders when the value changes.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  
  useLayoutEffect(() => {
    ref.current = value;
  });
  
  return ref;
}