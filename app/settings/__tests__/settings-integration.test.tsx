import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SettingsPageClient } from '../settings-page-client';
import { ThemeProvider } from 'next-themes';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock('@/lib/supabase/client', () => {
  const mockPreferences = {
    id: 'test-id',
    user_id: 'test-user',
    theme: 'system',
    show_brands: true,
    weather_enabled: true,
    default_tuck_style: 'Untucked',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  return {
    createClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockPreferences, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: mockPreferences, error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockPreferences, error: null }),
          }),
        }),
      }),
      auth: {
        getUser: () => Promise.resolve({
          data: {
            user: {
              id: 'test-user',
              email: 'test@example.com',
              user_metadata: { first_name: 'Taylor', last_name: 'Smith', avatar_url: '' },
              app_metadata: { providers: ['email'] },
            },
          },
          error: null,
        }),
        getUserIdentities: () => Promise.resolve({
          data: {
            identities: [{ provider: 'email', id: 'email-identity' }],
          },
          error: null,
        }),
        updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
        linkIdentity: () => Promise.resolve({ data: null, error: null }),
        unlinkIdentity: () => Promise.resolve({ data: {}, error: null }),
      },
    }),
  };
});

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    isAuthenticated: true,
    userId: 'test-user',
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));

const TestWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      {children}
    </ThemeProvider>
  );
};

describe('Settings Page Integration', () => {
  it('renders unified settings/profile sections', async () => {
    render(
      <TestWrapper>
        <SettingsPageClient />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Display Preferences')).toBeInTheDocument();
    expect(screen.queryByText('Style Preferences')).not.toBeInTheDocument();
  });

  it('does not render duplicate legacy descriptions', async () => {
    render(
      <TestWrapper>
        <SettingsPageClient />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Show Brand Names')).toBeInTheDocument();
    });

    expect(screen.queryByText('Show or hide brand names on wardrobe items and outfits')).not.toBeInTheDocument();
    expect(screen.queryByText('Enable weather-based outfit recommendations and forecasts')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose your preferred default tuck style for new outfits')).not.toBeInTheDocument();
    expect(screen.queryByText('Brand visibility')).not.toBeInTheDocument();
    expect(screen.queryByText('Weather Widget')).not.toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <TestWrapper>
        <SettingsPageClient />
      </TestWrapper>
    );

    expect(screen.getByText('Loading your profile and preferences...')).toBeInTheDocument();
  });
});
