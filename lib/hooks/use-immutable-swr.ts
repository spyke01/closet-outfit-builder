'use client';

import useSWRImmutable from 'swr/immutable';
import type { SWRConfiguration } from 'swr';

/**
 * Hook for fetching immutable/static content that never changes
 * Uses useSWRImmutable which disables all automatic revalidations
 */
export function useImmutableSWR<Data = any, Error = any>(
  key: string | null,
  fetcher?: (key: string) => Promise<Data>,
  options?: SWRConfiguration<Data, Error>
) {
  return useSWRImmutable<Data, Error>(key, fetcher, options);
}

/**
 * Hook for fetching static configuration data
 */
export function useStaticConfig<T = any>(configKey: string) {
  return useImmutableSWR<T>(
    `/api/config/${configKey}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json();
    }
  );
}

/**
 * Hook for fetching static reference data (categories, tags, etc.)
 */
export function useStaticReference<T = any>(referenceType: string) {
  return useImmutableSWR<T>(
    `/api/reference/${referenceType}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch reference data');
      return res.json();
    }
  );
}
