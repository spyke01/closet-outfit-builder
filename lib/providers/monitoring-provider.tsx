'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { isFeatureEnabled } from '@/lib/utils/feature-flags';

interface MonitoringProviderProps {
  children: React.ReactNode;
}

// Conditionally import monitoring with SSR disabled to defer until after hydration
const DeferredMonitoring = dynamic(
  () => {
    // Only load if monitoring is enabled
    if (!isFeatureEnabled('monitoring')) {
      return Promise.resolve({ default: () => null });
    }
    
    return import('./deferred-monitoring').then(mod => ({ default: mod.DeferredMonitoring }));
  },
  { 
    ssr: false, // Critical: Prevents SSR to defer until after hydration
    loading: () => null // No loading UI needed for monitoring
  }
);

export function MonitoringProvider({ children }: MonitoringProviderProps) {
  return (
    <>
      {children}
      <DeferredMonitoring />
    </>
  );
}