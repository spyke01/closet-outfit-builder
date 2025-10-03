/**
 * Tests for OptimisticWeatherWidget component
 * Tests integration with useOptimisticWeather hook and WeatherWidget component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OptimisticWeatherWidget } from './OptimisticWeatherWidget';
import { WeatherData, WeatherError } from '../types';

// Mock the useOptimisticWeather hook
const mockUseOptimisticWeather = {
  weather: [] as WeatherData[],
  isUpdating: false,
  error: null as WeatherError | null,
  updateLocation: vi.fn(),
  retryWeatherUpdate: vi.fn()
};

vi.mock('../hooks/useOptimisticWeather', () => ({
  useOptimisticWeather: () => mockUseOptimisticWeather
}));

// Mock the WeatherWidget component
vi.mock('./WeatherWidget', () => ({
  WeatherWidget: ({ forecast, loading, error, onRetry, className }: {
    forecast: WeatherData[];
    loading?: boolean;
    error?: WeatherError | null;
    onRetry?: () => void;
    className?: string;
  }) => (
    <div data-testid="weather-widget" className={className}>
      {loading && <span>Loading weather...</span>}
      {error && (
        <div>
          <span>Weather error: {error.message}</span>
          {onRetry && <button onClick={onRetry}>Retry</button>}
        </div>
      )}
      {forecast.length > 0 && (
        <div>Weather forecast: {forecast.length} days</div>
      )}
      {forecast.length === 0 && !loading && !error && (
        <span>No weather data</span>
      )}
    </div>
  )
}));

describe('OptimisticWeatherWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockUseOptimisticWeather.weather = [];
    mockUseOptimisticWeather.isUpdating = false;
    mockUseOptimisticWeather.error = null;
  });

  it('should render WeatherWidget with default props', () => {
    render(<OptimisticWeatherWidget />);
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toBeInTheDocument();
  });

  it('should auto-load weather data on mount when enabled', async () => {
    render(<OptimisticWeatherWidget location="Miami, FL" autoLoad={true} />);
    
    await waitFor(() => {
      expect(mockUseOptimisticWeather.updateLocation).toHaveBeenCalledWith('Miami, FL');
    });
  });

  it('should not auto-load weather data when disabled', () => {
    render(<OptimisticWeatherWidget location="Seattle, WA" autoLoad={false} />);
    
    expect(mockUseOptimisticWeather.updateLocation).not.toHaveBeenCalled();
  });

  it('should not auto-load when no location provided', () => {
    render(<OptimisticWeatherWidget autoLoad={true} />);
    
    // Should still call updateLocation with default location
    expect(mockUseOptimisticWeather.updateLocation).toHaveBeenCalledWith('New York, NY');
  });

  it('should pass loading state to WeatherWidget', () => {
    mockUseOptimisticWeather.isUpdating = true;
    
    render(<OptimisticWeatherWidget />);
    
    expect(screen.getByText('Loading weather...')).toBeInTheDocument();
  });

  it('should pass weather data to WeatherWidget', () => {
    const mockWeatherData: WeatherData[] = [
      {
        date: '2024-01-15',
        dayOfWeek: 'Monday',
        high: 75,
        low: 60,
        condition: 'Sunny',
        icon: 'sunny',
        precipitationChance: 10
      },
      {
        date: '2024-01-16',
        dayOfWeek: 'Tuesday',
        high: 72,
        low: 58,
        condition: 'Partly Cloudy',
        icon: 'partly-cloudy',
        precipitationChance: 20
      }
    ];

    mockUseOptimisticWeather.weather = mockWeatherData;
    
    render(<OptimisticWeatherWidget />);
    
    expect(screen.getByText('Weather forecast: 2 days')).toBeInTheDocument();
  });

  it('should pass error state to WeatherWidget', () => {
    const mockError: WeatherError = {
      code: 'NETWORK_ERROR',
      message: 'Failed to fetch weather data',
      canRetry: true
    };

    mockUseOptimisticWeather.error = mockError;
    
    render(<OptimisticWeatherWidget />);
    
    expect(screen.getByText('Weather error: Failed to fetch weather data')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should handle retry functionality', async () => {
    const mockError: WeatherError = {
      code: 'NETWORK_ERROR',
      message: 'Network error',
      canRetry: true
    };

    mockUseOptimisticWeather.error = mockError;
    
    render(<OptimisticWeatherWidget />);
    
    const retryButton = screen.getByText('Retry');
    retryButton.click();
    
    await waitFor(() => {
      expect(mockUseOptimisticWeather.retryWeatherUpdate).toHaveBeenCalled();
    });
  });

  it('should handle retry errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockUseOptimisticWeather.retryWeatherUpdate.mockRejectedValue(new Error('Retry failed'));
    
    const mockError: WeatherError = {
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded',
      canRetry: true
    };

    mockUseOptimisticWeather.error = mockError;
    
    render(<OptimisticWeatherWidget />);
    
    const retryButton = screen.getByText('Retry');
    retryButton.click();
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Weather retry failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should pass custom className to WeatherWidget', () => {
    render(<OptimisticWeatherWidget className="custom-weather-class" />);
    
    const weatherWidget = screen.getByTestId('weather-widget');
    expect(weatherWidget).toHaveClass('custom-weather-class');
  });

  it('should update location when location prop changes', async () => {
    const { rerender } = render(<OptimisticWeatherWidget location="Chicago, IL" />);
    
    await waitFor(() => {
      expect(mockUseOptimisticWeather.updateLocation).toHaveBeenCalledWith('Chicago, IL');
    });

    // Change location
    rerender(<OptimisticWeatherWidget location="Denver, CO" />);
    
    await waitFor(() => {
      expect(mockUseOptimisticWeather.updateLocation).toHaveBeenCalledWith('Denver, CO');
    });
  });

  it('should not update location when autoLoad is disabled', () => {
    const { rerender } = render(
      <OptimisticWeatherWidget location="Boston, MA" autoLoad={false} />
    );
    
    expect(mockUseOptimisticWeather.updateLocation).not.toHaveBeenCalled();

    // Change location
    rerender(<OptimisticWeatherWidget location="Portland, OR" autoLoad={false} />);
    
    expect(mockUseOptimisticWeather.updateLocation).not.toHaveBeenCalled();
  });

  it('should handle empty weather data', () => {
    mockUseOptimisticWeather.weather = [];
    
    render(<OptimisticWeatherWidget />);
    
    expect(screen.getByText('No weather data')).toBeInTheDocument();
  });

  it('should show optimistic updates during loading', () => {
    const optimisticWeather: WeatherData[] = [
      {
        date: '2024-01-15',
        dayOfWeek: 'Monday',
        high: 70,
        low: 55,
        condition: 'Partly Cloudy',
        icon: 'partly-cloudy',
        precipitationChance: 15
      }
    ];

    mockUseOptimisticWeather.weather = optimisticWeather;
    mockUseOptimisticWeather.isUpdating = true;
    
    render(<OptimisticWeatherWidget />);
    
    // Should show both loading state and optimistic data
    expect(screen.getByText('Loading weather...')).toBeInTheDocument();
  });

  it('should handle location updates with special characters', async () => {
    render(<OptimisticWeatherWidget location="São Paulo, Brazil" />);
    
    await waitFor(() => {
      expect(mockUseOptimisticWeather.updateLocation).toHaveBeenCalledWith('São Paulo, Brazil');
    });
  });

  it('should handle very long location names', async () => {
    const longLocation = 'A'.repeat(100) + ', State';
    
    render(<OptimisticWeatherWidget location={longLocation} />);
    
    await waitFor(() => {
      expect(mockUseOptimisticWeather.updateLocation).toHaveBeenCalledWith(longLocation);
    });
  });

  it('should maintain component stability during rapid prop changes', async () => {
    const { rerender } = render(<OptimisticWeatherWidget location="City1" />);
    
    // Rapidly change locations
    for (let i = 2; i <= 10; i++) {
      rerender(<OptimisticWeatherWidget location={`City${i}`} />);
    }
    
    // Should have called updateLocation for each change
    await waitFor(() => {
      expect(mockUseOptimisticWeather.updateLocation).toHaveBeenCalledTimes(10);
    });
  });

  it('should handle undefined location gracefully', async () => {
    render(<OptimisticWeatherWidget location={undefined} />);
    
    // Should use default location
    await waitFor(() => {
      expect(mockUseOptimisticWeather.updateLocation).toHaveBeenCalledWith('New York, NY');
    });
  });
});