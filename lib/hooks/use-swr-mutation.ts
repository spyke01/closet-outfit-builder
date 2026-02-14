'use client';

import useSWRMutation from 'swr/mutation';
import type { SWRMutationConfiguration } from 'swr/mutation';

/**
 * Custom hook for mutations with optimistic updates
 * Wraps useSWRMutation with common patterns for the application
 */

interface MutationOptions<Data, Error, ExtraArg> extends SWRMutationConfiguration<Data, Error, string, ExtraArg> {
  onSuccess?: (data: Data) => void;
  onError?: (error: Error) => void;
}

type ApiMutationError = Error & {
  info?: unknown;
  status?: number;
};

/**
 * Generic mutation fetcher for API routes
 */
async function mutationFetcher<Data, ExtraArg>(
  url: string,
  { arg }: { arg: ExtraArg }
): Promise<Data> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error: ApiMutationError = new Error('Mutation failed');
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
}

/**
 * Hook for POST mutations with optimistic updates
 */
export function usePostMutation<Data = unknown, Error = unknown, ExtraArg = unknown>(
  key: string,
  options?: MutationOptions<Data, Error, ExtraArg>
) {
  return useSWRMutation<Data, Error, string, ExtraArg>(
    key,
    mutationFetcher,
    {
      ...options,
      onSuccess: (data) => {
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        options?.onError?.(error);
      },
    }
  );
}

/**
 * Hook for DELETE mutations
 */
export function useDeleteMutation<Data = unknown, Error = unknown, ExtraArg = unknown>(
  key: string,
  options?: MutationOptions<Data, Error, ExtraArg>
) {
  const deleteFetcher = async (url: string, { arg }: { arg: ExtraArg }): Promise<Data> => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(arg),
    });

    if (!res.ok) {
      const error: ApiMutationError = new Error('Delete failed');
      error.info = await res.json();
      error.status = res.status;
      throw error;
    }

    return res.json();
  };

  return useSWRMutation<Data, Error, string, ExtraArg>(key, deleteFetcher, options);
}

/**
 * Hook for PUT/PATCH mutations
 */
export function useUpdateMutation<Data = unknown, Error = unknown, ExtraArg = unknown>(
  key: string,
  method: 'PUT' | 'PATCH' = 'PUT',
  options?: MutationOptions<Data, Error, ExtraArg>
) {
  const updateFetcher = async (url: string, { arg }: { arg: ExtraArg }): Promise<Data> => {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(arg),
    });

    if (!res.ok) {
      const error: ApiMutationError = new Error('Update failed');
      error.info = await res.json();
      error.status = res.status;
      throw error;
    }

    return res.json();
  };

  return useSWRMutation<Data, Error, string, ExtraArg>(key, updateFetcher, options);
}
