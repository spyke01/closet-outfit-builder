'use client';

import React from 'react';
import { initializeMonitoring } from '@/lib/monitoring';

interface MonitoringProviderProps {
  children: React.ReactNode;
}

export function MonitoringProvider({ children }: MonitoringProviderProps) {
  React.useEffect(() => {
    // Initialize monitoring on client-side only
    if (typeof window !== 'undefined') {
      initializeMonitoring();
    }
  }, []);

  return <>{children}</>;
}