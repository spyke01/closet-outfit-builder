import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPageClient } from '../settings-page-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Mock the hooks
vi.mock('@/lib/hooks/use-user-preferences', () => ({
  useUserPreferences: () => ({
    data: {
      theme: 'system',
      show_brands: true,
      weather_enabled: true,
      default_tuck_style: 'Untucked',
    },
    isLoading: false,
    isSuccess: true,
  }),
  useUpdateUserPreferences: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
  useResetUserPreferences: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    isAuthenticated: true,
    userId: 'test-user',
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
      <ThemeProvider attribute="class" defaultTheme="system">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Settings Page Integration', () => {
  it('should render settings page with all sections', () => {
    render(
      <TestWrapper>
        <SettingsPageClient />
      </TestWrapper>
    );

    // Check main heading
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Check sections
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
    
    // Check theme options
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    
    // Check preference toggles
    expect(screen.getByText('Brand Display')).toBeInTheDocument();
    expect(screen.getByText('Weather Integration')).toBeInTheDocument();
    expect(screen.getByText('Default Tuck Style')).toBeInTheDocument();
    
    // Check reset section
    expect(screen.getByText('Reset All Preferences')).toBeInTheDocument();
  });

  it('should display preference values correctly', () => {
    render(
      <TestWrapper>
        <SettingsPageClient />
      </TestWrapper>
    );

    // Check that tuck style buttons are rendered
    expect(screen.getByText('Tucked')).toBeInTheDocument();
    expect(screen.getByText('Untucked')).toBeInTheDocument();
  });
});