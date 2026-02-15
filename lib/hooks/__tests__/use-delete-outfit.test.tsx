import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/lib/test/query-utils';
import { useDeleteOutfit } from '../use-outfits';

const calendarDeleteEqUser = vi.fn();
const calendarDeleteEqOutfit = vi.fn(() => ({ eq: calendarDeleteEqUser }));
const calendarDelete = vi.fn(() => ({ eq: calendarDeleteEqOutfit }));

const tripDaysDeleteEqOutfit = vi.fn();
const tripDaysDelete = vi.fn(() => ({ eq: tripDaysDeleteEqOutfit }));

const outfitDeleteEqUser = vi.fn();
const outfitDeleteEqId = vi.fn(() => ({ eq: outfitDeleteEqUser }));
const outfitDelete = vi.fn(() => ({ eq: outfitDeleteEqId }));

const fromMock = vi.fn((table: string) => {
  if (table === 'calendar_entries') {
    return { delete: calendarDelete };
  }
  if (table === 'outfits') {
    return { delete: outfitDelete };
  }
  if (table === 'trip_days') {
    return { delete: tripDaysDelete };
  }
  throw new Error(`Unexpected table: ${table}`);
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: fromMock,
  }),
}));

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    userId: 'user-1',
    isAuthenticated: true,
  }),
}));

describe('useDeleteOutfit', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    Wrapper.displayName = 'QueryClientWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();

    calendarDeleteEqUser.mockResolvedValue({ error: null });
    tripDaysDeleteEqOutfit.mockResolvedValue({ error: null });
    outfitDeleteEqUser.mockResolvedValue({ error: null });
  });

  it('deletes linked calendar entries before deleting the outfit', async () => {
    const { result } = renderHook(() => useDeleteOutfit(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('outfit-1');
    });

    expect(fromMock).toHaveBeenCalledWith('calendar_entries');
    expect(calendarDelete).toHaveBeenCalledTimes(1);
    expect(calendarDeleteEqOutfit).toHaveBeenCalledWith('outfit_id', 'outfit-1');
    expect(calendarDeleteEqUser).toHaveBeenCalledWith('user_id', 'user-1');

    expect(fromMock).toHaveBeenCalledWith('trip_days');
    expect(tripDaysDelete).toHaveBeenCalledTimes(1);
    expect(tripDaysDeleteEqOutfit).toHaveBeenCalledWith('outfit_id', 'outfit-1');

    expect(fromMock).toHaveBeenCalledWith('outfits');
    expect(outfitDelete).toHaveBeenCalledTimes(1);
    expect(outfitDeleteEqId).toHaveBeenCalledWith('id', 'outfit-1');
    expect(outfitDeleteEqUser).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('does not delete the outfit if calendar entry deletion fails', async () => {
    calendarDeleteEqUser.mockResolvedValue({
      error: { message: 'calendar failure' },
    });

    const { result } = renderHook(() => useDeleteOutfit(), {
      wrapper: createWrapper(),
    });

    let thrownError: unknown = null;
    await act(async () => {
      try {
        await result.current.mutateAsync('outfit-1');
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toBe('Failed to delete linked calendar entries: calendar failure');

    expect(tripDaysDelete).not.toHaveBeenCalled();
    expect(outfitDelete).not.toHaveBeenCalled();
  });

  it('does not delete the outfit if trip day deletion fails', async () => {
    tripDaysDeleteEqOutfit.mockResolvedValue({
      error: { message: 'trip day failure' },
    });

    const { result } = renderHook(() => useDeleteOutfit(), {
      wrapper: createWrapper(),
    });

    let thrownError: unknown = null;
    await act(async () => {
      try {
        await result.current.mutateAsync('outfit-1');
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toBe('Failed to delete linked trip days: trip day failure');
    expect(outfitDelete).not.toHaveBeenCalled();
  });
});
