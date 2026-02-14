'use client';

import React from 'react';
import { withConditionalLoading } from './conditional-component-loader';
import { Cloud, Loader2 } from 'lucide-react';
import type { WeatherWidgetProps } from '../weather-widget';

// Loading component for weather widget
const WeatherWidgetLoading: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Loader2 size={16} className="animate-spin text-muted-foreground" />
    <span className="text-muted-foreground text-xs">Loading weather...</span>
  </div>
);

// Fallback component when weather is disabled
const WeatherWidgetFallback: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Cloud size={16} className="text-muted-foreground" />
    <span className="text-muted-foreground text-xs">Weather disabled</span>
  </div>
);

// Error component for weather widget
const WeatherWidgetError: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Cloud size={16} className="text-red-400" />
    <span className="text-red-500 dark:text-red-400 text-xs">Weather unavailable</span>
  </div>
);

/**
 * Conditionally loaded weather widget component
 * Only loads when weather feature is enabled and user is authenticated
 */
export const ConditionalWeatherWidget = withConditionalLoading<WeatherWidgetProps>(
  // Explicit props type avoids inference to never from lazy import unions.
  'weather',
  () =>
    import('../weather-widget').then(
      (mod): { default: React.ComponentType<WeatherWidgetProps> } => ({ default: mod.WeatherWidget })
    ),
  {
    fallback: <WeatherWidgetFallback />,
    loadingComponent: <WeatherWidgetLoading />,
    errorComponent: <WeatherWidgetError />,
    preloadOnHover: true,
  }
);
