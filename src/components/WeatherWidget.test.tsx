/**
 * Tests for WeatherWidget component
 * Covers loading states, error states, weather data display, and accessibility
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeatherWidget } from './WeatherWidget';
import { WeatherData, WeatherError } from '../types';

// Mock weather data for testing
const mockWeatherData: WeatherData[] = [
  {
    date: '2024-01-15',
    dayOfWeek: 'Monday',
    high: 75,
    low: 55,
    condition: 'Sunny',
    icon: 'sunny',
    precipitationChance: 0
  },
  {
    date: '2024-01-16',
    dayOfWeek: 'Tuesday',
    high: 68,
    low: 48,
    condition: 'Partly Cloudy',
    icon: 'partly-cloudy',
    precipitationChance: 20
  },
  {
    date: '2024-01-17',
    dayOfWeek: 'Wednesday',
    high: 62,
    low: 45,
    condition: 'Rain',
    icon: 'rain',
    precipitationChance: 85
  }
];

const mockWeatherError: WeatherError = {
  code: 'API_ERROR',
  message: 'Failed to fetch weather data',
  details: 'HTTP 500'
};

describe('WeatherWidget', () => {
  describe('Loading State', () => {
    it('should display loading spinner and text when loading is true', () => {
      render(<WeatherWidget forecast={[]} loading={true} />);
      
      expect(screen.getByText('Loading weather...')).toBeInTheDocument();
      // Check for the loading spinner SVG by class
      const loadingSpinner = document.querySelector('.lucide-loader2');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('should not display forecast data when loading', () => {
      render(<WeatherWidget forecast={mockWeatherData} loading={true} />);
      
      expect(screen.getByText('Loading weather...')).toBeInTheDocument();
      expect(screen.queryByText('Mon 1/15')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error is provided', () => {
      render(<WeatherWidget forecast={[]} error={mockWeatherError} />);
      
      expect(screen.getByText('Weather unavailable')).toBeInTheDocument();
      // Check for the alert icon SVG by class
      const alertIcon = document.querySelector('.lucide-alert-circle');
      expect(alertIcon).toBeInTheDocument();
    });

    it('should not display forecast data when error exists', () => {
      render(<WeatherWidget forecast={mockWeatherData} error={mockWeatherError} />);
      
      expect(screen.getByText('Weather unavailable')).toBeInTheDocument();
      expect(screen.queryByText('Mon 1/15')).not.toBeInTheDocument();
    });

    it('should handle null error gracefully', () => {
      render(<WeatherWidget forecast={mockWeatherData} error={null} />);
      
      expect(screen.queryByText('Weather unavailable')).not.toBeInTheDocument();
      expect(screen.getByText('Mon 1/15')).toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should display no data message when forecast is empty', () => {
      render(<WeatherWidget forecast={[]} />);
      
      expect(screen.getByText('No weather data')).toBeInTheDocument();
    });

    it('should display no data message when forecast is undefined', () => {
      render(<WeatherWidget forecast={undefined as any} />);
      
      expect(screen.getByText('No weather data')).toBeInTheDocument();
    });
  });

  describe('Weather Data Display', () => {
    it('should display 3-day forecast correctly', () => {
      render(<WeatherWidget forecast={mockWeatherData} />);
      
      // Check dates are formatted correctly
      expect(screen.getByText('Mon 1/15')).toBeInTheDocument();
      expect(screen.getByText('Tue 1/16')).toBeInTheDocument();
      expect(screen.getByText('Wed 1/17')).toBeInTheDocument();
      
      // Check temperatures are displayed
      expect(screen.getByText('75°')).toBeInTheDocument(); // High temp
      expect(screen.getByText('55°')).toBeInTheDocument(); // Low temp
      expect(screen.getByText('68°')).toBeInTheDocument();
      expect(screen.getByText('48°')).toBeInTheDocument();
      expect(screen.getByText('62°')).toBeInTheDocument();
      expect(screen.getByText('45°')).toBeInTheDocument();
    });

    it('should display precipitation chance when present', () => {
      render(<WeatherWidget forecast={mockWeatherData} />);
      
      // Should show precipitation for Tuesday (20%) and Wednesday (85%)
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      
      // Should not show 0% precipitation for Monday
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });

    it('should not display precipitation chance when 0 or undefined', () => {
      const dataWithoutPrecip: WeatherData[] = [
        {
          date: '2024-01-15',
          dayOfWeek: 'Monday',
          high: 75,
          low: 55,
          condition: 'Sunny',
          icon: 'sunny'
          // No precipitationChance property
        }
      ];
      
      render(<WeatherWidget forecast={dataWithoutPrecip} />);
      
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('should limit display to first 3 days when more data is provided', () => {
      const extendedForecast: WeatherData[] = [
        ...mockWeatherData,
        {
          date: '2024-01-18',
          dayOfWeek: 'Thursday',
          high: 70,
          low: 50,
          condition: 'Cloudy',
          icon: 'cloudy'
        },
        {
          date: '2024-01-19',
          dayOfWeek: 'Friday',
          high: 72,
          low: 52,
          condition: 'Sunny',
          icon: 'sunny'
        }
      ];
      
      render(<WeatherWidget forecast={extendedForecast} />);
      
      // Should only show first 3 days
      expect(screen.getByText('Mon 1/15')).toBeInTheDocument();
      expect(screen.getByText('Tue 1/16')).toBeInTheDocument();
      expect(screen.getByText('Wed 1/17')).toBeInTheDocument();
      
      // Should not show 4th and 5th days
      expect(screen.queryByText('Thu 1/18')).not.toBeInTheDocument();
      expect(screen.queryByText('Fri 1/19')).not.toBeInTheDocument();
    });

    it('should round temperatures to nearest integer', () => {
      const dataWithDecimals: WeatherData[] = [
        {
          date: '2024-01-15',
          dayOfWeek: 'Monday',
          high: 75.7,
          low: 55.3,
          condition: 'Sunny',
          icon: 'sunny'
        }
      ];
      
      render(<WeatherWidget forecast={dataWithDecimals} />);
      
      expect(screen.getByText('76°')).toBeInTheDocument(); // 75.7 rounded up
      expect(screen.getByText('55°')).toBeInTheDocument(); // 55.3 rounded down
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for weather groups', () => {
      render(<WeatherWidget forecast={mockWeatherData} />);
      
      expect(screen.getByRole('group', { name: 'Weather for Monday' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Weather for Tuesday' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Weather for Wednesday' })).toBeInTheDocument();
    });

    it('should have proper ARIA labels for weather condition icons', () => {
      render(<WeatherWidget forecast={mockWeatherData} />);
      
      expect(screen.getByLabelText('Sunny')).toBeInTheDocument();
      expect(screen.getByLabelText('Partly Cloudy')).toBeInTheDocument();
      expect(screen.getByLabelText('Rain')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <WeatherWidget forecast={mockWeatherData} className="custom-weather-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-weather-class');
    });

    it('should apply custom className to loading state', () => {
      const { container } = render(
        <WeatherWidget forecast={[]} loading={true} className="custom-loading-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-loading-class');
    });

    it('should apply custom className to error state', () => {
      const { container } = render(
        <WeatherWidget forecast={[]} error={mockWeatherError} className="custom-error-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-error-class');
    });
  });

  describe('Weather Icon Selection', () => {
    it('should display appropriate icons for different weather conditions', () => {
      const weatherConditions: WeatherData[] = [
        {
          date: '2024-01-15',
          dayOfWeek: 'Monday',
          high: 75,
          low: 55,
          condition: 'Sunny',
          icon: 'sunny'
        },
        {
          date: '2024-01-16',
          dayOfWeek: 'Tuesday',
          high: 65,
          low: 45,
          condition: 'Cloudy',
          icon: 'cloudy'
        },
        {
          date: '2024-01-17',
          dayOfWeek: 'Wednesday',
          high: 60,
          low: 40,
          condition: 'Thunderstorm',
          icon: 'thunderstorm',
          precipitationChance: 90
        }
      ];
      
      render(<WeatherWidget forecast={weatherConditions} />);
      
      // Icons should be present (testing via aria-label)
      expect(screen.getByLabelText('Sunny')).toBeInTheDocument();
      expect(screen.getByLabelText('Cloudy')).toBeInTheDocument();
      expect(screen.getByLabelText('Thunderstorm')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly for different months', () => {
      const differentMonths: WeatherData[] = [
        {
          date: '2024-12-31',
          dayOfWeek: 'Tuesday',
          high: 45,
          low: 30,
          condition: 'Snow',
          icon: 'snow'
        },
        {
          date: '2024-07-04',
          dayOfWeek: 'Thursday',
          high: 85,
          low: 65,
          condition: 'Sunny',
          icon: 'sunny'
        }
      ];
      
      render(<WeatherWidget forecast={differentMonths} />);
      
      expect(screen.getByText('Tue 12/31')).toBeInTheDocument();
      expect(screen.getByText('Thu 7/4')).toBeInTheDocument();
    });
  });
});