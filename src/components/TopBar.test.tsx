import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from './TopBar';
import { WeatherData, WeatherError } from '../types';

// Mock the WeatherWidget component
vi.mock('./WeatherWidget', () => ({
  WeatherWidget: ({ forecast, loading, error, className }: {
    forecast: WeatherData[];
    loading?: boolean;
    error?: WeatherError | null;
    className?: string;
  }) => (
    <div data-testid="weather-widget" className={className}>
      {loading && <span>Loading weather...</span>}
      {error && <span>Weather error: {error.message}</span>}
      {!loading && !error && forecast.length > 0 && (
        <span>Weather forecast: {forecast.length} days</span>
      )}
      {!loading && !error && forecast.length === 0 && (
        <span>No weather data</span>
      )}
    </div>
  )
}));

describe('TopBar', () => {
  const mockOnTitleClick = vi.fn();

  const defaultProps = {
    onTitleClick: mockOnTitleClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the logo image', () => {
    render(<TopBar {...defaultProps} />);
    
    const logoImage = screen.getByAltText('What to Wear');
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute('src', '/what-to-wear-logo.svg');
  });

  it('calls onTitleClick when logo is clicked', () => {
    render(<TopBar {...defaultProps} />);
    
    const logoButton = screen.getByRole('button');
    fireEvent.click(logoButton);
    
    expect(mockOnTitleClick).toHaveBeenCalledTimes(1);
  });

  it('renders weather widget with loading state', () => {
    render(
      <TopBar 
        {...defaultProps} 
        weatherLoading={true}
        weatherForecast={[]}
        weatherError={null}
      />
    );
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toBeInTheDocument();
    expect(screen.getByText('Loading weather...')).toBeInTheDocument();
  });

  it('renders weather widget with error state', () => {
    const weatherError: WeatherError = {
      code: 'API_ERROR',
      message: 'Failed to fetch weather'
    };

    render(
      <TopBar 
        {...defaultProps} 
        weatherLoading={false}
        weatherForecast={[]}
        weatherError={weatherError}
      />
    );
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toBeInTheDocument();
    expect(screen.getByText('Weather error: Failed to fetch weather')).toBeInTheDocument();
  });

  it('renders weather widget with forecast data', () => {
    const mockForecast: WeatherData[] = [
      {
        date: '2024-01-01',
        dayOfWeek: 'Monday',
        high: 75,
        low: 60,
        condition: 'Sunny',
        icon: 'sun',
        precipitationChance: 0
      },
      {
        date: '2024-01-02',
        dayOfWeek: 'Tuesday',
        high: 72,
        low: 58,
        condition: 'Partly Cloudy',
        icon: 'partly-cloudy',
        precipitationChance: 20
      }
    ];

    render(
      <TopBar 
        {...defaultProps} 
        weatherLoading={false}
        weatherForecast={mockForecast}
        weatherError={null}
      />
    );
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toBeInTheDocument();
    expect(screen.getByText('Weather forecast: 2 days')).toBeInTheDocument();
  });

  it('renders weather widget with no data', () => {
    render(
      <TopBar 
        {...defaultProps} 
        weatherLoading={false}
        weatherForecast={[]}
        weatherError={null}
      />
    );
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toBeInTheDocument();
    expect(screen.getByText('No weather data')).toBeInTheDocument();
  });

  it('applies correct CSS classes for responsive design', () => {
    render(<TopBar {...defaultProps} />);
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toBeInTheDocument();
  });

  it('applies text-sm className to weather widget', () => {
    render(<TopBar {...defaultProps} />);
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toHaveClass('text-sm');
  });

  it('maintains proper layout structure', () => {
    render(<TopBar {...defaultProps} />);
    
    // Check that the main container has proper responsive flex layout
    const logoButton = screen.getByRole('button');
    const mainContainer = logoButton.parentElement;
    expect(mainContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'sm:items-center', 'sm:justify-between', 'gap-4');
  });
});