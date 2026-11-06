"use client";

import { useUserPreferences } from "./use-user-preferences";
import { useWeather } from "./use-weather";
import { isFeatureEnabled } from "@/lib/utils/feature-flags";

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

type WeatherResult = ReturnType<typeof useWeather>;
type UseConditionalWeatherReturn = Pick<
  WeatherResult,
  "forecast" | "current" | "loading" | "error" | "retry" | "usingFallback"
> &
  Partial<
    Pick<
      WeatherResult,
      "hourly" | "alerts" | "coordinates" | "locationLabel" | "timezone"
    >
  > & {
    weatherEnabled: boolean;
    preferenceLoading?: boolean;
    preferenceError?: boolean;
    weatherDisabledReason?:
      | "signed-out"
      | "preferences-loading"
      | "preferences-error"
      | "preference-off"
      | "feature-off";
    retryPreferences?: () => void;
  };

/**
 * Conditionally use weather functionality based on feature flags and user preferences
 *
 * ✅ FIXED: No longer uses dynamic imports for hooks (violates Rules of Hooks)
 * Instead, always imports useWeather statically and passes enabled flag
 */
export function useConditionalWeather(
  isAuthenticated: boolean,
): UseConditionalWeatherReturn {
  const preferencesQuery = useUserPreferences();
  const preferences = preferencesQuery.data;
  const preferenceLoading =
    preferencesQuery.isLoading || (!preferences && !preferencesQuery.isError);
  const weatherPreferenceEnabled = preferences?.weather_enabled === true;

  // Determine if weather should be enabled
  const featureEnabled = isFeatureEnabled("weather");
  const weatherEnabled =
    isAuthenticated && weatherPreferenceEnabled && featureEnabled;
  const weatherDisabledReason = !isAuthenticated
    ? "signed-out"
    : preferencesQuery.isError
      ? "preferences-error"
      : preferenceLoading
        ? "preferences-loading"
        : !weatherPreferenceEnabled
          ? "preference-off"
          : !featureEnabled
            ? "feature-off"
            : undefined;

  // ✅ CRITICAL: Always call useWeather hook (Rules of Hooks)
  // Pass weatherEnabled so the hook can handle its own conditional logic
  const weatherResult = useWeather(weatherEnabled);

  // Return result with weatherEnabled flag
  return {
    ...weatherResult,
    weatherEnabled,
    preferenceLoading,
    preferenceError: preferencesQuery.isError,
    weatherDisabledReason,
    retryPreferences: () => {
      void preferencesQuery.refetch();
    },
  };
}

/**
 * Preload weather module based on user intent (hover/focus)
 * Note: This is now a no-op since we use static imports
 */
export function preloadWeatherModule(): void {
  // No-op: weather module is now statically imported
}
