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
  const mockOnRandomize = vi.fn();
  const mockOnTitleClick = vi.fn();

  const defaultProps = {
    onRandomize: mockOnRandomize,
    onTitleClick: mockOnTitleClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title button', () => {
    render(<TopBar {...defaultProps} />);
    
    const titleButton = screen.getByRole('button', { name: 'What to Wear' });
    expect(titleButton).toBeInTheDocument();
  });

  it('renders the randomize button', () => {
    render(<TopBar {...defaultProps} />);
    
    const randomizeButton = screen.getByRole('button', { name: /randomize/i });
    expect(randomizeButton).toBeInTheDocument();
  });

  it('calls onTitleClick when title is clicked', () => {
    render(<TopBar {...defaultProps} />);
    
    const titleButton = screen.getByRole('button', { name: 'What to Wear' });
    fireEvent.click(titleButton);
    
    expect(mockOnTitleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onRandomize when randomize button is clicked', () => {
    render(<TopBar {...defaultProps} />);
    
    const randomizeButton = screen.getByRole('button', { name: /randomize/i });
    fireEvent.click(randomizeButton);
    
    expect(mockOnRandomize).toHaveBeenCalledTimes(1);
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
    expect(weatherWidget.parentElement).toHaveClass('order-2', 'sm:order-1');
  });

  it('applies text-sm className to weather widget', () => {
    render(<TopBar {...defaultProps} />);
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toHaveClass('text-sm');
  });

  it('maintains proper layout with weather widget', () => {
    render(<TopBar {...defaultProps} />);
    
    // Check that the main container has proper responsive flex layout
    const mainContainer = screen.getByRole('button', { name: 'What to Wear' }).parentElement;
    expect(mainContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'sm:items-center', 'sm:justify-between', 'gap-4');
    
    // Check that the right side container has proper responsive spacing
    const rightContainer = screen.getByRole('button', { name: /randomize/i }).parentElement;
    expect(rightContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'sm:items-center', 'gap-4', 'sm:gap-6');
  });

  it('ensures randomize button maintains minimum touch target size', () => {
    render(<TopBar {...defaultProps} />);
    
    const randomizeButton = screen.getByRole('button', { name: /randomize/i });
    expect(randomizeButton).toHaveClass('min-h-[44px]');
  });
});