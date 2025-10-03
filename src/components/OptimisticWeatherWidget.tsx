/**
 * Enhanced WeatherWidget with optimistic updates for immediate UI feedback
 * Provides instant weather predictions while actual data is being fetched
 */

import React, { useEffect } from 'react';
import { WeatherWidget } from './WeatherWidget';
import { useOptimisticWeather } from '../hooks/useOptimisticWeather';

interface OptimisticWeatherWidgetProps {
  location?: string;
  className?: string;
  autoLoad?: boolean;
}

/**
 * OptimisticWeatherWidget component that provides immediate weather predictions
 * while fetching actual weather data in the background
 */
export const OptimisticWeatherWidget: React.FC<OptimisticWeatherWidgetProps> = ({
  location = 'New York, NY',
  className = '',
  autoLoad = true
}) => {
  const {
    weather,
    isUpdating,
    error,
    updateLocation,
    retryWeatherUpdate
  } = useOptimisticWeather();

  // Auto-load weather data on mount if enabled
  useEffect(() => {
    if (autoLoad && location) {
      updateLocation(location);
    }
  }, [autoLoad, location, updateLocation]);

  // Handle retry with optimistic updates
  const handleRetry = async () => {
    try {
      await retryWeatherUpdate();
    } catch (error) {
      console.error('Weather retry failed:', error);
    }
  };

  return (
    <WeatherWidget
      forecast={weather}
      loading={isUpdating}
      error={error}
      onRetry={handleRetry}
      className={className}
    />
  );
};

export default OptimisticWeatherWidget;