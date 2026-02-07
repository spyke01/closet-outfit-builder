'use client';

import useSWRSubscription from 'swr/subscription';
import { useRef, useCallback } from 'react';

interface ScrollSubscriptionOptions {
  throttle?: number;
  passive?: boolean;
}

/**
 * Hook for scroll event subscription with deduplication
 * Prevents multiple scroll listeners across component instances
 */
export function useScrollSubscription(
  callback: (scrollY: number, scrollX: number) => void,
  options: ScrollSubscriptionOptions = {}
) {
  const { throttle = 100, passive = true } = options;
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  callbackRef.current = callback;

  useSWRSubscription(
    'global-scroll',
    (key, { next }: { next: (error?: Error, data?: { x: number; y: number }) => void }) => {
      const handler = () => {
        const now = Date.now();
        
        // Throttle scroll events
        if (throttle && now - lastCallRef.current < throttle) {
          return;
        }
        
        lastCallRef.current = now;
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        callbackRef.current(scrollY, scrollX);
        next(undefined, { x: scrollX, y: scrollY });
      };

      window.addEventListener('scroll', handler, { passive });

      return () => {
        window.removeEventListener('scroll', handler);
      };
    }
  );
}

/**
 * Hook for resize event subscription with deduplication
 */
export function useResizeSubscription(
  callback: (width: number, height: number) => void,
  options: { throttle?: number } = {}
) {
  const { throttle = 100 } = options;
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  useSWRSubscription(
    'global-resize',
    (key, { next }: { next: (error?: Error, data?: { width: number; height: number }) => void }) => {
      const handler = () => {
        const now = Date.now();
        
        if (throttle && now - lastCallRef.current < throttle) {
          return;
        }
        
        lastCallRef.current = now;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        callbackRef.current(width, height);
        next(undefined, { width, height });
      };

      window.addEventListener('resize', handler);

      return () => {
        window.removeEventListener('resize', handler);
      };
    }
  );
}

/**
 * Hook for combined scroll and resize subscription
 * Useful for components that need to reposition based on both events
 */
export function useScrollAndResize(
  callback: (data: { scrollY: number; scrollX: number; width: number; height: number }) => void,
  options: { throttle?: number; passive?: boolean } = {}
) {
  const { throttle = 100, passive = true } = options;
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  const updateCallback = useCallback(() => {
    const now = Date.now();
    
    if (throttle && now - lastCallRef.current < throttle) {
      return;
    }
    
    lastCallRef.current = now;
    callbackRef.current({
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [throttle]);

  useScrollSubscription(updateCallback, { throttle, passive });
  useResizeSubscription(updateCallback, { throttle });
}
