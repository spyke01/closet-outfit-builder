'use client';

import React from 'react';

interface MonitoringProviderProps {
  children: React.ReactNode;
}

export function MonitoringProvider({ children }: MonitoringProviderProps) {
  React.useEffect(() => {
    // Defer monitoring initialization until after hydration
    if (typeof window !== 'undefined') {
      // Use setTimeout to defer until after initial render
      setTimeout(async () => {
        try {
          // Dynamic import for monitoring to reduce initial bundle size
          const { initializeMonitoring } = await import('@/lib/monitoring');
          initializeMonitoring();
        } catch (error) {
          console.warn('Failed to initialize monitoring:', error);
        }
      }, 1000); // Defer by 1 second to prioritize critical rendering
    }
  }, []);

  return <>{children}</>;
}