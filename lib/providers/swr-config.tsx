'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

type SWRProviderError = Error & {
  info?: unknown;
  status?: number;
};

/**
 * Global SWR configuration provider
 * Configures default options for all SWR hooks in the application
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Deduplicate requests within 2 seconds
        dedupingInterval: 2000,
        
        // Revalidate on focus for fresh data
        revalidateOnFocus: true,
        
        // Revalidate on network reconnection
        revalidateOnReconnect: true,
        
        // Don't revalidate on mount if data is fresh
        revalidateIfStale: false,
        
        // Keep previous data while revalidating
        keepPreviousData: true,
        
        // Error retry configuration
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        
        // Focus throttle to prevent excessive revalidation
        focusThrottleInterval: 5000,
        
        // Default fetcher for API routes
        fetcher: async (url: string) => {
          const res = await fetch(url);
          
          if (!res.ok) {
            const error: SWRProviderError = new Error('An error occurred while fetching the data.');
            // Attach extra info to the error object
            error.info = await res.json();
            error.status = res.status;
            throw error;
          }
          
          return res.json();
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
