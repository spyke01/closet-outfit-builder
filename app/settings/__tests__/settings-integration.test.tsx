import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SettingsPageClient } from '../settings-page-client';
import { ThemeProvider } from 'next-themes';

// Mock window.matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'test-id',
              user_id: 'test-user',
              theme: 'system',
              show_brands: true,
              weather_enabled: true,
              default_tuck_style: 'Untucked',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'test-id',
                user_id: 'test-user',
                theme: 'dark',
                show_brands: false,
                weather_enabled: false,
                default_tuck_style: 'Tucked',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    isAuthenticated: true,
    userId: 'test-user',
  }),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      {children}
    </ThemeProvider>
  );
};

describe('Settings Page Integration', () => {
  it('should render settings page with all sections', async () => {
    render(
      <TestWrapper>
        <SettingsPageClient />
      </TestWrapper>
    );

    // Wait for the component to load preferences
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Check sections
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Display Preferences')).toBeInTheDocument();
    expect(screen.getByText('Weather Integration')).toBeInTheDocument();
    expect(screen.getByText('Style Preferences')).toBeInTheDocument();

    // Check theme options
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();

    // Check preference toggles
    expect(screen.getByText('Brand Display')).toBeInTheDocument();
    expect(screen.getByText('Weather Widget')).toBeInTheDocument();
    expect(screen.getByText('Default Tuck Style')).toBeInTheDocument();
  });

  it('should display preference values correctly', async () => {
    render(
      <TestWrapper>
        <SettingsPageClient />
      </TestWrapper>
    );

    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByText('Tucked')).toBeInTheDocument();
      expect(screen.getByText('Untucked')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    render(
      <TestWrapper>
        <SettingsPageClient />
      </TestWrapper>
    );

    // Should show loading message initially
    expect(screen.getByText('Loading your preferences...')).toBeInTheDocument();
  });
});