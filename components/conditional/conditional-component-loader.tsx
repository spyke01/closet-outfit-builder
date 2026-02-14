'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { conditionalImport, isFeatureEnabled, type FeatureFlags } from '@/lib/utils/feature-flags';
import { Loader2 } from 'lucide-react';

interface ConditionalComponentLoaderBaseProps<P extends object> {
  feature: keyof FeatureFlags;
  importFn: () => Promise<{ default: React.ComponentType<P> }>;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  preloadOnHover?: boolean;
  children?: React.ReactNode;
}

type ConditionalComponentLoaderProps<P extends object> =
  ConditionalComponentLoaderBaseProps<P> & P;

/**
 * Generic conditional component loader
 * Only loads and renders components when the associated feature is enabled
 */
export function ConditionalComponentLoader<P extends object>({
  feature,
  importFn,
  fallback = null,
  loadingComponent,
  errorComponent,
  preloadOnHover = true,
  children,
  ...componentProps
}: ConditionalComponentLoaderProps<P>) {
  const [Component, setComponent] = useState<React.ComponentType<P> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preloaded, setPreloaded] = useState(false);
  const isMountedRef = useRef(true);

  const featureEnabled = isFeatureEnabled(feature);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadComponent = useCallback(async () => {
    if (loading || Component) {
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedModule = await conditionalImport(feature, importFn);
      
      if (!isMountedRef.current) {
        return;
      }

      if (loadedModule?.default) {
        setComponent(() => loadedModule.default);
      } else {
        throw new Error(`Component not found in module for feature: ${feature}`);
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      console.warn(`Failed to load component for feature ${feature}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load component');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [feature, importFn, loading, Component]);

  // Load component when feature is enabled
  useEffect(() => {
    if (!featureEnabled || Component) {
      return;
    }

    loadComponent();
  }, [featureEnabled, Component, loadComponent]);

  // Preload component on hover/focus with intelligent timing
  const preloadComponent = useCallback(() => {
    if (!preloadOnHover || preloaded || !featureEnabled || Component) {
      return;
    }

    setPreloaded(true);

    // Use requestIdleCallback for non-blocking preload with fallback
    const doPreload = () => {
      conditionalImport(feature, importFn).catch(() => {
        // Silently fail preloading - component will load on demand
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(doPreload, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(doPreload, 100);
    }
  }, [feature, importFn, preloadOnHover, preloaded, featureEnabled, Component]);

  // Don't render anything if feature is disabled
  if (!featureEnabled) {
    return <>{fallback}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <>
        {loadingComponent || (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        {errorComponent || (
          <div className="flex items-center justify-center p-4 text-red-500">
            <span className="text-sm">Failed to load component</span>
          </div>
        )}
      </>
    );
  }

  // Show loaded component
  if (Component) {
    return (
      <Component {...(componentProps as unknown as P)}>
        {children}
      </Component>
    );
  }

  // Show fallback while waiting to load with preload triggers
  return (
    <div
      onMouseEnter={preloadComponent}
      onFocus={preloadComponent}
      onTouchStart={preloadComponent} // Add touch support for mobile
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          preloadComponent();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {fallback}
    </div>
  );
}

/**
 * Higher-order component for conditional loading
 */
// eslint-disable-next-line react-refresh/only-export-components
export function withConditionalLoading<P extends object>(
  feature: keyof FeatureFlags,
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options: {
    fallback?: React.ReactNode;
    loadingComponent?: React.ReactNode;
    errorComponent?: React.ReactNode;
    preloadOnHover?: boolean;
  } = {}
) {
  return function ConditionalComponent(props: P) {
    return (
      <ConditionalComponentLoader
        feature={feature}
        importFn={importFn}
        {...options}
        {...props}
      />
    );
  };
}

/**
 * Preload multiple components based on feature flags with intelligent batching
 */
// eslint-disable-next-line react-refresh/only-export-components
export function preloadConditionalComponents(features: Array<{
  feature: keyof FeatureFlags;
  importFn: () => Promise<unknown>;
  priority?: 'high' | 'medium' | 'low';
}>): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedFeatures = features.sort((a, b) => {
    const aPriority = a.priority || 'medium';
    const bPriority = b.priority || 'medium';
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });

  // Use requestIdleCallback to preload during idle time with intelligent batching
  const preloadBatch = (batch: typeof features, delay = 0) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        setTimeout(() => {
          batch.forEach(({ feature, importFn }, index) => {
            if (isFeatureEnabled(feature)) {
              // Stagger preloads to avoid blocking
              setTimeout(() => {
                conditionalImport(feature, importFn).catch(() => {
                  // Silently fail preloading
                });
              }, index * 50);
            }
          });
        }, delay);
      }, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        batch.forEach(({ feature, importFn }, index) => {
          if (isFeatureEnabled(feature)) {
            setTimeout(() => {
              conditionalImport(feature, importFn).catch(() => {
                // Silently fail preloading
              });
            }, index * 50);
          }
        });
      }, delay + 100);
    }
  };

  // Batch preloading by priority
  const highPriority = sortedFeatures.filter(f => f.priority === 'high');
  const mediumPriority = sortedFeatures.filter(f => f.priority === 'medium' || !f.priority);
  const lowPriority = sortedFeatures.filter(f => f.priority === 'low');

  if (highPriority.length > 0) {
    preloadBatch(highPriority, 0);
  }
  
  if (mediumPriority.length > 0) {
    preloadBatch(mediumPriority, 200);
  }
  
  if (lowPriority.length > 0) {
    preloadBatch(lowPriority, 500);
  }
}
