/**
 * WeatherWidget component for displaying 3-day weather forecast
 * Shows high/low temperatures, dates, weather icons, and precipitation chances
 * Includes comprehensive error handling and graceful degradation
 * Supports both direct data props and optimistic updates with location-based loading
 */

import React, { useEffect } from 'react';
import { WeatherData, WeatherError } from '../types';
import { Cloud, CloudRain, Sun, CloudSnow, Zap, CloudDrizzle, Loader2, AlertCircle, MapPin, RefreshCw } from 'lucide-react';
import { useOptimisticWeather } from '../hooks/useOptimisticWeather';

interface WeatherWidgetProps {
  // Direct data props (for backward compatibility)
  forecast?: WeatherData[];
  loading?: boolean;
  error?: WeatherError | null;
  onRetry?: () => void;
  
  // Optimistic weather props (for enhanced functionality)
  location?: string;
  autoLoad?: boolean;
  useOptimistic?: boolean;
  
  // Common props
  className?: string;
  showFallback?: boolean;
}

/**
 * Maps weather condition strings to appropriate Lucide icons
 * @param condition - Weather condition string
 * @param precipitationChance - Optional precipitation percentage
 * @returns Lucide icon component
 */
const getWeatherIcon = (condition: string, precipitationChance?: number) => {
  const conditionLower = condition.toLowerCase();
  
  // Check for precipitation first
  if (precipitationChance && precipitationChance > 60) {
    if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
      return CloudSnow;
    }
    if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
      return Zap;
    }
    if (conditionLower.includes('drizzle') || conditionLower.includes('light rain')) {
      return CloudDrizzle;
    }
    return CloudRain;
  }
  
  // Weather condition mapping
  if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
    return Sun;
  }
  if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
    return CloudRain;
  }
  if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
    return CloudSnow;
  }
  if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
    return Zap;
  }
  if (conditionLower.includes('drizzle')) {
    return CloudDrizzle;
  }
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
    return Cloud;
  }
  
  // Default to cloud for unknown conditions
  return Cloud;
};

/**
 * Formats date string to display format (e.g., "Mon 12/25")
 * @param dateString - ISO date string
 * @param dayOfWeek - Day of week string
 * @returns Formatted date string
 */
const formatDisplayDate = (dateString: string, dayOfWeek: string): string => {
  // Parse date as UTC to avoid timezone issues
  const date = new Date(dateString + 'T00:00:00.000Z');
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const shortDay = dayOfWeek.substring(0, 3); // "Monday" -> "Mon"
  
  return `${shortDay} ${month}/${day}`;
};

/**
 * Gets user-friendly error message based on error type
 * @param error - WeatherError object
 * @returns User-friendly error message
 */
const getErrorMessage = (error: WeatherError): string => {
  switch (error.code) {
    case 'LOCATION_ERROR':
      return 'Location needed for weather';
    case 'RATE_LIMIT':
      return 'Weather service busy';
    case 'UNAUTHORIZED':
      return 'Weather service unavailable';
    case 'NETWORK_ERROR':
      return 'Connection issue';
    case 'API_ERROR':
    default:
      return 'Weather unavailable';
  }
};

/**
 * Gets appropriate icon for error type
 * @param error - WeatherError object
 * @returns Lucide icon component
 */
const getErrorIcon = (error: WeatherError) => {
  switch (error.code) {
    case 'LOCATION_ERROR':
      return MapPin;
    case 'RATE_LIMIT':
    case 'NETWORK_ERROR':
      return RefreshCw;
    case 'UNAUTHORIZED':
    case 'API_ERROR':
    default:
      return AlertCircle;
  }
};

/**
 * WeatherWidget component displaying 3-day forecast with comprehensive error handling
 * Supports both direct props and optimistic updates based on useOptimistic flag
 */
export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  // Direct props
  forecast: directForecast,
  loading: directLoading = false,
  error: directError = null,
  onRetry: directOnRetry,
  
  // Optimistic props
  location = 'New York, NY',
  autoLoad = true,
  useOptimistic = false,
  
  // Common props
  className = '',
  showFallback = true
}) => {
  // Use optimistic weather hook if enabled
  const optimisticWeather = useOptimisticWeather();
  
  // Auto-load weather data on mount if optimistic mode is enabled
  useEffect(() => {
    if (useOptimistic && autoLoad && location) {
      optimisticWeather.updateLocation(location);
    }
  }, [useOptimistic, autoLoad, location, optimisticWeather.updateLocation]);

  // Determine which data source to use
  const forecast = useOptimistic ? optimisticWeather.weather : (directForecast || []);
  const loading = useOptimistic ? optimisticWeather.isUpdating : directLoading;
  const error = useOptimistic ? optimisticWeather.error : directError;
  
  // Handle retry with appropriate method
  const handleRetry = async () => {
    if (useOptimistic) {
      try {
        await optimisticWeather.retryWeatherUpdate();
      } catch (error) {
        console.error('Weather retry failed:', error);
      }
    } else if (directOnRetry) {
      directOnRetry();
    }
  };
  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center space-x-2 text-gray-600 dark:text-gray-400 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading weather...</span>
      </div>
    );
  }

  // Error state with enhanced messaging and retry option
  if (error) {
    const ErrorIcon = getErrorIcon(error);
    const errorMessage = getErrorMessage(error);
    const canRetry = error.code === 'NETWORK_ERROR' || error.code === 'RATE_LIMIT';
    
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <ErrorIcon className={`w-4 h-4 ${
          error.code === 'LOCATION_ERROR' ? 'text-blue-500 dark:text-blue-400' : 
          canRetry ? 'text-orange-500 dark:text-orange-400' : 'text-red-500 dark:text-red-400'
        }`} />
        <span className={`text-sm ${
          error.code === 'LOCATION_ERROR' ? 'text-blue-600 dark:text-blue-400' : 
          canRetry ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {errorMessage}
        </span>
        {canRetry && (directOnRetry || useOptimistic) && (
          <button
            onClick={handleRetry}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline ml-1"
            aria-label="Retry loading weather"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // No forecast data - show fallback if enabled
  if (!forecast || forecast.length === 0) {
    if (!showFallback) {
      return null;
    }
    
    return (
      <div className={`flex items-center space-x-2 text-gray-500 dark:text-gray-400 ${className}`}>
        <Cloud className="w-4 h-4" />
        <span className="text-sm">Weather data unavailable</span>
        {(directOnRetry || useOptimistic) && (
          <button
            onClick={handleRetry}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline ml-1"
            aria-label="Retry loading weather"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Take only first 3 days for display
  const displayForecast = forecast.slice(0, 3);

  return (
    <div className={`flex space-x-2 sm:space-x-4 ${className}`}>
      {displayForecast.map((day) => {
        const IconComponent = getWeatherIcon(day.condition, day.precipitationChance);
        const displayDate = formatDisplayDate(day.date, day.dayOfWeek);
        
        return (
          <div 
            key={day.date} 
            className="flex flex-col items-center space-y-1 min-w-0 flex-shrink-0"
            role="group"
            aria-label={`Weather for ${day.dayOfWeek}`}
          >
            {/* Date */}
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
              {displayDate}
            </div>
            
            {/* Weather Icon */}
            <div className="flex items-center justify-center">
              <IconComponent 
                className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" 
                aria-label={day.condition}
              />
            </div>
            
            {/* Temperature Range */}
            <div className="flex flex-col items-center space-y-0">
              <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                {Math.round(day.high)}°
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(day.low)}°
              </span>
            </div>
            
            {/* Precipitation Chance */}
            {day.precipitationChance !== undefined && day.precipitationChance > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {day.precipitationChance}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeatherWidget;