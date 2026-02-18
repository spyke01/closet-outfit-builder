import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeatherWidget } from '../weather-widget';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/hooks/use-conditional-weather', () => ({
  useConditionalWeather: vi.fn(),
  preloadWeatherModule: vi.fn(),
}));

import { useAuth } from '@/lib/hooks/use-auth';
import { useConditionalWeather } from '@/lib/hooks/use-conditional-weather';

const mockUseAuth = vi.mocked(useAuth);
const mockUseConditionalWeather = vi.mocked(useConditionalWeather);

const mockUser: User = {
  id: '123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

const TestWrapper = ({ children }: { children: ReactNode }) => {
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

describe('WeatherWidget Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ 
      user: null, 
      loading: false, 
      isAuthenticated: false, 
      userId: null 
    });
    mockUseConditionalWeather.mockReturnValue({
      current: null,
      forecast: [],
      loading: false,
      error: null,
      retry: vi.fn(),
      usingFallback: false,
      weatherEnabled: false,
    });

    const { container } = render(
      <TestWrapper>
        <WeatherWidget />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when weather is disabled in preferences', () => {
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      loading: false,
      isAuthenticated: true,
      userId: '123'
    });
    mockUseConditionalWeather.mockReturnValue({
      current: null,
      forecast: [],
      loading: false,
      error: null,
      retry: vi.fn(),
      usingFallback: false,
      weatherEnabled: false,
    });

    const { container } = render(
      <TestWrapper>
        <WeatherWidget />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show loading state for authenticated users', () => {
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      loading: false,
      isAuthenticated: true,
      userId: '123'
    });
    mockUseConditionalWeather.mockReturnValue({
      current: null,
      forecast: [],
      loading: true,
      error: null,
      retry: vi.fn(),
      usingFallback: false,
      weatherEnabled: true,
    });

    render(
      <TestWrapper>
        <WeatherWidget />
      </TestWrapper>
    );

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('should show weather data for authenticated users', () => {
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      loading: false,
      isAuthenticated: true,
      userId: '123'
    });
    mockUseConditionalWeather.mockReturnValue({
      current: {
        temperature: 75,
        condition: 'clear sky',
        icon: '01d',
      },
      forecast: [],
      loading: false,
      error: null,
      retry: vi.fn(),
      usingFallback: false,
      weatherEnabled: true,
    });

    render(
      <TestWrapper>
        <WeatherWidget />
      </TestWrapper>
    );

    expect(screen.getByText('75°')).toBeInTheDocument();
    expect(screen.queryByText('clear sky')).not.toBeInTheDocument();
  });

  it('should show condition text when compact is disabled', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true,
      userId: '123'
    });
    mockUseConditionalWeather.mockReturnValue({
      current: {
        temperature: 75,
        condition: 'clear sky',
        icon: '01d',
      },
      forecast: [],
      loading: false,
      error: null,
      retry: vi.fn(),
      usingFallback: false,
      weatherEnabled: true,
    });

    render(
      <TestWrapper>
        <WeatherWidget compact={false} />
      </TestWrapper>
    );

    expect(screen.getByText('clear sky')).toBeInTheDocument();
  });

  it('should show error state with retry button', () => {
    const mockRetry = vi.fn();
    
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      loading: false,
      isAuthenticated: true,
      userId: '123'
    });
    mockUseConditionalWeather.mockReturnValue({
      current: null,
      forecast: [],
      loading: false,
      error: {
        error: 'Weather service unavailable',
        details: 'Network error',
      },
      retry: mockRetry,
      usingFallback: false,
      weatherEnabled: true,
    });

    render(
      <TestWrapper>
        <WeatherWidget />
      </TestWrapper>
    );

    expect(screen.getByText('Weather error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      loading: false,
      isAuthenticated: true,
      userId: '123'
    });
    mockUseConditionalWeather.mockReturnValue({
      current: {
        temperature: 75,
        condition: 'clear sky',
        icon: '01d',
      },
      forecast: [],
      loading: false,
      error: null,
      retry: vi.fn(),
      usingFallback: false,
      weatherEnabled: true,
    });

    const { container } = render(
      <TestWrapper>
        <WeatherWidget className="custom-class" />
      </TestWrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
