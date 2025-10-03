import { useState, useOptimistic, useCallback, useMemo } from 'react';
import { WeatherData, WeatherError } from '../types';

interface OptimisticWeatherState {
  current: WeatherData | null;
  forecast: WeatherData[];
  location: string;
  isUpdating: boolean;
}

interface OptimisticWeatherActions {
  updateLocation: (location: string) => Promise<void>;
  refreshWeather: () => Promise<void>;
  clearOptimistic: () => void;
}

/**
 * Predicts weather data based on location for immediate UI feedback
 * This provides instant visual feedback while actual weather data is being fetched
 */
export const predictWeatherFromLocation = (location: string): Partial<WeatherData>[] => {
  const now = new Date();
  const predictions: Partial<WeatherData>[] = [];
  
  // Generate 3 days of predicted weather based on location patterns
  for (let i = 0; i < 3; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    
    // Simple location-based weather prediction logic
    const locationLower = location.toLowerCase();
    let baseTemp = 70; // Default temperature
    let condition = 'Partly Cloudy';
    
    // Location-based temperature adjustments
    if (locationLower.includes('miami') || locationLower.includes('florida') || locationLower.includes('phoenix')) {
      baseTemp = 85;
      condition = 'Sunny';
    } else if (locationLower.includes('seattle') || locationLower.includes('portland') || locationLower.includes('vancouver')) {
      baseTemp = 60;
      condition = 'Cloudy';
    } else if (locationLower.includes('chicago') || locationLower.includes('detroit') || locationLower.includes('minneapolis')) {
      baseTemp = 55;
      condition = 'Partly Cloudy';
    } else if (locationLower.includes('denver') || locationLower.includes('colorado')) {
      baseTemp = 65;
      condition = 'Sunny';
    } else if (locationLower.includes('new york') || locationLower.includes('boston') || locationLower.includes('philadelphia')) {
      baseTemp = 68;
      condition = 'Partly Cloudy';
    }
    
    // Add some variation for different days
    const tempVariation = (Math.random() - 0.5) * 10;
    const high = baseTemp + tempVariation + (i === 0 ? 0 : Math.random() * 5);
    const low = high - 10 - Math.random() * 5;
    
    // Day of week calculation
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[date.getDay()];
    
    predictions.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      high: Math.round(high),
      low: Math.round(low),
      condition,
      icon: condition.toLowerCase().replace(' ', '-'),
      precipitationChance: Math.random() < 0.3 ? Math.round(Math.random() * 40) : 0
    });
  }
  
  return predictions;
};

/**
 * Simulates weather API call with realistic delay and potential failures
 */
const fetchWeatherData = async (location: string): Promise<WeatherData[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  // Simulate potential API failures (10% chance)
  if (Math.random() < 0.1) {
    const errorTypes: WeatherError['code'][] = ['NETWORK_ERROR', 'RATE_LIMIT', 'API_ERROR'];
    const errorCode = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    const error: WeatherError = {
      code: errorCode,
      message: `Weather service error: ${errorCode}`,
      canRetry: errorCode === 'NETWORK_ERROR' || errorCode === 'RATE_LIMIT'
    };
    
    throw error;
  }
  
  // Generate realistic weather data
  const now = new Date();
  const forecast: WeatherData[] = [];
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    
    // More sophisticated weather generation based on location and season
    const locationLower = location.toLowerCase();
    const month = date.getMonth();
    const isWinter = month >= 11 || month <= 2;
    const isSummer = month >= 5 && month <= 8;
    
    let baseTemp = 70;
    let conditions = ['Sunny', 'Partly Cloudy', 'Cloudy'];
    
    // Seasonal adjustments
    if (isWinter) {
      baseTemp -= 20;
      conditions = ['Cloudy', 'Light Snow', 'Partly Cloudy'];
    } else if (isSummer) {
      baseTemp += 10;
      conditions = ['Sunny', 'Hot', 'Partly Cloudy'];
    }
    
    // Location-specific adjustments
    if (locationLower.includes('miami') || locationLower.includes('florida')) {
      baseTemp += 15;
      conditions = isSummer ? ['Hot', 'Thunderstorms', 'Sunny'] : ['Sunny', 'Partly Cloudy'];
    } else if (locationLower.includes('seattle') || locationLower.includes('portland')) {
      baseTemp -= 10;
      conditions = ['Cloudy', 'Light Rain', 'Drizzle'];
    } else if (locationLower.includes('phoenix') || locationLower.includes('arizona')) {
      baseTemp += 20;
      conditions = ['Sunny', 'Hot', 'Clear'];
    }
    
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const tempVariation = (Math.random() - 0.5) * 8;
    const high = Math.round(baseTemp + tempVariation + (Math.random() * 5));
    const low = Math.round(high - 12 - (Math.random() * 8));
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[date.getDay()];
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      high,
      low,
      condition,
      icon: condition.toLowerCase().replace(/\s+/g, '-'),
      precipitationChance: condition.includes('Rain') || condition.includes('Snow') || condition.includes('Storm') 
        ? Math.round(60 + Math.random() * 30) 
        : Math.round(Math.random() * 20)
    });
  }
  
  return forecast;
};

/**
 * Enhanced weather hook with optimistic updates for immediate UI feedback
 * Provides instant weather predictions while actual data is being fetched
 */
export const useOptimisticWeather = () => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [weatherError, setWeatherError] = useState<WeatherError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // useOptimistic hook for immediate weather updates
  const [optimisticWeather, setOptimisticWeather] = useOptimistic(
    weatherData,
    (state: WeatherData[], prediction: Partial<WeatherData>[]) => {
      // Convert predictions to full WeatherData objects
      return prediction.map((pred, index) => ({
        date: pred.date || new Date().toISOString().split('T')[0],
        dayOfWeek: pred.dayOfWeek || 'Today',
        high: pred.high || 70,
        low: pred.low || 60,
        condition: pred.condition || 'Partly Cloudy',
        icon: pred.icon || 'partly-cloudy',
        precipitationChance: pred.precipitationChance || 0,
        ...pred
      })) as WeatherData[];
    }
  );

  // Update weather for a new location with optimistic updates
  const updateLocation = useCallback(async (location: string) => {
    if (!location.trim()) {
      return;
    }

    try {
      setWeatherError(null);
      setCurrentLocation(location);
      
      // Show immediate prediction based on location
      const prediction = predictWeatherFromLocation(location);
      setOptimisticWeather(prediction);
      
      // Fetch actual weather data
      const actualWeather = await fetchWeatherData(location);
      
      // Update with actual data (optimistic update automatically reverts)
      setWeatherData(actualWeather);
      setLastUpdated(new Date());
      
    } catch (error) {
      // Optimistic update automatically reverts on error
      if (error && typeof error === 'object' && 'code' in error) {
        setWeatherError(error as WeatherError);
      } else {
        setWeatherError({
          code: 'API_ERROR',
          message: 'Failed to fetch weather data',
          canRetry: true
        });
      }
      
      console.error('Weather update failed:', error);
    }
  }, [setOptimisticWeather]);

  // Refresh current weather data
  const refreshWeather = useCallback(async () => {
    if (!currentLocation) {
      return;
    }
    
    await updateLocation(currentLocation);
  }, [currentLocation, updateLocation]);

  // Clear optimistic state
  const clearOptimistic = useCallback(() => {
    setWeatherData([]);
    setWeatherError(null);
    setCurrentLocation('');
    setLastUpdated(null);
  }, []);

  // Check if we're currently updating (optimistic weather exists that isn't in actual data)
  const isUpdating = useMemo(() => {
    return optimisticWeather.length > 0 && optimisticWeather !== weatherData;
  }, [optimisticWeather, weatherData]);

  // Retry failed weather request
  const retryWeatherUpdate = useCallback(async () => {
    if (currentLocation && weatherError?.canRetry) {
      await updateLocation(currentLocation);
    }
  }, [currentLocation, weatherError, updateLocation]);

  return {
    // Current weather data (includes optimistic updates)
    weather: optimisticWeather,
    forecast: optimisticWeather,
    
    // State information
    location: currentLocation,
    isUpdating,
    error: weatherError,
    lastUpdated,
    
    // Actions
    updateLocation,
    refreshWeather,
    retryWeatherUpdate,
    clearOptimistic
  };
};

export type { OptimisticWeatherState, OptimisticWeatherActions };