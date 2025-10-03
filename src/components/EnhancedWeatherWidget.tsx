/**
 * Enhanced WeatherWidget with Suspense boundaries and error recovery
 * Provides comprehensive error handling and loading states
 */

import React from 'react';
import { WeatherSuspenseBoundary } from './SuspenseErrorBoundary';
import { OptimisticWeatherWidget } from './OptimisticWeatherWidget';

interface EnhancedWeatherWidgetProps {
  location?: string;
  className?: string;
  autoLoad?: boolean;
  onError?: (error: Error) => void;
  onRetry?: () => void;
}

/**
 * WeatherWidget wrapped with enhanced Suspense boundaries and error recovery
 */
export const EnhancedWeatherWidget: React.FC<EnhancedWeatherWidgetProps> = ({
  location = 'New York, NY',
  className = '',
  autoLoad = true,
  onError,
  onRetry
}) => {
  const handleError = (error: Error, feature: string) => {
    console.error(`Weather widget error in ${feature}:`, error);
    onError?.(error);
  };

  const handleRetry = (feature: string) => {
    console.log(`Retrying ${feature} feature`);
    onRetry?.();
  };

  return (
    <WeatherSuspenseBoundary
      className={className}
      onError={handleError}
      onRetry={handleRetry}
      resetKeys={[location]}
    >
      <OptimisticWeatherWidget
        location={location}
        className={className}
        autoLoad={autoLoad}
      />
    </WeatherSuspenseBoundary>
  );
};

export default EnhancedWeatherWidget;