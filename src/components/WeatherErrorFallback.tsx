import React from 'react';
import { AlertCircle, RefreshCw, Cloud } from 'lucide-react';
import { ErrorFallbackProps } from './EnhancedErrorBoundary';

export interface WeatherErrorFallbackProps extends ErrorFallbackProps {
  onUseCachedData?: () => void;
  hasCachedData?: boolean;
}

export const WeatherErrorFallback: React.FC<WeatherErrorFallbackProps> = ({
  error,
  retry,
  retryCount,
  onUseCachedData,
  hasCachedData = false,
}) => {
  const getErrorMessage = (error: Error) => {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect to weather service. Check your internet connection.';
    }
    if (error.message.includes('location') || error.message.includes('geocoding')) {
      return 'Unable to determine your location. Please check location permissions.';
    }
    if (error.message.includes('API') || error.message.includes('key')) {
      return 'Weather service is temporarily unavailable.';
    }
    return 'Unable to fetch weather information.';
  };

  const getSuggestion = (error: Error) => {
    if (error.message.includes('location')) {
      return 'Try enabling location services or entering your location manually.';
    }
    if (error.message.includes('network')) {
      return 'Check your internet connection and try again.';
    }
    return 'You can continue using the app with cached data or try again later.';
  };

  return (
    <div 
      className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4"
      role="alert"
      data-testid="weather-error-fallback"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Weather data unavailable
          </h3>
          <p className="text-red-600 dark:text-red-300 text-xs mb-2">
            {getErrorMessage(error)}
          </p>
          <p className="text-red-500 dark:text-red-400 text-xs mb-3">
            {getSuggestion(error)}
          </p>
          
          {retryCount > 0 && (
            <p className="text-red-500 dark:text-red-400 text-xs mb-2">
              Retry attempt {retryCount}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={retry}
              disabled={retryCount >= 3}
              className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded text-xs font-medium transition-colors disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </button>
            
            {hasCachedData && (
              <button
                onClick={onUseCachedData}
                className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
              >
                <Cloud className="w-3 h-3 mr-1" />
                Use Cached Data
              </button>
            )}
            
            <button
              onClick={() => {
                // Continue without weather data
                const event = new CustomEvent('continueWithoutWeather');
                window.dispatchEvent(event);
              }}
              className="inline-flex items-center px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs font-medium transition-colors"
            >
              Continue Without Weather
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherErrorFallback;