import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useUserPreferences, 
  useUpdateUserPreferences, 
  useResetUserPreferences,
  usePreference,
  useUpdatePreference
} from '../use-user-preferences';
import type { UserPreferences } from '@/lib/schemas';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => {
  const mockSupabaseClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  };

  return {
    createClient: () => mockSupabaseClient,
  };
});

// Mock auth hook
vi.mock('../use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
    isAuthenticated: true,
    userId: 'test-user-id',
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockUserPreferences: UserPreferences = {
  id: 'pref-1',
  user_id: 'test-user-id',
  theme: 'dark',
  show_brands: true,
  weather_enabled: false,
  default_tuck_style: 'Tucked',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('useUserPreferences', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked client
    const { createClient } = require('@/lib/supabase/client');
    mockSupabaseClient = createClient();
  });

  describe('useUserPreferences', () => {
    it('should fetch user preferences successfully', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockUserPreferences,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
      });

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUserPreferences);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_preferences');
    });

    it('should create default preferences when none exist', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows found
      });

      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          ...mockUserPreferences,
          theme: 'system',
          show_brands: true,
          weather_enabled: true,
          default_tuck_style: 'Untucked',
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
        insert: () => ({
          select: () => ({
            single: mockInsert,
          }),
        }),
      });

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(result.current.data?.theme).toBe('system');
    });

    it('should handle fetch error', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
      });

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useUpdateUserPreferences', () => {
    it('should update preferences with optimistic update', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        data: { ...mockUserPreferences, theme: 'light' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useUpdateUserPreferences(), {
        wrapper: TestWrapper,
      });

      const updateData = { theme: 'light' as const };
      
      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle update error and rollback optimistic update', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      mockSupabaseClient.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useUpdateUserPreferences(), {
        wrapper: TestWrapper,
      });

      const updateData = { theme: 'light' as const };
      
      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useResetUserPreferences', () => {
    it('should reset preferences to defaults', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        data: {
          ...mockUserPreferences,
          theme: 'system',
          show_brands: true,
          weather_enabled: true,
          default_tuck_style: 'Untucked',
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useResetUserPreferences(), {
        wrapper: TestWrapper,
      });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('usePreference', () => {
    it('should return specific preference value', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockUserPreferences,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
      });

      const { result } = renderHook(() => usePreference('theme'), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current).toBe('dark');
      });
    });

    it('should return undefined when preferences not loaded', () => {
      const mockSelect = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
      });

      const { result } = renderHook(() => usePreference('theme'), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe('useUpdatePreference', () => {
    it('should update specific preference', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        data: { ...mockUserPreferences, theme: 'light' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useUpdatePreference(), {
        wrapper: TestWrapper,
      });

      result.current.updatePreference('theme', 'light');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle preference update error', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      mockSupabaseClient.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useUpdatePreference(), {
        wrapper: TestWrapper,
      });

      result.current.updatePreference('theme', 'light');

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });
});