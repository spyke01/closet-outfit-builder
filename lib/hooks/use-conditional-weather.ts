'use client';

import { useState, useEffect, useCallback } from 'react';
import { conditionalImport, isFeatureEnabled } from '@/lib/utils/feature-flags';
import { useWeatherPreference } from './use-weather-preference';

// Type definitions for weather functionality
export type WeatherData = {
  date: string;
  temperature: {
    high: number;
    low: number;
  };
  condition: string;
  icon: string;
  precipitationProbability?: number;
};

export type WeatherResponse = {
  current: {
    temperature: number;
    condition: string;
    icon: string;
  };
  forecast: WeatherData[];
};

export type WeatherError = {
  error: string;
  details?: string;
};

interface UseConditionalWeatherReturn {
  forecast: WeatherData[];
  current: WeatherResponse['current'] | null;
  loading: boolean;
  error: WeatherError | null;
  retry: () => void;
  usingFallback: boolean;
  weatherEnabled: boolean;
}

/**
 * Conditionally load weather functionality based on feature flags and user preferences
 * Only loads the weather module when both feature flag is enabled and user has weather enabled
 */
export function useConditionalWeather(isAuthenticated: boolean): UseConditionalWeatherReturn {
  const [weatherModule, setWeatherModule] = useState<any>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  const weatherPreferenceEnabled = useWeatherPreference();
  
  // Determine if weather should be enabled
  const featureEnabled = isFeatureEnabled('weather');
  const weatherEnabled = isAuthenticated && weatherPreferenceEnabled && featureEnabled;

  // Default return values when weather is disabled
  const defaultReturn: UseConditionalWeatherReturn = {
    forecast: [],
    current: null,
    loading: false,
    error: null,
    retry: () => {},
    usingFallback: false,
    weatherEnabled: false,
  };

  // Load weather module conditionally
  useEffect(() => {
    if (!weatherEnabled || weatherModule) {
      return;
    }

    setModuleLoading(true);

    conditionalImport('weather', () => import('./use-weather'))
      .then((module) => {
        if (module) {
          setWeatherModule(module);
        }
      })
      .catch((error) => {
        console.warn('Failed to load weather module:', error);
      })
      .finally(() => {
        setModuleLoading(false);
      });
  }, [weatherEnabled, weatherModule]);

  // Use the weather hook if module is loaded and weather is enabled
  const weatherHookResult = weatherModule?.useWeather?.(weatherEnabled);

  // Return appropriate result based on state
  if (!weatherEnabled) {
    return defaultReturn;
  }

  if (moduleLoading) {
    return {
      ...defaultReturn,
      loading: true,
      weatherEnabled: true,
    };
  }

  if (!weatherModule || !weatherHookResult) {
    return {
      ...defaultReturn,
      error: {
        error: 'Weather functionality is temporarily unavailable',
        details: 'Module failed to load'
      },
      weatherEnabled: true,
    };
  }

  return {
    ...weatherHookResult,
    weatherEnabled: true,
  };
}

/**
 * Preload weather module based on user intent (hover/focus)
 */
export function preloadWeatherModule(): void {
  if (!isFeatureEnabled('weather') || typeof window === 'undefined') {
    return;
  }

  // Use requestIdleCallback to preload during idle time
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      conditionalImport('weather', () => import('./use-weather'))
        .catch(() => {
          // Silently fail preloading
        });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      conditionalImport('weather', () => import('./use-weather'))
        .catch(() => {
          // Silently fail preloading
        });
    }, 100);
  }
}