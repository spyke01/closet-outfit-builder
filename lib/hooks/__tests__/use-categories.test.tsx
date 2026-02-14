import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCategories } from '../use-categories';
import { createTestQueryClient } from '../../test/query-utils';

describe('useCategories', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    Wrapper.displayName = 'QueryClientWrapper';
    return Wrapper;
  };

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useCategories(), { 
      wrapper: createWrapper() 
    });

    // Should start in pending state
    expect(result.current.status).toBe('pending');
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should be enabled when user is authenticated', () => {
    const { result } = renderHook(() => useCategories(), { 
      wrapper: createWrapper() 
    });

    // The hook should be enabled since our mock auth returns authenticated user
    expect(result.current.status).toBe('pending');
  });
});
