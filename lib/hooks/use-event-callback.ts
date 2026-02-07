import { useCallback, useRef, useLayoutEffect } from 'react'

/**
 * useEventCallback hook for stable event handler subscriptions
 * 
 * This hook creates a stable callback reference that always calls the latest
 * version of the provided function. This is useful for event subscriptions
 * where you want to avoid re-subscribing when the handler changes.
 * 
 * This is a polyfill for React's upcoming useEffectEvent hook.
 * 
 * @example
 * ```tsx
 * function Component({ onEvent }: { onEvent: (data: string) => void }) {
 *   const handleEvent = useEventCallback(onEvent)
 * 
 *   useEffect(() => {
 *     // Subscription never needs to re-run when onEvent changes
 *     const unsubscribe = subscribe(handleEvent)
 *     return unsubscribe
 *   }, []) // Empty deps - handleEvent is stable
 * }
 * ```
 * 
 * @param fn - The event handler function
 * @returns A stable callback that always calls the latest version of fn
 */
export function useEventCallback<Args extends unknown[], Return>(
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  const ref = useRef(fn)
  
  // Update ref to latest function before any effects run
  useLayoutEffect(() => {
    ref.current = fn
  }, [fn])
  
  // Return a stable callback that calls the latest function
  return useCallback((...args: Args) => {
    const latestFn = ref.current
    return latestFn(...args)
  }, [])
}

/**
 * useStableCallback hook - alternative name for useEventCallback
 * 
 * Provides the same functionality as useEventCallback with a different name
 * that may be more intuitive in some contexts.
 */
export const useStableCallback = useEventCallback
