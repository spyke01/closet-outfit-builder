'use client';

import React from 'react';
import { Cloud, Sun, CloudRain, RefreshCw, AlertCircle } from 'lucide-react';
import { useWeather, useAuth, useShowWeather } from '@/lib/hooks';

export const WeatherWidget: React.FC<{ className?: string }> = ({
  className = ""
}) => {
  const { user } = useAuth();
  const showWeather = useShowWeather(!!user);
  const { current, loading, error, retry } = useWeather(showWeather);

  // Don't render if user is not authenticated or weather is disabled
  if (!showWeather) {
    return null;
  }

  const getWeatherIcon = (condition: string) => {
    const iconProps = { size: 16, className: "text-slate-600 dark:text-slate-300" };
    
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
      case 'clear sky':
        return <Sun {...iconProps} />;
      case 'cloudy':
      case 'overcast':
      case 'few clouds':
      case 'scattered clouds':
      case 'broken clouds':
        return <Cloud {...iconProps} />;
      case 'rainy':
      case 'rain':
      case 'light rain':
      case 'moderate rain':
      case 'heavy rain':
      case 'shower rain':
        return <CloudRain {...iconProps} />;
      default:
        return <Cloud {...iconProps} />;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <RefreshCw size={16} className="animate-spin text-slate-400" />
        <span className="text-slate-500 dark:text-slate-400 text-xs">Loading weather...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle size={16} className="text-red-500" />
        <span className="text-red-600 dark:text-red-400 text-xs">
          {error.error}
        </span>
        <button
          onClick={retry}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1"
          aria-label="Retry loading weather"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getWeatherIcon(current.condition)}
      <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">
        {Math.round(current.temperature)}°
      </span>
      <span className="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline">
        {current.condition}
      </span>
    </div>
  );
};