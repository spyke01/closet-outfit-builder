import React from 'react';
import { Settings } from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';
import { Logo } from './Logo';
import { WeatherData, WeatherError } from '../types';

interface TopBarProps {
  onTitleClick: () => void;
  onSettingsClick?: () => void;
  weatherForecast?: WeatherData[];
  weatherLoading?: boolean;
  weatherError?: WeatherError | null;
  onWeatherRetry?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onTitleClick, 
  onSettingsClick,
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
          className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-0 focus:border-transparent active:outline-none"
          style={{ outline: 'none', border: 'none' }}
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
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-stone-100 dark:bg-slate-700 hover:bg-stone-200 dark:hover:bg-slate-600 transition-colors"
              aria-label="Open settings"
            >
              <Settings size={18} className="text-slate-700 dark:text-slate-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};