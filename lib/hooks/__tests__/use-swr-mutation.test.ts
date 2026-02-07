import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePostMutation, useDeleteMutation, useUpdateMutation } from '../use-swr-mutation';

// Mock fetch
global.fetch = vi.fn();

describe('SWR Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('usePostMutation', () => {
    it('should successfully perform POST mutation', async () => {
      const mockData = { id: '1', name: 'Test Item' };
      const mockResponse = { ok: true, json: async () => mockData };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => usePostMutation('/api/items'));

      const mutationArg = { name: 'Test Item' };
      const promise = result.current.trigger(mutationArg);

      await waitFor(() => {
        expect(result.current.isMutating).toBe(false);
      });

      const data = await promise;
      expect(data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutationArg),
        })
      );
    });

    it('should handle POST mutation errors', async () => {
      const mockError = { message: 'Validation failed' };
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => mockError,
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => usePostMutation('/api/items'));

      try {
        await result.current.trigger({ name: '' });
      } catch (error) {
        const apiError = error as { message: string; status: number; info: unknown };
        expect(apiError.message).toBe('Mutation failed');
        expect(apiError.status).toBe(400);
        expect(apiError.info).toEqual(mockError);
      }
    });

    it('should call onSuccess callback', async () => {
      const mockData = { id: '1', name: 'Test Item' };
      const mockResponse = { ok: true, json: async () => mockData };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        usePostMutation('/api/items', { onSuccess })
      );

      await result.current.trigger({ name: 'Test Item' });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });
    });

    it('should call onError callback', async () => {
      const mockError = { message: 'Server error' };
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => mockError,
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const onError = vi.fn();
      const { result } = renderHook(() =>
        usePostMutation('/api/items', { onError })
      );

      try {
        await result.current.trigger({ name: 'Test Item' });
      } catch (error) {
        await waitFor(() => {
          expect(onError).toHaveBeenCalled();
        });
      }
    });
  });

  describe('useDeleteMutation', () => {
    it('should successfully perform DELETE mutation', async () => {
      const mockData = { success: true };
      const mockResponse = { ok: true, json: async () => mockData };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDeleteMutation('/api/items'));

      const data = await result.current.trigger({ id: '1' });

      expect(data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: '1' }),
        })
      );
    });

    it('should handle DELETE mutation errors', async () => {
      const mockError = { message: 'Not found' };
      const mockResponse = {
        ok: false,
        status: 404,
        json: async () => mockError,
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useDeleteMutation('/api/items'));

      try {
        await result.current.trigger({ id: '999' });
      } catch (error) {
        const apiError = error as { message: string; status: number };
        expect(apiError.message).toBe('Delete failed');
        expect(apiError.status).toBe(404);
      }
    });
  });

  describe('useUpdateMutation', () => {
    it('should successfully perform PUT mutation', async () => {
      const mockData = { id: '1', name: 'Updated Item' };
      const mockResponse = { ok: true, json: async () => mockData };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useUpdateMutation('/api/items', 'PUT'));

      const data = await result.current.trigger({ id: '1', name: 'Updated Item' });

      expect(data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should successfully perform PATCH mutation', async () => {
      const mockData = { id: '1', name: 'Patched Item' };
      const mockResponse = { ok: true, json: async () => mockData };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useUpdateMutation('/api/items', 'PATCH'));

      const data = await result.current.trigger({ name: 'Patched Item' });

      expect(data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should handle UPDATE mutation errors', async () => {
      const mockError = { message: 'Unauthorized' };
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => mockError,
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useUpdateMutation('/api/items'));

      try {
        await result.current.trigger({ id: '1', name: 'Updated' });
      } catch (error) {
        const apiError = error as { message: string; status: number };
        expect(apiError.message).toBe('Update failed');
        expect(apiError.status).toBe(401);
      }
    });
  });
});
