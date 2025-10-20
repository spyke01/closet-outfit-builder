'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { safeValidate } from '@/lib/utils/validation';

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
    temperature: z.number(),
    condition: z.string(),
    icon: z.string(),
  }),
  forecast: z.array(WeatherDataSchema),
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
  loading: boolean;
  error: WeatherError | null;
  retry: () => void;
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
 * Fetch weather data from Netlify function
 */
async function fetchWeatherData(latitude: number, longitude: number): Promise<WeatherResponse> {
  const response = await fetch(`/.netlify/functions/weather?lat=${latitude}&lon=${longitude}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    const validatedError = safeValidate(WeatherErrorSchema, errorData);
    
    if (validatedError.success) {
      throw validatedError.data;
    } else {
      throw { error: 'Failed to fetch weather data', details: `HTTP ${response.status}` };
    }
  }
  
  const data = await response.json();
  const validation = safeValidate(WeatherResponseSchema, data);
  
  if (!validation.success) {
    console.warn('Invalid weather response:', validation.error);
    throw { error: 'Invalid weather data received', details: 'Data validation failed' };
  }
  
  return validation.data;
}

/**
 * Hook for fetching and managing weather data
 * Only works for authenticated users with location permission
 */
export function useWeather(enabled: boolean = true): UseWeatherReturn {
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [current, setCurrent] = useState<WeatherResponse['current'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WeatherError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const loadWeatherData = useCallback(async (isRetry = false) => {
    // Don't load if hook is disabled
    if (!enabled) {
      return;
    }

    // Don't retry if location permission was explicitly denied
    if (locationPermissionDenied && !isRetry) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const location = await getCurrentLocation();

      if (location.granted) {
        setLocationPermissionDenied(false);
        const weatherData = await fetchWeatherData(location.latitude, location.longitude);
        
        setForecast(weatherData.forecast);
        setCurrent(weatherData.current);
        setRetryCount(0); // Reset retry count on success
      } else {
        // Handle location permission denied
        setLocationPermissionDenied(true);
        const locationError: WeatherError = {
          error: 'Location access is required to show weather information. Please enable location permissions in your browser settings.',
          details: location.error
        };
        setError(locationError);
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
        if (err.message.includes('fetch')) {
          weatherError = {
            error: 'Unable to connect to weather service. Please check your internet connection.',
            details: err.message
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

      // Increment retry count for rate limiting
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [locationPermissionDenied, enabled]);

  // Retry weather data loading with exponential backoff
  const retry = useCallback(() => {
    // Limit retry attempts to prevent spam
    if (retryCount >= 3) {
      setError({
        error: 'Weather service is currently unavailable. Please try again later.',
        details: 'Maximum retry attempts exceeded'
      });
      return;
    }

    // Exponential backoff delay
    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

    setTimeout(() => {
      loadWeatherData(true);
    }, delay);
  }, [loadWeatherData, retryCount]);

  // Load weather data on mount, but only if enabled
  useEffect(() => {
    if (enabled) {
      loadWeatherData();
    } else {
      // Clear data when disabled
      setForecast([]);
      setCurrent(null);
      setError(null);
      setLoading(false);
    }
  }, [loadWeatherData, enabled]);

  return {
    forecast,
    current,
    loading,
    error,
    retry,
  };
}