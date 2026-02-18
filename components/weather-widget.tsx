'use client';

import React, { useEffect } from 'react';
import { Cloud, Sun, CloudRain, RefreshCw, AlertCircle } from 'lucide-react';
import { SpinningIcon } from '@/components/ui/animated-icon';





import { useConditionalWeather, preloadWeatherModule } from '@/lib/hooks/use-conditional-weather';
import { useAuth } from '@/lib/hooks/use-auth';

export interface WeatherWidgetProps {
  className?: string;
  compact?: boolean;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  className = "",
  compact = true,
}) => {
  // ✅ Call all hooks first (Rules of Hooks)
  const { user } = useAuth();
  const { current, loading, error, retry, usingFallback, weatherEnabled } = useConditionalWeather(!!user);

  // Preload weather module after mount to keep interactions snappy.
  useEffect(() => {
    preloadWeatherModule();
  }, []);

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
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-[var(--app-weather-badge-border)] bg-[var(--app-weather-badge-bg)] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] ${className}`}
      >
        <SpinningIcon>
          <RefreshCw size={16} className="text-muted-foreground" />
        </SpinningIcon>
        <span className="text-muted-foreground text-xs">Loading…</span>
      </div>
    );
  }

  if (error) {
    // Determine if error is recoverable
    const isRecoverable = !error.error.includes('Location access') && 
                         !error.error.includes('permission') &&
                         !error.error.includes('Maximum retry attempts');

    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-[var(--app-weather-badge-border)] bg-[var(--app-weather-badge-bg)] px-3 py-1.5 ${className}`}
      >
        <AlertCircle size={16} className="text-destructive" />
        <span className="text-destructive text-xs max-w-24 truncate" title={error.error}>
          Weather error
        </span>
        {isRecoverable && (
          <button
            onClick={retry}
            className="text-xs text-primary hover:underline flex-shrink-0"
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
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--app-weather-badge-border)] bg-[var(--app-weather-badge-bg)] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${className}`}
    >
      {getWeatherIcon(current.condition)}
      <span className="text-foreground text-sm font-semibold tabular-nums">
        {Math.round(current.temperature)}°
      </span>
      {!compact && (
        <span className="text-muted-foreground text-xs hidden sm:inline">
          {current.condition}
        </span>
      )}
      {usingFallback && (
        <span 
          className="text-muted-foreground text-xs"
          title="Using estimated weather data"
        >
          ~
        </span>
      )}
    </div>
  );
};
