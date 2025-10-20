import { usePreference } from './use-user-preferences';

/**
 * Hook to get the user's weather widget preference
 * Returns whether the weather widget should be displayed
 */
export function useWeatherPreference(): boolean {
  const weatherEnabled = usePreference('weather_enabled');
  
  // Default to true if preference is not loaded yet
  return weatherEnabled ?? true;
}

/**
 * Hook to check if weather widget should be shown for authenticated users
 * Combines authentication status with user preference
 */
export function useShowWeather(isAuthenticated: boolean): boolean {
  const weatherEnabled = useWeatherPreference();
  
  return isAuthenticated && weatherEnabled;
}