'use client';

/**
 * Preload initializer component
 * Initializes intelligent preloading based on feature flags and user intent
 */
import { useEffect } from 'react';
import { preloadByFeatureFlags, preloadCriticalModules } from '@/lib/utils/preload-manager';

export function PreloadInitializer() {
  useEffect(() => {
    // Preload critical modules immediately
    preloadCriticalModules();

    // Preload based on feature flags after a short delay
    const timeoutId = setTimeout(() => {
      preloadByFeatureFlags();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
