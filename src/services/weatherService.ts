/**
 * Weather service for fetching weather data via Netlify Functions
 * Provides weather data fetching with caching, retry logic, and error handling
 */

import { WeatherData, WeatherError, GoogleWeatherResponse } from '../types';

// Cache configuration
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

interface CachedWeatherData {
  data: WeatherData[];
  timestamp: number;
  location: { lat: number; lon: number };
}

// In-memory cache for weather data
const weatherCache = new Map<string, CachedWeatherData>();

/**
 * Generates a cache key for weather data based on coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Cache key string
 */
const getCacheKey = (lat: number, lon: number): string => {
  // Round to 2 decimal places to group nearby locations
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  return `weather_${roundedLat}_${roundedLon}`;
};

/**
 * Checks if cached data is still valid
 * @param cachedData - The cached weather data
 * @returns True if cache is valid, false otherwise
 */
const isCacheValid = (cachedData: CachedWeatherData): boolean => {
  const now = Date.now();
  return (now - cachedData.timestamp) < CACHE_DURATION;
};

/**
 * Transforms Google Weather API response to WeatherData array
 * @param response - Google Weather API response
 * @returns Array of WeatherData objects
 */
const transformWeatherResponse = (response: GoogleWeatherResponse): WeatherData[] => {
  return response.forecast.map(day => {
    const date = new Date(day.date);
    return {
      date: day.date,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      high: day.temperature.high,
      low: day.temperature.low,
      condition: day.condition,
      icon: day.icon,
      precipitationChance: day.precipitationProbability
    };
  });
};

/**
 * Implements exponential backoff delay for retry attempts
 * @param attempt - Current attempt number (0-based)
 * @returns Promise that resolves after the delay
 */
const delay = (attempt: number): Promise<void> => {
  const delayMs = RETRY_DELAY_BASE * Math.pow(2, attempt);
  return new Promise(resolve => setTimeout(resolve, delayMs));
};

/**
 * Makes a request to the weather Netlify function with retry logic
 * @param lat - Latitude
 * @param lon - Longitude
 * @param attempt - Current attempt number
 * @returns Promise resolving to weather response
 */
const fetchWeatherWithRetry = async (
  lat: number, 
  lon: number, 
  attempt: number = 0
): Promise<GoogleWeatherResponse> => {
  try {
    const response = await fetch(`/.netlify/functions/weather?lat=${lat}&lon=${lon}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Handle specific HTTP status codes
      if (response.status === 429) {
        const error: WeatherError = {
          code: 'RATE_LIMIT',
          message: 'Weather service rate limit exceeded. Please try again later.',
          details: `HTTP ${response.status}`
        };
        throw error;
      }

      if (response.status === 401 || response.status === 403) {
        const error: WeatherError = {
          code: 'UNAUTHORIZED',
          message: 'Weather service access denied.',
          details: `HTTP ${response.status}`
        };
        throw error;
      }

      if (response.status >= 500) {
        // Server errors are retryable
        throw new Error(`Server error: ${response.status}`);
      }

      // Client errors (4xx) are not retryable
      const errorData = await response.json().catch(() => ({}));
      const error: WeatherError = {
        code: 'API_ERROR',
        message: errorData.error || 'Failed to fetch weather data',
        details: `HTTP ${response.status}`
      };
      throw error;
    }

    const data = await response.json();
    return data as GoogleWeatherResponse;

  } catch (error) {
    // If this is our custom WeatherError, don't retry
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }

    // For network errors and server errors, implement retry logic
    if (attempt < RETRY_ATTEMPTS - 1) {
      console.warn(`Weather API attempt ${attempt + 1} failed, retrying...`, error);
      await delay(attempt);
      return fetchWeatherWithRetry(lat, lon, attempt + 1);
    }

    // All retry attempts exhausted
    const weatherError: WeatherError = {
      code: 'NETWORK_ERROR',
      message: 'Failed to connect to weather service. Please check your internet connection.',
      details: error instanceof Error ? error.message : 'Unknown network error'
    };
    throw weatherError;
  }
};

/**
 * Fetches weather data for given coordinates with caching and retry logic
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Promise resolving to array of WeatherData
 */
export const getWeatherData = async (lat: number, lon: number): Promise<WeatherData[]> => {
  // Validate coordinates
  if (isNaN(lat) || isNaN(lon)) {
    const error: WeatherError = {
      code: 'LOCATION_ERROR',
      message: 'Invalid location coordinates provided',
      details: `lat: ${lat}, lon: ${lon}`
    };
    throw error;
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const error: WeatherError = {
      code: 'LOCATION_ERROR',
      message: 'Location coordinates are out of valid range',
      details: `lat: ${lat}, lon: ${lon}`
    };
    throw error;
  }

  // Check cache first
  const cacheKey = getCacheKey(lat, lon);
  const cachedData = weatherCache.get(cacheKey);
  
  if (cachedData && isCacheValid(cachedData)) {
    console.log('Returning cached weather data');
    return cachedData.data;
  }

  try {
    // Fetch fresh data from API
    const response = await fetchWeatherWithRetry(lat, lon);
    const weatherData = transformWeatherResponse(response);

    // Cache the result
    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now(),
      location: { lat, lon }
    });

    return weatherData;

  } catch (error) {
    // If we have any cached data (even stale), return it as fallback
    const anyCachedData = weatherCache.get(cacheKey);
    if (anyCachedData) {
      console.warn('Using stale cached weather data due to API error:', error);
      return anyCachedData.data;
    }

    // Re-throw the error if no cached fallback available
    throw error;
  }
};

/**
 * Clears the weather data cache
 * Useful for testing or when user wants fresh data
 */
export const clearWeatherCache = (): void => {
  weatherCache.clear();
};

/**
 * Gets cached weather data if available and valid
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Cached WeatherData array or null if not available/valid
 */
export const getCachedWeatherData = (lat: number, lon: number): WeatherData[] | null => {
  const cacheKey = getCacheKey(lat, lon);
  const cachedData = weatherCache.get(cacheKey);
  
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }
  
  return null;
};

/**
 * Prefetches weather data for given coordinates
 * Useful for preloading data without blocking UI
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Promise that resolves when prefetch is complete (success or failure)
 */
export const prefetchWeatherData = async (lat: number, lon: number): Promise<void> => {
  try {
    await getWeatherData(lat, lon);
  } catch (error) {
    // Silently fail for prefetch operations
    console.warn('Weather data prefetch failed:', error);
  }
};

/**
 * Gets weather cache statistics for debugging
 * @returns Object with cache statistics
 */
export const getWeatherCacheStats = () => {
  const now = Date.now();
  const entries = Array.from(weatherCache.entries());
  
  return {
    totalEntries: entries.length,
    validEntries: entries.filter(([, data]) => isCacheValid(data)).length,
    oldestEntry: entries.length > 0 ? Math.min(...entries.map(([, data]) => data.timestamp)) : null,
    newestEntry: entries.length > 0 ? Math.max(...entries.map(([, data]) => data.timestamp)) : null,
    cacheSize: entries.length,
    cacheDurationMs: CACHE_DURATION
  };
};