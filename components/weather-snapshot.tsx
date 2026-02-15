'use client';

import { WeatherData } from '@/lib/hooks/use-weather';
import type { WeatherError } from '@/lib/hooks/use-weather';
import { Cloud, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react';

interface WeatherSnapshotProps {
  current: {
    temperature: number;
    feelsLike?: number;
    condition: string;
    icon: string;
  } | null;
  forecast: WeatherData[];
  loading: boolean;
  error: WeatherError | null;
}

// Map weather conditions to icons
function getWeatherIcon(condition: string) {
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return CloudRain;
  }
  if (lowerCondition.includes('snow') || lowerCondition.includes('sleet')) {
    return CloudSnow;
  }
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
    return Cloud;
  }
  if (lowerCondition.includes('partly') || lowerCondition.includes('scattered')) {
    return CloudSun;
  }
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {
    return Sun;
  }
  
  // Default to cloud
  return Cloud;
}

export default function WeatherSnapshot({ current, forecast, loading, error }: WeatherSnapshotProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-24 mb-2"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }
  
  if (error || !current) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-foreground">Weather Unavailable</p>
            <p className="text-sm text-muted-foreground">Using neutral defaults</p>
          </div>
        </div>
      </div>
    );
  }
  
  const today = forecast[0];
  const WeatherIcon = getWeatherIcon(current.condition);
  
  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-4">
      <div className="flex items-start gap-3 mb-4">
        <WeatherIcon className="w-8 h-8 text-secondary flex-shrink-0 mt-1" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-3xl font-bold text-foreground">{Math.round(current.temperature)}°F</p>
          <p className="text-sm text-muted-foreground">{current.condition}</p>
        </div>
      </div>
      
      <div className="space-y-1 text-sm border-t border-border pt-4">
        {current.feelsLike !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Feels like:</span>
            <span className="text-foreground font-medium">{Math.round(current.feelsLike)}°F</span>
          </div>
        )}
        {today && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">High:</span>
            <span className="text-foreground font-medium">{Math.round(today.temperature.high)}°F</span>
          </div>
        )}
        {today && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Low:</span>
            <span className="text-foreground font-medium">{Math.round(today.temperature.low)}°F</span>
          </div>
        )}
        {today?.precipitationProbability !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rain:</span>
              <span className="text-foreground font-medium">{Math.round(today.precipitationProbability * 100)}%</span>
            </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 italic">
        A {current.condition.toLowerCase()} day calls for versatile layering.
      </p>
    </div>
  );
}
