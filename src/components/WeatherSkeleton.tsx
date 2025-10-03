import React from 'react';

export interface WeatherSkeletonProps {
  className?: string;
}

export const WeatherSkeleton: React.FC<WeatherSkeletonProps> = ({ 
  className = '' 
}) => {
  return (
    <div 
      className={`animate-pulse bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50 ${className}`}
      data-testid="weather-skeleton"
      role="status"
      aria-label="Loading weather data"
    >
      <div className="flex items-center space-x-3">
        {/* Weather icon skeleton */}
        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
        
        <div className="flex-1 min-w-0">
          {/* Temperature and condition skeleton */}
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-1"></div>
          
          {/* Location skeleton */}
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
        </div>
      </div>
      
      {/* Forecast skeleton */}
      <div className="mt-4 pt-3 border-t border-blue-200/30 dark:border-blue-800/30">
        <div className="flex justify-between space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded mx-auto mb-1"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherSkeleton;