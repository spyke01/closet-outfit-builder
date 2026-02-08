/**
 * Intelligent preloading hook for route-based and user intent-based preloading
 */

'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { preloadManager, preloadByFeatureFlags } from '@/lib/utils/preload-manager';
import { isFeatureEnabled, type FeatureFlags } from '@/lib/utils/feature-flags';

interface RoutePreloadConfig {
  route: string;
  modules: Array<{
    feature: keyof FeatureFlags;
    importFn: () => Promise<any>;
    priority: 'high' | 'medium' | 'low';
    delay?: number;
  }>;
}

/**
 * Route-based preloading configurations
 */
const ROUTE_PRELOAD_CONFIGS: RoutePreloadConfig[] = [
  {
    route: '/wardrobe',
    modules: [
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
      {
        feature: 'imageProcessing',
        importFn: () => import('../hooks/use-wardrobe-items'),
        priority: 'medium',
        delay: 200,
      },
    ],
  },
  {
    route: '/outfits',
    modules: [
      {
        feature: 'weather',
        importFn: () => import('../../components/dynamic/outfit-display-dynamic'),
        priority: 'high',
        delay: 0,
      },
      {
        feature: 'weather',
        importFn: () => import('../hooks/use-outfits'),
        priority: 'high',
        delay: 100,
      },
      {
        feature: 'weather',
        importFn: () => import('../../components/weather-widget'),
        priority: 'medium',
        delay: 200,
      },
    ],
  },
  {
    route: '/settings',
    modules: [
      {
        feature: 'monitoring',
        importFn: () => import('../../components/preferences-form'),
        priority: 'medium',
        delay: 0,
      },
      {
        feature: 'analytics',
        importFn: () => import('../providers/third-party-integrations'),
        priority: 'low',
        delay: 300,
      },
    ],
  },
  {
    route: '/anchor',
    modules: [
      {
        feature: 'weather',
        importFn: () => import('../../components/dynamic/outfit-display-dynamic'),
        priority: 'high',
        delay: 0,
      },
      {
        feature: 'imageProcessing',
        importFn: () => import('../../components/dynamic/items-grid-dynamic'),
        priority: 'medium',
        delay: 100,
      },
    ],
  },
  {
    route: '/sizes',
    modules: [
      {
        feature: 'sizeManagement',
        importFn: () => import('../../components/sizes/category-detail-client'),
        priority: 'high',
        delay: 0,
      },
      {
        feature: 'sizeManagement',
        importFn: () => import('../../components/sizes/brand-size-form'),
        priority: 'medium',
        delay: 100,
      },
      {
        feature: 'sizeManagement',
        importFn: () => import('../../components/sizes/measurement-guide-section'),
        priority: 'low',
        delay: 200,
      },
    ],
  },
];

/**
 * Hook for intelligent preloading based on current route and user patterns
 */
export function useIntelligentPreloading(): {
  preloadForRoute: (targetRoute: string) => void;
  preloadOnUserIntent: (feature: keyof FeatureFlags, importFn: () => Promise<any>) => void;
} {
  const pathname = usePathname();

  // Preload modules for current route on mount
  useEffect(() => {
    if (!pathname) return;

    // Find matching route config
    const routeConfig = ROUTE_PRELOAD_CONFIGS.find(config => 
      pathname.startsWith(config.route)
    );

    if (routeConfig) {
      preloadModulesForRoute(routeConfig);
    }

    // Also preload based on enabled feature flags
    preloadByFeatureFlags();
  }, [pathname]);

  const preloadForRoute = useCallback((targetRoute: string) => {
    const routeConfig = ROUTE_PRELOAD_CONFIGS.find(config => 
      targetRoute.startsWith(config.route)
    );

    if (routeConfig) {
      preloadModulesForRoute(routeConfig);
    }
  }, []);

  const preloadOnUserIntent = useCallback((feature: keyof FeatureFlags, importFn: () => Promise<any>) => {
    preloadManager.preloadOnInteraction(feature, importFn);
  }, []);

  return { preloadForRoute, preloadOnUserIntent };
}

/**
 * Preload modules for a specific route configuration
 */
function preloadModulesForRoute(routeConfig: RoutePreloadConfig): void {
  // Filter modules based on enabled features
  const enabledModules = routeConfig.modules.filter(module => 
    isFeatureEnabled(module.feature)
  );

  if (enabledModules.length === 0) return;

  // Register modules for preloading
  enabledModules.forEach(module => {
    preloadManager.register({
      feature: module.feature,
      importFn: module.importFn,
      priority: module.priority,
      delay: module.delay || 0,
    });
  });

  // Process queue with intelligent timing
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

/**
 * Hook for preloading on navigation link hover/focus
 */
export function useNavigationPreloading(): {
  getNavigationProps: (targetRoute: string) => {
    onMouseEnter: () => void;
    onFocus: () => void;
    onTouchStart: () => void;
  };
} {
  const { preloadForRoute } = useIntelligentPreloading();

  const getNavigationProps = useCallback((targetRoute: string) => {
    const preload = () => {
      preloadForRoute(targetRoute);
    };

    return {
      onMouseEnter: preload,
      onFocus: preload,
      onTouchStart: preload, // For mobile devices
    };
  }, [preloadForRoute]);

  return { getNavigationProps };
}

/**
 * Hook for component-level preloading on user interactions
 */
export function useComponentPreloading(
  feature: keyof FeatureFlags,
  importFn: () => Promise<any>
): {
  preloadProps: {
    onMouseEnter: () => void;
    onFocus: () => void;
    onTouchStart: () => void;
  };
  isPreloaded: boolean;
} {
  const preload = useCallback(() => {
    preloadManager.preloadOnInteraction(feature, importFn);
  }, [feature, importFn]);

  const preloadProps = {
    onMouseEnter: preload,
    onFocus: preload,
    onTouchStart: preload,
  };

  const isPreloaded = preloadManager.isPreloaded(feature);

  return { preloadProps, isPreloaded };
}