'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { conditionalImport, isFeatureEnabled, type FeatureFlags } from '@/lib/utils/feature-flags';
import { Loader2 } from 'lucide-react';

interface ConditionalComponentLoaderProps {
  feature: keyof FeatureFlags;
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  preloadOnHover?: boolean;
  children?: React.ReactNode;
  [key: string]: any; // Props to pass to the loaded component
}

/**
 * Generic conditional component loader
 * Only loads and renders components when the associated feature is enabled
 */
export const ConditionalComponentLoader: React.FC<ConditionalComponentLoaderProps> = ({
  feature,
  importFn,
  fallback = null,
  loadingComponent,
  errorComponent,
  preloadOnHover = true,
  children,
  ...componentProps
}) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preloaded, setPreloaded] = useState(false);

  const featureEnabled = isFeatureEnabled(feature);

  // Load component when feature is enabled
  useEffect(() => {
    if (!featureEnabled || Component) {
      return;
    }

    loadComponent();
  }, [featureEnabled, Component]);

  const loadComponent = useCallback(async () => {
    if (loading || Component) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedModule = await conditionalImport(feature, importFn);
      
      if (loadedModule?.default) {
        setComponent(() => loadedModule.default);
      } else {
        throw new Error(`Component not found in module for feature: ${feature}`);
      }
    } catch (err) {
      console.warn(`Failed to load component for feature ${feature}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load component');
    } finally {
      setLoading(false);
    }
  }, [feature, importFn, loading, Component]);

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
            <span className="ml-2 text-sm text-gray-500">Loading...</span>
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
      <Component {...componentProps}>
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
    >
      {fallback}
    </div>
  );
};

/**
 * Higher-order component for conditional loading
 */
export function withConditionalLoading<P extends Record<string, any>>(
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
export function preloadConditionalComponents(features: Array<{
  feature: keyof FeatureFlags;
  importFn: () => Promise<any>;
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