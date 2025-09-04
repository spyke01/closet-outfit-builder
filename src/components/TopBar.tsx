import React from 'react';
import { WeatherWidget } from './WeatherWidget';
import { WeatherData, WeatherError } from '../types';

interface TopBarProps {
  onTitleClick: () => void;
  weatherForecast?: WeatherData[];
  weatherLoading?: boolean;
  weatherError?: WeatherError | null;
  onWeatherRetry?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onTitleClick, 
  weatherForecast = [], 
  weatherLoading = false, 
  weatherError = null,
  onWeatherRetry
}) => {
  return (
    <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <button 
          onClick={onTitleClick}
          className="hover:opacity-80 transition-opacity"
        >
          <img 
            src="/what-to-wear-logo.svg" 
            alt="What to Wear" 
            className="h-8 sm:h-10 w-auto"
          />
        </button>
        
        <WeatherWidget
          forecast={weatherForecast}
          loading={weatherLoading}
          error={weatherError}
          onRetry={onWeatherRetry}
          className="text-sm"
        />
      </div>
    </div>
  );
};