import { createLogger } from '@/lib/utils/logger';
import { isGtagAvailable, trackEvent } from '@/lib/analytics/gtag';

const logger = createLogger({ component: 'lib-providers-third-party-integrations' });


/**
 * Third-party integrations that are loaded dynamically after hydration
 * This module handles optional dependencies gracefully
 */

interface SentryEventLike {
  exception?: {
    values?: Array<{
      value?: string;
    }>;
  };
}

interface WebVitalsMetric {
  name: string;
  id: string;
  value: number;
}

/**
 * Initialize error tracking services (Sentry, Bugsnag, etc.)
 */
export async function initializeErrorTracking() {
  // Only initialize in production
  if (process.env.NODE_ENV !== 'production') return;

  try {
    // Example: Initialize Sentry (if DSN is configured)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // Use Function constructor to avoid static analysis
        const importSentry = new Function('return import("@sentry/nextjs")');
        const sentryModule = await importSentry().catch(() => null);
        
        if (sentryModule) {
          sentryModule.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
            environment: process.env.NODE_ENV,
            tracesSampleRate: 0.1, // Low sample rate for performance
            beforeSend(event: SentryEventLike) {
              // Filter out noise
              if (event.exception) {
                const error = event.exception.values?.[0];
                if (error?.value?.includes('Non-Error promise rejection')) {
                  return null;
                }
              }
              return event;
            },
          });
        }
      } catch {
        // Sentry is optional, silently skip if not available
        logger.warn('Sentry not available, skipping error tracking setup');
      }
    }

    // Example: Initialize other error tracking services
    // if (process.env.NEXT_PUBLIC_BUGSNAG_API_KEY) {
    //   try {
    //     const importBugsnag = new Function('return import("@bugsnag/js")');
    //     const bugsnagModule = await importBugsnag().catch(() => null);
    //     if (bugsnagModule) {
    //       bugsnagModule.start({
    //         apiKey: process.env.NEXT_PUBLIC_BUGSNAG_API_KEY,
    //       });
    //     }
    //   } catch (error) {
    //     logger.warn('Bugsnag not available, skipping error tracking setup');
    //   }
    // }
  } catch (error) {
    logger.warn('Failed to initialize error tracking:', error);
  }
}

/**
 * Initialize analytics services (Google Analytics, Mixpanel, etc.)
 */
export async function initializeAnalytics() {
  // Only initialize in production
  if (process.env.NODE_ENV !== 'production') return;

  // Google Analytics is initialized by the root GoogleAnalytics component.
}

/**
 * Initialize performance monitoring services
 */
export async function initializePerformanceMonitoring() {
  try {
    // Initialize web-vitals for Core Web Vitals tracking
    if (process.env.NODE_ENV === 'production') {
      // Import individual functions from web-vitals v5
      const [
        { onCLS },
        { onFCP }, 
        { onLCP },
        { onTTFB }
      ] = await Promise.all([
        import('web-vitals/onCLS.js'),
        import('web-vitals/onFCP.js'),
        import('web-vitals/onLCP.js'),
        import('web-vitals/onTTFB.js')
      ]);
      
      // Send metrics to analytics service
      const sendToAnalytics = (metric: WebVitalsMetric) => {
        // Send to Google Analytics if available
        if (isGtagAvailable()) {
          trackEvent(metric.name, {
            event_category: 'Web Vitals',
            event_label: metric.id,
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            non_interaction: true,
          });
        }

        // Send to custom monitoring endpoint
        fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'metric',
            data: {
              name: metric.name,
              value: metric.value,
              url: window.location.href,
              timestamp: new Date().toISOString(),
            },
          }),
        }).catch(() => {
          // Silently fail to avoid cascading errors
        });
      };

      // Track Core Web Vitals
      onCLS(sendToAnalytics);
      onFCP(sendToAnalytics);
      onLCP(sendToAnalytics);
      onTTFB(sendToAnalytics);
    }
  } catch (error) {
    logger.warn('Failed to initialize performance monitoring:', error);
  }
}
