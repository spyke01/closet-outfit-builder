'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { isFeatureEnabled } from '@/lib/utils/feature-flags';
import { createQueryClient } from '@/lib/query-client';

// Dynamic import for dev tools to avoid loading in production bundle
const ReactQueryDevtools = dynamic(
  () => {
    // Only load if dev tools are enabled
    if (!isFeatureEnabled('devTools')) {
      return Promise.resolve({ default: () => null });
    }
    
    return import('@tanstack/react-query-devtools').then(mod => ({ 
      default: mod.ReactQueryDevtools 
    }));
  },
  { ssr: false }
);

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create a new QueryClient instance for each provider
  // This ensures that each user session has its own query cache
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools when enabled */}
      {isFeatureEnabled('devTools') && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
