'use client';

import { useWeatherPreference } from './use-weather-preference';
import { useWeather } from './use-weather';
import { isFeatureEnabled } from '@/lib/utils/feature-flags';

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
 * Conditionally use weather functionality based on feature flags and user preferences
 * 
 * ✅ FIXED: No longer uses dynamic imports for hooks (violates Rules of Hooks)
 * Instead, always imports useWeather statically and passes enabled flag
 */
export function useConditionalWeather(isAuthenticated: boolean): UseConditionalWeatherReturn {
  const weatherPreferenceEnabled = useWeatherPreference();
  
  // Determine if weather should be enabled
  const featureEnabled = isFeatureEnabled('weather');
  const weatherEnabled = isAuthenticated && weatherPreferenceEnabled && featureEnabled;

  // ✅ CRITICAL: Always call useWeather hook (Rules of Hooks)
  // Pass weatherEnabled so the hook can handle its own conditional logic
  const weatherResult = useWeather(weatherEnabled);

  // Return result with weatherEnabled flag
  return {
    ...weatherResult,
    weatherEnabled,
  };
}

/**
 * Preload weather module based on user intent (hover/focus)
 * Note: This is now a no-op since we use static imports
 */
export function preloadWeatherModule(): void {
  // No-op: weather module is now statically imported
}