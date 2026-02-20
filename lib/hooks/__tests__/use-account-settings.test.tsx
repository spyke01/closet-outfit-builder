import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccountSettings } from '../use-account-settings';

const mockUpdateUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {
              first_name: 'Alex',
              last_name: 'Lane',
              avatar_url: 'https://cdn.example.com/original-avatar.webp',
              locale: 'en-US',
            },
            app_metadata: { providers: ['email'] },
          },
        },
        error: null,
      }),
      getUserIdentities: () => Promise.resolve({
        data: { identities: [{ provider: 'email', id: 'id-email' }] },
        error: null,
      }),
      updateUser: mockUpdateUser,
      linkIdentity: vi.fn(),
      unlinkIdentity: vi.fn(),
    },
  }),
}));

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ userId: 'test-user-id' }),
}));

describe('useAccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {
            first_name: 'Alex',
            last_name: 'Lane',
            avatar_url: 'https://cdn.example.com/original-avatar.webp',
            locale: 'en-US',
          },
          app_metadata: { providers: ['email'] },
        },
      },
      error: null,
    });
  });

  const createWrapper = () => {
    const client = new QueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'UseAccountSettingsTestWrapper';
    return Wrapper;
  };

  it('persists avatar_url in metadata-only profile updates', async () => {
    const { result } = renderHook(() => useAccountSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProfile({
        firstName: 'Alex',
        lastName: 'Lane',
        avatarUrl: 'https://cdn.example.com/avatar.webp',
      });
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: {
        first_name: 'Alex',
        last_name: 'Lane',
        avatar_url: 'https://cdn.example.com/avatar.webp',
        locale: 'en-US',
      },
    });
  });

  it('does not overwrite avatar metadata when no avatar update is provided', async () => {
    const { result } = renderHook(() => useAccountSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProfile({
        firstName: 'Alex',
        lastName: 'Lane',
      });
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: {
        first_name: 'Alex',
        last_name: 'Lane',
        locale: 'en-US',
        avatar_url: 'https://cdn.example.com/original-avatar.webp',
      },
    });
  });
});
