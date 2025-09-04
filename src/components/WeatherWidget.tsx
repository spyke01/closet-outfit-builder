/**
 * WeatherWidget component for displaying 3-day weather forecast
 * Shows high/low temperatures, dates, weather icons, and precipitation chances
 */

import React from 'react';
import { WeatherData, WeatherError } from '../types';
import { Cloud, CloudRain, Sun, CloudSnow, Zap, CloudDrizzle, Loader2, AlertCircle } from 'lucide-react';

interface WeatherWidgetProps {
  forecast: WeatherData[];
  loading?: boolean;
  error?: WeatherError | null;
  className?: string;
}

/**
 * Maps weather condition strings to appropriate Lucide icons
 * @param condition - Weather condition string
 * @param precipitationChance - Optional precipitation percentage
 * @returns Lucide icon component
 */
const getWeatherIcon = (condition: string, precipitationChance?: number) => {
  const conditionLower = condition.toLowerCase();
  
  // Check for precipitation first
  if (precipitationChance && precipitationChance > 60) {
    if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
      return CloudSnow;
    }
    if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
      return Zap;
    }
    if (conditionLower.includes('drizzle') || conditionLower.includes('light rain')) {
      return CloudDrizzle;
    }
    return CloudRain;
  }
  
  // Weather condition mapping
  if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
    return Sun;
  }
  if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
    return CloudRain;
  }
  if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
    return CloudSnow;
  }
  if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
    return Zap;
  }
  if (conditionLower.includes('drizzle')) {
    return CloudDrizzle;
  }
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
    return Cloud;
  }
  
  // Default to cloud for unknown conditions
  return Cloud;
};

/**
 * Formats date string to display format (e.g., "Mon 12/25")
 * @param dateString - ISO date string
 * @param dayOfWeek - Day of week string
 * @returns Formatted date string
 */
const formatDisplayDate = (dateString: string, dayOfWeek: string): string => {
  // Parse date as UTC to avoid timezone issues
  const date = new Date(dateString + 'T00:00:00.000Z');
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const shortDay = dayOfWeek.substring(0, 3); // "Monday" -> "Mon"
  
  return `${shortDay} ${month}/${day}`;
};

/**
 * WeatherWidget component displaying 3-day forecast
 */
export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  forecast,
  loading = false,
  error = null,
  className = ''
}) => {
  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center space-x-2 text-gray-600 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading weather...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Weather unavailable</span>
      </div>
    );
  }

  // No forecast data
  if (!forecast || forecast.length === 0) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <Cloud className="w-4 h-4" />
        <span className="text-sm">No weather data</span>
      </div>
    );
  }

  // Take only first 3 days for display
  const displayForecast = forecast.slice(0, 3);

  return (
    <div className={`flex space-x-4 ${className}`}>
      {displayForecast.map((day, index) => {
        const IconComponent = getWeatherIcon(day.condition, day.precipitationChance);
        const displayDate = formatDisplayDate(day.date, day.dayOfWeek);
        
        return (
          <div 
            key={day.date} 
            className="flex flex-col items-center space-y-1 min-w-0"
            role="group"
            aria-label={`Weather for ${day.dayOfWeek}`}
          >
            {/* Date */}
            <div className="text-xs text-gray-600 font-medium whitespace-nowrap">
              {displayDate}
            </div>
            
            {/* Weather Icon */}
            <div className="flex items-center justify-center">
              <IconComponent 
                className="w-5 h-5 text-gray-700" 
                aria-label={day.condition}
              />
            </div>
            
            {/* Temperature Range */}
            <div className="flex flex-col items-center space-y-0">
              <span className="text-sm font-semibold text-gray-900">
                {Math.round(day.high)}°
              </span>
              <span className="text-xs text-gray-500">
                {Math.round(day.low)}°
              </span>
            </div>
            
            {/* Precipitation Chance */}
            {day.precipitationChance !== undefined && day.precipitationChance > 0 && (
              <div className="text-xs text-blue-600">
                {day.precipitationChance}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeatherWidget;