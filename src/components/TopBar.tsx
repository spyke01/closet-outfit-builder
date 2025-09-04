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
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onRandomize, 
  onTitleClick, 
  weatherForecast = [], 
  weatherLoading = false, 
  weatherError = null 
}) => {
  return (
    <div className="bg-white border-b border-stone-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={onTitleClick}
          className="text-2xl font-light text-slate-800 tracking-wide hover:text-slate-600 transition-colors"
        >
          What to Wear
        </button>
        
        <div className="flex items-center gap-6">
          {/* Weather Widget - hidden on small screens, visible on md and up */}
          <div className="hidden md:block">
            <WeatherWidget
              forecast={weatherForecast}
              loading={weatherLoading}
              error={weatherError}
              className="text-sm"
            />
          </div>
          
          <button
            onClick={onRandomize}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors min-h-[44px] font-medium"
          >
            <Shuffle size={18} />
            Randomize
          </button>
        </div>
      </div>
    </div>
  );
};