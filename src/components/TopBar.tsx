import React from 'react';
import { WeatherWidget } from './WeatherWidget';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
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
    <div className="bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 px-4 sm:px-6 py-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <button 
          onClick={onTitleClick}
          className="hover:opacity-80 transition-opacity"
        >
          <Logo className="h-8 sm:h-10 w-auto" />
        </button>
        
        <div className="flex items-center gap-3">
          <WeatherWidget
            forecast={weatherForecast}
            loading={weatherLoading}
            error={weatherError}
            onRetry={onWeatherRetry}
            className="text-sm"
          />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};