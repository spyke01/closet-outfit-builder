/**
 * Comprehensive tests for WeatherWidget error handling and fallback UI
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeatherWidget } from './WeatherWidget';
import { WeatherData, WeatherError } from '../types';

describe('WeatherWidget Error Handling', () => {
  const mockForecast: WeatherData[] = [
    {
      date: '2024-01-01',
      dayOfWeek: 'Monday',
      high: 75,
      low: 60,
      condition: 'Sunny',
      icon: '01d',
      precipitationChance: 0
    },
    {
      date: '2024-01-02',
      dayOfWeek: 'Tuesday',
      high: 72,
      low: 58,
      condition: 'Partly cloudy',
      icon: '02d',
      precipitationChance: 20
    },
    {
      date: '2024-01-03',
      dayOfWeek: 'Wednesday',
      high: 68,
      low: 55,
      condition: 'Rainy',
      icon: '10d',
      precipitationChance: 80
    }
  ];

  describe('Loading State', () => {
    it('should display loading state correctly', () => {
      render(<WeatherWidget forecast={[]} loading={true} />);
      
      expect(screen.getByText('Loading weather...')).toBeInTheDocument();
      // Check for loading spinner by class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display location error with appropriate styling and message', () => {
      const locationError: WeatherError = {
        code: 'LOCATION_ERROR',
        message: 'Location access denied'
      };

      render(<WeatherWidget forecast={[]} error={locationError} />);
      
      expect(screen.getByText('Location needed for weather')).toBeInTheDocument();
      expect(screen.getByText('Location needed for weather')).toHaveClass('text-blue-600');
    });

    it('should display rate limit error with retry button', () => {
      const rateLimitError: WeatherError = {
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded'
      };

      const mockRetry = vi.fn();
      render(<WeatherWidget forecast={[]} error={rateLimitError} onRetry={mockRetry} />);
      
      expect(screen.getByText('Weather service busy')).toBeInTheDocument();
      expect(screen.getByText('Weather service busy')).toHaveClass('text-orange-600');
      
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should display network error with retry button', () => {
      const networkError: WeatherError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed'
      };

      const mockRetry = vi.fn();
      render(<WeatherWidget forecast={[]} error={networkError} onRetry={mockRetry} />);
      
      expect(screen.getByText('Connection issue')).toBeInTheDocument();
      expect(screen.getByText('Connection issue')).toHaveClass('text-orange-600');
      
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });

    it('should display unauthorized error without retry button', () => {
      const unauthorizedError: WeatherError = {
        code: 'UNAUTHORIZED',
        message: 'Access denied'
      };

      render(<WeatherWidget forecast={[]} error={unauthorizedError} />);
      
      expect(screen.getByText('Weather service unavailable')).toBeInTheDocument();
      expect(screen.getByText('Weather service unavailable')).toHaveClass('text-red-600');
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should display generic API error without retry button', () => {
      const apiError: WeatherError = {
        code: 'API_ERROR',
        message: 'API error occurred'
      };

      render(<WeatherWidget forecast={[]} error={apiError} />);
      
      expect(screen.getByText('Weather unavailable')).toBeInTheDocument();
      expect(screen.getByText('Weather unavailable')).toHaveClass('text-red-600');
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
  });

  describe('No Data States', () => {
    it('should display fallback message when no forecast data and showFallback is true', () => {
      const mockRetry = vi.fn();
      render(<WeatherWidget forecast={[]} showFallback={true} onRetry={mockRetry} />);
      
      expect(screen.getByText('Weather data unavailable')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should not render anything when no forecast data and showFallback is false', () => {
      const { container } = render(<WeatherWidget forecast={[]} showFallback={false} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should display fallback message when forecast is empty array', () => {
      render(<WeatherWidget forecast={[]} />);
      
      expect(screen.getByText('Weather data unavailable')).toBeInTheDocument();
    });
  });

  describe('Successful Weather Display', () => {
    it('should display weather forecast correctly', () => {
      render(<WeatherWidget forecast={mockForecast} />);
      
      // Check that all three days are displayed
      expect(screen.getByText('Mon 1/1')).toBeInTheDocument();
      expect(screen.getByText('Tue 1/2')).toBeInTheDocument();
      expect(screen.getByText('Wed 1/3')).toBeInTheDocument();
      
      // Check temperatures
      expect(screen.getByText('75°')).toBeInTheDocument();
      expect(screen.getByText('60°')).toBeInTheDocument();
      expect(screen.getByText('72°')).toBeInTheDocument();
      expect(screen.getByText('58°')).toBeInTheDocument();
      
      // Check precipitation chances
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should limit display to 3 days even with more forecast data', () => {
      const extendedForecast = [
        ...mockForecast,
        {
          date: '2024-01-04',
          dayOfWeek: 'Thursday',
          high: 70,
          low: 55,
          condition: 'Cloudy',
          icon: '03d'
        },
        {
          date: '2024-01-05',
          dayOfWeek: 'Friday',
          high: 73,
          low: 57,
          condition: 'Sunny',
          icon: '01d'
        }
      ];

      render(<WeatherWidget forecast={extendedForecast} />);
      
      // Should only show first 3 days
      expect(screen.getByText('Mon 1/1')).toBeInTheDocument();
      expect(screen.getByText('Tue 1/2')).toBeInTheDocument();
      expect(screen.getByText('Wed 1/3')).toBeInTheDocument();
      expect(screen.queryByText('Thu 1/4')).not.toBeInTheDocument();
      expect(screen.queryByText('Fri 1/5')).not.toBeInTheDocument();
    });

    it('should handle forecast with missing precipitation data', () => {
      const forecastWithoutPrecip: WeatherData[] = [
        {
          date: '2024-01-01',
          dayOfWeek: 'Monday',
          high: 75,
          low: 60,
          condition: 'Sunny',
          icon: '01d'
          // No precipitationChance
        }
      ];

      render(<WeatherWidget forecast={forecastWithoutPrecip} />);
      
      expect(screen.getByText('75°')).toBeInTheDocument();
      expect(screen.getByText('60°')).toBeInTheDocument();
      // Should not display precipitation percentage
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for weather information', () => {
      render(<WeatherWidget forecast={mockForecast} />);
      
      expect(screen.getByRole('group', { name: 'Weather for Monday' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Weather for Tuesday' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Weather for Wednesday' })).toBeInTheDocument();
    });

    it('should have proper ARIA label for retry button', () => {
      const networkError: WeatherError = {
        code: 'NETWORK_ERROR',
        message: 'Network error'
      };

      render(<WeatherWidget forecast={[]} error={networkError} onRetry={() => {}} />);
      
      const retryButton = screen.getByLabelText('Retry loading weather');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <WeatherWidget forecast={mockForecast} className="custom-weather-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-weather-class');
    });

    it('should apply custom className to error states', () => {
      const error: WeatherError = {
        code: 'API_ERROR',
        message: 'Error'
      };

      const { container } = render(
        <WeatherWidget forecast={[]} error={error} className="custom-error-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-error-class');
    });

    it('should apply custom className to loading state', () => {
      const { container } = render(
        <WeatherWidget forecast={[]} loading={true} className="custom-loading-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-loading-class');
    });
  });
});