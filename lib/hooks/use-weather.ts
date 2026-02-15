'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { safeValidate } from '@/lib/utils/validation';
import { useWeatherFallback } from './use-weather-fallback';

// Weather data schemas
const WeatherDataSchema = z.object({
  date: z.string(),
  temperature: z.object({
    high: z.number(),
    low: z.number(),
  }),
  condition: z.string(),
  icon: z.string(),
  precipitationProbability: z.number().optional(),
});

const WeatherResponseSchema = z.object({
  current: z.object({
    observationTime: z.string().optional(),
    temperature: z.number(),
    feelsLike: z.number().optional(),
    humidity: z.number().optional(),
    windSpeed: z.number().optional(),
    pressure: z.number().optional(),
    visibility: z.number().optional(),
    uvIndex: z.number().optional(),
    sunrise: z.string().optional(),
    sunset: z.string().optional(),
    condition: z.string(),
    icon: z.string(),
  }),
  forecast: z.array(WeatherDataSchema),
  hourly: z.array(
    z.object({
      time: z.string(),
      temperature: z.number(),
      feelsLike: z.number(),
      condition: z.string(),
      icon: z.string(),
      precipitationProbability: z.number().optional(),
    })
  ).optional(),
  alerts: z.array(
    z.object({
      senderName: z.string().optional(),
      event: z.string(),
      start: z.string(),
      end: z.string(),
      description: z.string(),
      tags: z.array(z.string()).optional(),
    })
  ).optional(),
  timezone: z.string().optional(),
  timezoneOffset: z.number().optional(),
});

const WeatherErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export type WeatherData = z.infer<typeof WeatherDataSchema>;
export type WeatherResponse = z.infer<typeof WeatherResponseSchema>;
export type WeatherError = z.infer<typeof WeatherErrorSchema>;

interface UseWeatherReturn {
  forecast: WeatherData[];
  current: WeatherResponse['current'] | null;
  hourly: NonNullable<WeatherResponse['hourly']>;
  alerts: NonNullable<WeatherResponse['alerts']>;
  loading: boolean;
  error: WeatherError | null;
  retry: () => void;
  usingFallback: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  granted: boolean;
  error?: string;
}

/**
 * Get current location using browser geolocation API
 */
async function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: 0,
        longitude: 0,
        granted: false,
        error: 'Geolocation is not supported by this browser',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          granted: true,
        });
      },
      (error) => {
        let errorMessage = 'Location access denied';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        resolve({
          latitude: 0,
          longitude: 0,
          granted: false,
          error: errorMessage,
        });
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Fetch weather data from Netlify function with enhanced error handling
 */
async function fetchWeatherData(latitude: number, longitude: number): Promise<WeatherResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(`/.netlify/functions/weather?lat=${latitude}&lon=${longitude}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // If JSON parsing fails, create a generic error based on status
        errorData = {
          error: getErrorMessageForStatus(response.status),
          details: `HTTP ${response.status}`
        };
      }
      
      const validatedError = safeValidate(WeatherErrorSchema, errorData);
      
      if (validatedError.success) {
        throw validatedError.data;
      } else {
        throw { 
          error: getErrorMessageForStatus(response.status), 
          details: `HTTP ${response.status}` 
        };
      }
    }
    
    const data = await response.json();
    const validation = safeValidate(WeatherResponseSchema, data);
    
    if (!validation.success) {
      console.warn('Invalid weather response:', validation.error);
      throw { 
        error: 'Weather service returned invalid data. Please try again later.', 
        details: 'Data validation failed' 
      };
    }
    
    return validation.data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw {
          error: 'Weather request timed out. Please check your internet connection.',
          details: 'Request timeout after 10 seconds'
        };
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw {
          error: 'Unable to connect to weather service. Please check your internet connection.',
          details: 'Network connection failed'
        };
      }
    }
    
    // Re-throw if it's already a WeatherError
    if (error && typeof error === 'object' && 'error' in error) {
      throw error;
    }
    
    // Generic fallback
    throw {
      error: 'Weather service is temporarily unavailable. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get user-friendly error message based on HTTP status code
 */
function getErrorMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid location data. Please try again.';
    case 401:
    case 403:
      return 'Weather service authentication failed. Please try again later.';
    case 404:
      return 'Weather service not found. Please try again later.';
    case 429:
      return 'Too many weather requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Weather service is temporarily unavailable. Please try again later.';
    default:
      return 'Weather service is currently unavailable. Please try again later.';
  }
}

/**
 * Hook for fetching and managing weather data
 * Only works for authenticated users with location permission
 */
export function useWeather(enabled: boolean = true): UseWeatherReturn {
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [current, setCurrent] = useState<WeatherResponse['current'] | null>(null);
  const [hourly, setHourly] = useState<NonNullable<WeatherResponse['hourly']>>([]);
  const [alerts, setAlerts] = useState<NonNullable<WeatherResponse['alerts']>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WeatherError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  
  const { generateFallbackWeather } = useWeatherFallback();

  const loadWeatherData = useCallback(async (isRetry = false) => {
    // Early return if hook is disabled
    if (!enabled) {
      return;
    }

    // Early return if location permission was explicitly denied and not retrying
    if (locationPermissionDenied && !isRetry) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const location = await getCurrentLocation();

      // Early return if location not granted
      if (!location.granted) {
        setLocationPermissionDenied(true);
        const locationError: WeatherError = {
          error: 'Location access is required to show weather information. Please enable location permissions in your browser settings.',
          details: location.error
        };
        setError(locationError);
        setLoading(false);
        return;
      }

      setLocationPermissionDenied(false);
      
      try {
        const weatherData = await fetchWeatherData(location.latitude, location.longitude);
        
        setForecast(weatherData.forecast);
        setCurrent(weatherData.current);
        setHourly(weatherData.hourly ?? []);
        setAlerts(weatherData.alerts ?? []);
        setRetryCount(0); // Reset retry count on success
        setUsingFallback(false);
      } catch (weatherError) {
        // If main weather service fails after multiple retries, try fallback
        if (retryCount >= 2) {
          console.log('Main weather service failed, attempting fallback...');
          try {
            const fallbackData = await generateFallbackWeather(location.latitude, location.longitude);
            setForecast(fallbackData.forecast);
            setCurrent(fallbackData.current);
            setHourly([]);
            setAlerts([]);
            setUsingFallback(true);
            setError({
              error: 'Using estimated weather data. Actual weather service is temporarily unavailable.',
              details: 'Fallback weather data active'
            });
            setLoading(false);
            return; // Early return after successful fallback
          } catch (fallbackError) {
            console.error('Fallback weather generation failed:', fallbackError);
          }
        }
        
        // Re-throw the original error if fallback fails or we haven't reached retry limit
        throw weatherError;
      }
    } catch (err) {
      console.error('Weather loading error:', err);

      // Handle different types of errors with appropriate user messaging
      let weatherError: WeatherError;

      if (err && typeof err === 'object' && 'error' in err) {
        // This is already a WeatherError from our services
        weatherError = err as WeatherError;
      } else if (err instanceof Error) {
        // Network or other generic errors
        if (err.message.includes('fetch') || err.message.includes('NetworkError')) {
          weatherError = {
            error: 'Unable to connect to weather service. Please check your internet connection.',
            details: err.message
          };
        } else if (err.name === 'AbortError') {
          weatherError = {
            error: 'Weather request timed out. Please try again.',
            details: 'Request timeout'
          };
        } else {
          weatherError = {
            error: 'Weather service is temporarily unavailable. Please try again later.',
            details: err.message
          };
        }
      } else {
        weatherError = {
          error: 'An unexpected error occurred while loading weather data.',
          details: 'Unknown error'
        };
      }

      setError(weatherError);

      // Implement graceful degradation - clear any stale data on persistent errors
      if (retryCount >= 2) {
        setForecast([]);
        setCurrent(null);
        setHourly([]);
        setAlerts([]);
      }

      // Increment retry count for rate limiting
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [locationPermissionDenied, enabled, retryCount, generateFallbackWeather]);

  // Retry weather data loading with intelligent backoff
  const retry = useCallback(() => {
    // Early return if max retries exceeded
    if (retryCount >= 3) {
      setError({
        error: 'Weather service is currently unavailable. Please try again later.',
        details: 'Maximum retry attempts exceeded'
      });
      return;
    }

    // Early return if location permission was denied
    if (locationPermissionDenied) {
      setError({
        error: 'Location access is required for weather information. Please enable location permissions and refresh the page.',
        details: 'Location permission denied'
      });
      return;
    }

    // Exponential backoff delay with jitter to prevent thundering herd
    const baseDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    const jitter = Math.random() * 1000; // Add up to 1s random delay
    const delay = baseDelay + jitter;

    setTimeout(() => {
      loadWeatherData(true);
    }, delay);
  }, [loadWeatherData, retryCount, locationPermissionDenied]);

  // Load weather data on mount, but only if enabled
  useEffect(() => {
    if (enabled) {
      loadWeatherData();
    } else {
      // Clear data when disabled
      setForecast([]);
      setCurrent(null);
      setHourly([]);
      setAlerts([]);
      setError(null);
      setLoading(false);
    }
  }, [loadWeatherData, enabled]);

  return {
    forecast,
    current,
    hourly,
    alerts,
    loading,
    error,
    retry,
    usingFallback,
  };
}
