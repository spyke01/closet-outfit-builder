/**
 * Preload manager for intelligent prefetching based on user intent
 * Implements preloading strategies for heavy modules and components
 */

import React from 'react';
import { conditionalImport, isFeatureEnabled, type FeatureFlags } from './feature-flags';

interface PreloadConfig {
  feature: keyof FeatureFlags;
  importFn: () => Promise<any>;
  priority: 'high' | 'medium' | 'low';
  delay?: number; // Delay in milliseconds before preloading
}

interface PreloadState {
  [key: string]: {
    loading: boolean;
    loaded: boolean;
    error: boolean;
  };
}

class PreloadManager {
  private preloadState: PreloadState = {};
  private preloadQueue: PreloadConfig[] = [];
  private isProcessing = false;

  /**
   * Register a module for potential preloading
   */
  register(config: PreloadConfig): void {
    const key = config.feature;
    
    if (!this.preloadState[key]) {
      this.preloadState[key] = {
        loading: false,
        loaded: false,
        error: false,
      };
    }

    // Add to queue if not already loaded or loading
    if (!this.preloadState[key].loaded && !this.preloadState[key].loading) {
      this.preloadQueue.push(config);
    }
  }

  /**
   * Preload a specific module immediately
   */
  async preload(feature: keyof FeatureFlags, importFn: () => Promise<any>): Promise<boolean> {
    const key = feature;

    // Skip if already loaded or loading
    if (this.preloadState[key]?.loaded || this.preloadState[key]?.loading) {
      return this.preloadState[key]?.loaded || false;
    }

    // Skip if feature is disabled
    if (!isFeatureEnabled(feature)) {
      return false;
    }

    // Initialize state if not exists
    if (!this.preloadState[key]) {
      this.preloadState[key] = {
        loading: false,
        loaded: false,
        error: false,
      };
    }

    this.preloadState[key].loading = true;
    this.preloadState[key].error = false;

    try {
      const module = await conditionalImport(feature, importFn);
      
      if (module) {
        this.preloadState[key].loaded = true;
        return true;
      } else {
        this.preloadState[key].error = true;
        return false;
      }
    } catch (error) {
      console.warn(`Failed to preload module for feature ${feature}:`, error);
      this.preloadState[key].error = true;
      return false;
    } finally {
      this.preloadState[key].loading = false;
    }
  }

  /**
   * Process the preload queue with priority and timing
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Sort by priority (high -> medium -> low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    this.preloadQueue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    for (const config of this.preloadQueue) {
      // Skip if already processed
      if (this.preloadState[config.feature]?.loaded || this.preloadState[config.feature]?.loading) {
        continue;
      }

      // Apply delay if specified
      if (config.delay && config.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }

      // Preload the module
      await this.preload(config.feature, config.importFn);

      // Small delay between preloads to avoid blocking
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Clear processed items from queue
    this.preloadQueue = this.preloadQueue.filter(
      config => !this.preloadState[config.feature]?.loaded
    );

    this.isProcessing = false;
  }

  /**
   * Preload based on user interaction (hover, focus)
   */
  preloadOnInteraction(feature: keyof FeatureFlags, importFn: () => Promise<any>): void {
    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        this.preload(feature, importFn);
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.preload(feature, importFn);
      }, 100);
    }
  }

  /**
   * Preload based on viewport intersection (when element comes into view)
   */
  preloadOnIntersection(
    element: Element,
    feature: keyof FeatureFlags,
    importFn: () => Promise<any>,
    options: IntersectionObserverInit = {}
  ): () => void {
    if (!('IntersectionObserver' in window)) {
      // Fallback: preload immediately if IntersectionObserver is not supported
      this.preloadOnInteraction(feature, importFn);
      return () => {};
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.preloadOnInteraction(feature, importFn);
          observer.unobserve(element);
        }
      });
    }, {
      rootMargin: '50px', // Start preloading 50px before element is visible
      threshold: 0.1,
      ...options,
    });

    observer.observe(element);

    // Return cleanup function
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }

  /**
   * Get preload state for a feature
   */
  getState(feature: keyof FeatureFlags): PreloadState[string] | null {
    return this.preloadState[feature] || null;
  }

  /**
   * Check if a feature is preloaded
   */
  isPreloaded(feature: keyof FeatureFlags): boolean {
    return this.preloadState[feature]?.loaded || false;
  }

  /**
   * Reset preload state (useful for testing)
   */
  reset(): void {
    this.preloadState = {};
    this.preloadQueue = [];
    this.isProcessing = false;
  }
}

// Global preload manager instance
export const preloadManager = new PreloadManager();

/**
 * Hook for preloading modules on component mount
 */
export function usePreloadOnMount(configs: PreloadConfig[]): void {
  React.useEffect(() => {
    configs.forEach(config => {
      preloadManager.register(config);
    });

    // Process queue after a short delay to allow for initial render
    setTimeout(() => {
      preloadManager.processQueue();
    }, 100);
  }, []);
}

/**
 * Hook for preloading on user interaction
 */
export function usePreloadOnInteraction(
  feature: keyof FeatureFlags,
  importFn: () => Promise<any>
): {
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  const preload = React.useCallback(() => {
    preloadManager.preloadOnInteraction(feature, importFn);
  }, [feature, importFn]);

  return {
    onMouseEnter: preload,
    onFocus: preload,
  };
}

/**
 * Hook for preloading on viewport intersection
 */
export function usePreloadOnIntersection(
  feature: keyof FeatureFlags,
  importFn: () => Promise<any>,
  options?: IntersectionObserverInit
): React.RefCallback<Element> {
  const [element, setElement] = React.useState<Element | null>(null);

  React.useEffect(() => {
    if (!element) return;

    return preloadManager.preloadOnIntersection(element, feature, importFn, options);
  }, [element, feature, importFn, options]);

  return React.useCallback((node: Element | null) => {
    setElement(node);
  }, []);
}

/**
 * Hook for intelligent preloading based on user navigation patterns
 */
export function useIntelligentPreloading(): {
  preloadRoute: (route: string) => void;
  preloadComponent: (feature: keyof FeatureFlags, importFn: () => Promise<any>) => void;
} {
  const preloadRoute = React.useCallback((route: string) => {
    // Preload route-specific modules based on the target route
    const routeModules: Record<string, PreloadConfig[]> = {
      '/wardrobe': [
        {
          feature: 'imageProcessing',
          importFn: () => import('../../components/image-upload'),
          priority: 'high',
          delay: 0,
        },
        {
          feature: 'imageProcessing',
          importFn: () => import('../../components/dynamic/items-grid-dynamic'),
          priority: 'high',
          delay: 100,
        },
      ],
      '/outfits': [
        {
          feature: 'weather',
          importFn: () => import('../../components/dynamic/outfit-display-dynamic'),
          priority: 'high',
          delay: 0,
        },
        {
          feature: 'weather',
          importFn: () => import('../hooks/use-outfits'),
          priority: 'medium',
          delay: 100,
        },
      ],
      '/settings': [
        {
          feature: 'monitoring',
          importFn: () => import('../../components/preferences-form'),
          priority: 'medium',
          delay: 0,
        },
      ],
    };

    const modules = routeModules[route];
    if (modules) {
      modules.forEach(config => {
        preloadManager.register(config);
      });
      
      // Process with slight delay to avoid blocking current navigation
      setTimeout(() => {
        preloadManager.processQueue();
      }, 50);
    }
  }, []);

  const preloadComponent = React.useCallback((feature: keyof FeatureFlags, importFn: () => Promise<any>) => {
    preloadManager.preloadOnInteraction(feature, importFn);
  }, []);

  return { preloadRoute, preloadComponent };
}

/**
 * Hook for preloading based on viewport intersection with intelligent batching
 */
export function useViewportPreloading(
  configs: Array<{
    feature: keyof FeatureFlags;
    importFn: () => Promise<any>;
    rootMargin?: string;
    threshold?: number;
  }>
): React.RefCallback<Element> {
  const [element, setElement] = React.useState<Element | null>(null);

  React.useEffect(() => {
    if (!element || configs.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      // Fallback: preload all modules with delay
      configs.forEach((config, index) => {
        setTimeout(() => {
          preloadManager.preloadOnInteraction(config.feature, config.importFn);
        }, index * 100);
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Batch preload all configs when element comes into view
          configs.forEach((config, index) => {
            setTimeout(() => {
              preloadManager.preloadOnInteraction(config.feature, config.importFn);
            }, index * 50); // Stagger preloads to avoid blocking
          });
          observer.unobserve(element);
        }
      });
    }, {
      rootMargin: '100px', // Start preloading 100px before element is visible
      threshold: 0.1,
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [element, configs]);

  return React.useCallback((node: Element | null) => {
    setElement(node);
  }, []);
}

/**
 * Hook for preloading based on user interaction patterns
 */
export function useInteractionPreloading(): {
  getPreloadProps: (feature: keyof FeatureFlags, importFn: () => Promise<any>) => {
    onMouseEnter: () => void;
    onFocus: () => void;
    onTouchStart: () => void;
  };
} {
  const getPreloadProps = React.useCallback((feature: keyof FeatureFlags, importFn: () => Promise<any>) => {
    const preload = () => {
      preloadManager.preloadOnInteraction(feature, importFn);
    };

    return {
      onMouseEnter: preload,
      onFocus: preload,
      onTouchStart: preload, // For mobile devices
    };
  }, []);

  return { getPreloadProps };
}

/**
 * Preload modules based on feature flag states
 */
export function preloadByFeatureFlags(): void {
  const featureModules: Array<{
    feature: keyof FeatureFlags;
    importFn: () => Promise<any>;
    priority: 'high' | 'medium' | 'low';
  }> = [
    {
      feature: 'weather',
      importFn: () => import('../hooks/use-weather'),
      priority: 'high',
    },
    {
      feature: 'weather',
      importFn: () => import('../../components/weather-widget'),
      priority: 'high',
    },
    {
      feature: 'imageProcessing',
      importFn: () => import('../hooks/use-image-upload'),
      priority: 'high',
    },
    {
      feature: 'imageProcessing',
      importFn: () => import('../../components/image-upload'),
      priority: 'high',
    },
    {
      feature: 'monitoring',
      importFn: () => import('../monitoring'),
      priority: 'medium',
    },
    {
      feature: 'analytics',
      importFn: () => import('../providers/third-party-integrations'),
      priority: 'low',
    },
  ];

  // Only preload modules for enabled features
  const enabledModules = featureModules.filter(module => 
    isFeatureEnabled(module.feature)
  );

  enabledModules.forEach(config => {
    preloadManager.register({
      feature: config.feature,
      importFn: config.importFn,
      priority: config.priority,
      delay: config.priority === 'high' ? 0 : config.priority === 'medium' ? 200 : 500,
    });
  });

  // Process queue with intelligent timing
  if (enabledModules.length > 0) {
    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        preloadManager.processQueue();
      });
    } else {
      setTimeout(() => {
        preloadManager.processQueue();
      }, 100);
    }
  }
}

/**
 * Preload critical modules immediately
 */
export function preloadCriticalModules(): void {
  const criticalModules: PreloadConfig[] = [
    {
      feature: 'weather',
      importFn: () => import('../hooks/use-weather'),
      priority: 'high',
      delay: 0,
    },
    {
      feature: 'imageProcessing',
      importFn: () => import('../hooks/use-image-upload'),
      priority: 'high',
      delay: 100,
    },
    {
      feature: 'monitoring',
      importFn: () => import('../monitoring'),
      priority: 'medium',
      delay: 200,
    },
  ];

  criticalModules.forEach(config => {
    preloadManager.register(config);
  });

  // Process immediately for critical modules
  preloadManager.processQueue();
}