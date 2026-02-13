'use client';

import React from 'react';
import { Cloud, Sun, CloudRain, RefreshCw, AlertCircle } from 'lucide-react';
import { SpinningIcon } from '@/components/ui/animated-icon';





import { useConditionalWeather, preloadWeatherModule } from '@/lib/hooks/use-conditional-weather';
import { useAuth } from '@/lib/hooks/use-auth';

export const WeatherWidget: React.FC<{ className?: string }> = ({
  className = ""
}) => {
  // ✅ Call all hooks first (Rules of Hooks)
  const { user } = useAuth();
  const { current, loading, error, retry, usingFallback, weatherEnabled } = useConditionalWeather(!!user);

  // Preload weather module on hover for better UX
  const handleMouseEnter = () => {
    preloadWeatherModule();
  };

  // ✅ Early returns after all hooks are called
  // Don't render if weather is not enabled
  if (!weatherEnabled) {
    return null;
  }

  const getWeatherIcon = (condition: string) => {
    const iconProps = { size: 16, className: "text-muted-foreground" };
    
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
        <SpinningIcon>
          <RefreshCw size={16} className="text-muted-foreground" />
        </SpinningIcon>
        <span className="text-muted-foreground text-xs">Loading weather…</span>
      </div>
    );
  }

  if (error) {
    // Determine if error is recoverable
    const isRecoverable = !error.error.includes('Location access') && 
                         !error.error.includes('permission') &&
                         !error.error.includes('Maximum retry attempts');

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle size={16} className="text-destructive" />
        <span className="text-destructive text-xs max-w-48 truncate" title={error.error}>
          {error.error}
        </span>
        {isRecoverable && (
          <button
            onClick={retry}
            className="text-xs text-primary hover:underline ml-1 flex-shrink-0"
            aria-label="Retry loading weather"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!current) {
    return null;
  }

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      onMouseEnter={handleMouseEnter}
    >
      {getWeatherIcon(current.condition)}
      <span className="text-muted-foreground text-sm font-medium">
        {Math.round(current.temperature)}°
      </span>
      <span className="text-muted-foreground text-xs hidden sm:inline">
        {current.condition}
      </span>
      {usingFallback && (
        <span 
          className="text-amber-600 dark:text-amber-400 text-xs"
          title="Using estimated weather data"
        >
          ~
        </span>
      )}
    </div>
  );
};
