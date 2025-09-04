import React from 'react';
import { Shuffle } from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';
import { WeatherData, WeatherError } from '../types';

interface TopBarProps {
  onRandomize: () => void;
  onTitleClick: () => void;
  weatherForecast?: WeatherData[];
  weatherLoading?: boolean;
  weatherError?: WeatherError | null;
  onWeatherRetry?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onRandomize, 
  onTitleClick, 
  weatherForecast = [], 
  weatherLoading = false, 
  weatherError = null,
  onWeatherRetry
}) => {
  return (
    <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button 
          onClick={onTitleClick}
          className="text-xl sm:text-2xl font-light text-slate-800 tracking-wide hover:text-slate-600 transition-colors text-left"
        >
          What to Wear
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Weather Widget - show on mobile in stacked layout, inline on larger screens */}
          <div className="order-2 sm:order-1">
            <WeatherWidget
              forecast={weatherForecast}
              loading={weatherLoading}
              error={weatherError}
              onRetry={onWeatherRetry}
              className="text-sm"
            />
          </div>
          
          <button
            onClick={onRandomize}
            className="order-1 sm:order-2 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors min-h-[44px] font-medium w-full sm:w-auto"
          >
            <Shuffle size={18} />
            <span className="sm:inline">Randomize</span>
          </button>
        </div>
      </div>
    </div>
  );
};