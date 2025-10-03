import React, { ReactNode, Suspense } from 'react';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';
import { WeatherErrorFallback } from './WeatherErrorFallback';
import { OutfitErrorFallback } from './OutfitErrorFallback';
import { WeatherSkeleton } from './WeatherSkeleton';
import { OutfitGenerationSkeleton } from './OutfitGenerationSkeleton';

export type FeatureType = 'weather' | 'outfit' | 'wardrobe' | 'general';

export interface SuspenseErrorBoundaryProps {
  children: ReactNode;
  feature: FeatureType;
  fallback?: ReactNode;
  className?: string;
  onError?: (error: Error, feature: FeatureType) => void;
  onRetry?: (feature: FeatureType) => void;
  resetKeys?: Array<string | number>;
}

export const SuspenseErrorBoundary: React.FC<SuspenseErrorBoundaryProps> = ({
  children,
  feature,
  fallback,
  className = '',
  onError,
  onRetry,
  resetKeys,
}) => {
  // Get appropriate loading skeleton based on feature
  const getLoadingSkeleton = (feature: FeatureType): ReactNode => {
    switch (feature) {
      case 'weather':
        return <WeatherSkeleton className={className} />;
      case 'outfit':
      case 'wardrobe':
        return <OutfitGenerationSkeleton className={className} />;
      default:
        return (
          <div 
            className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 ${className}`}
            data-testid="general-skeleton"
          >
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        );
    }
  };

  // Get appropriate error fallback based on feature
  const getErrorFallback = (feature: FeatureType) => {
    switch (feature) {
      case 'weather':
        return WeatherErrorFallback;
      case 'outfit':
      case 'wardrobe':
        return OutfitErrorFallback;
      default:
        return undefined; // Use default error boundary fallback
    }
  };

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Feature-specific error handling
    console.error(`Error in ${feature} feature:`, error);
    
    // Call custom error handler if provided
    onError?.(error, feature);
    
    // Feature-specific error reporting
    reportFeatureError(error, errorInfo, feature);
  };

  const handleRetry = () => {
    onRetry?.(feature);
  };

  const ErrorFallbackComponent = getErrorFallback(feature);

  return (
    <EnhancedErrorBoundary
      fallback={ErrorFallbackComponent ? ({ error, errorInfo, retry, retryCount }) => (
        <ErrorFallbackComponent
          error={error}
          errorInfo={errorInfo}
          retry={() => {
            handleRetry();
            retry();
          }}
          retryCount={retryCount}
        />
      ) : undefined}
      onError={handleError}
      resetKeys={resetKeys}
      resetOnPropsChange={true}
    >
      <Suspense fallback={fallback || getLoadingSkeleton(feature)}>
        {children}
      </Suspense>
    </EnhancedErrorBoundary>
  );
};

// Feature-specific error reporting
const reportFeatureError = (
  error: Error, 
  errorInfo: React.ErrorInfo, 
  feature: FeatureType
) => {
  const errorReport = {
    feature,
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Log feature-specific error context
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 ${feature.toUpperCase()} Feature Error`);
    console.error('Error:', error);
    console.error('Feature Context:', {
      feature,
      timestamp: errorReport.timestamp,
      url: errorReport.url,
    });
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
  }

  // In production, send to error tracking service with feature context
  // Example: errorTracker.captureException(error, {
  //   tags: { feature },
  //   extra: errorReport
  // });
};

// Convenience components for specific features
export const WeatherSuspenseBoundary: React.FC<Omit<SuspenseErrorBoundaryProps, 'feature'>> = (props) => (
  <SuspenseErrorBoundary {...props} feature="weather" />
);

export const OutfitSuspenseBoundary: React.FC<Omit<SuspenseErrorBoundaryProps, 'feature'>> = (props) => (
  <SuspenseErrorBoundary {...props} feature="outfit" />
);

export const WardrobeSuspenseBoundary: React.FC<Omit<SuspenseErrorBoundaryProps, 'feature'>> = (props) => (
  <SuspenseErrorBoundary {...props} feature="wardrobe" />
);

export default SuspenseErrorBoundary;