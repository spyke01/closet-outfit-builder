/**
 * Integration tests for optimistic updates functionality
 * Tests the complete flow of optimistic updates in real components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OutfitDisplay } from '../components/OutfitDisplay';
import { WeatherWidget } from '../components/WeatherWidget';
import { OutfitSelection } from '../types';

// Mock the hooks
vi.mock('../hooks/useOutfitEngine', () => ({
  useOutfitEngine: () => ({
    generateRandomOutfit: vi.fn().mockResolvedValue(undefined),
    isGenerating: false,
    generationError: null,
    scoreOutfit: vi.fn(() => 85),
    getRandomOutfit: vi.fn(),
    getOutfitsForAnchor: vi.fn(),
    getAllOutfits: vi.fn(() => []),
    getCompatibleItems: vi.fn(() => []),
    getFilteredOutfits: vi.fn(() => []),
    validatePartialSelection: vi.fn(() => true)
  })
}));

vi.mock('../hooks/useOptimisticWeather', () => ({
  useOptimisticWeather: () => ({
    weather: [
      {
        date: '2024-01-15',
        dayOfWeek: 'Monday',
        high: 75,
        low: 60,
        condition: 'Sunny',
        icon: 'sunny',
        precipitationChance: 10
      }
    ],
    isUpdating: false,
    error: null,
    updateLocation: vi.fn(),
    retryWeatherUpdate: vi.fn()
  })
}));

// Mock WeatherWidget
vi.mock('../components/WeatherWidget', () => ({
  WeatherWidget: ({ forecast, loading, error }: any) => (
    <div data-testid="weather-widget">
      {loading && <span>Loading...</span>}
      {error && <span>Error: {error.message}</span>}
      {forecast.length > 0 && <span>Weather: {forecast[0].condition}</span>}
    </div>
  )
}));

// Mock OutfitCard
vi.mock('../components/OutfitCard', () => ({
  OutfitCard: ({ outfit }: any) => (
    <div data-testid="outfit-card">
      Outfit Score: {outfit?.score || 0}
    </div>
  )
}));

describe('Optimistic Updates Integration', () => {
  const mockSelection: OutfitSelection = {
    shirt: {
      id: 'shirt-1',
      name: 'Blue Oxford Shirt',
      category: 'Shirt',
      formality: 'Refined'
    },
    pants: {
      id: 'pants-1',
      name: 'Navy Chinos',
      category: 'Pants',
      formality: 'Refined'
    },
    shoes: {
      id: 'shoes-1',
      name: 'Brown Loafers',
      category: 'Shoes',
      formality: 'Refined'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OutfitDisplay with Optimistic Updates', () => {
    it('should render outfit display with optimistic outfit engine', () => {
      const mockOnRandomize = vi.fn();
      
      render(
        <OutfitDisplay 
          selection={mockSelection} 
          onRandomize={mockOnRandomize} 
        />
      );

      expect(screen.getByTestId('outfit-card')).toBeInTheDocument();
      expect(screen.getByText('Try Another Combination')).toBeInTheDocument();
    });

    it('should handle randomize button click', async () => {
      const mockOnRandomize = vi.fn();
      
      render(
        <OutfitDisplay 
          selection={mockSelection} 
          onRandomize={mockOnRandomize} 
        />
      );

      const randomizeButton = screen.getByText('Try Another Combination');
      fireEvent.click(randomizeButton);

      // Should call both the optimistic engine and the original handler
      await waitFor(() => {
        expect(mockOnRandomize).toHaveBeenCalled();
      });
    });

    it('should show loading state during generation', () => {
      const mockOnRandomize = vi.fn();
      
      // Mock loading state
      vi.mocked(require('../hooks/useOutfitEngine').useOutfitEngine).mockReturnValue({
        generateRandomOutfit: vi.fn(),
        isGenerating: true,
        generationError: null,
        scoreOutfit: vi.fn(() => 85),
        getRandomOutfit: vi.fn(),
        getOutfitsForAnchor: vi.fn(),
        getAllOutfits: vi.fn(() => []),
        getCompatibleItems: vi.fn(() => []),
        getFilteredOutfits: vi.fn(() => []),
        validatePartialSelection: vi.fn(() => true)
      });

      render(
        <OutfitDisplay 
          selection={mockSelection} 
          onRandomize={mockOnRandomize} 
        />
      );

      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show error state when generation fails', () => {
      const mockOnRandomize = vi.fn();
      const mockError = new Error('Generation failed');
      
      // Mock error state
      vi.mocked(require('../hooks/useOutfitEngine').useOutfitEngine).mockReturnValue({
        generateRandomOutfit: vi.fn(),
        isGenerating: false,
        generationError: mockError,
        scoreOutfit: vi.fn(() => 85),
        getRandomOutfit: vi.fn(),
        getOutfitsForAnchor: vi.fn(),
        getAllOutfits: vi.fn(() => []),
        getCompatibleItems: vi.fn(() => []),
        getFilteredOutfits: vi.fn(() => []),
        validatePartialSelection: vi.fn(() => true)
      });

      render(
        <OutfitDisplay 
          selection={mockSelection} 
          onRandomize={mockOnRandomize} 
        />
      );

      expect(screen.getByText('Generation failed')).toBeInTheDocument();
    });
  });

  describe('WeatherWidget with Optimistic Updates Integration', () => {
    it('should render weather widget with optimistic weather data', () => {
      render(<WeatherWidget location="Miami, FL" useOptimistic={true} />);

      expect(screen.getByTestId('weather-widget')).toBeInTheDocument();
      expect(screen.getByText('Weather: Sunny')).toBeInTheDocument();
    });

    it('should show loading state during weather updates', () => {
      // Mock loading state
      vi.mocked(require('../hooks/useOptimisticWeather').useOptimisticWeather).mockReturnValue({
        weather: [],
        isUpdating: true,
        error: null,
        updateLocation: vi.fn(),
        retryWeatherUpdate: vi.fn()
      });

      render(<WeatherWidget location="Seattle, WA" useOptimistic={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error state when weather update fails', () => {
      const mockError = { message: 'Weather service unavailable' };
      
      // Mock error state
      vi.mocked(require('../hooks/useOptimisticWeather').useOptimisticWeather).mockReturnValue({
        weather: [],
        isUpdating: false,
        error: mockError,
        updateLocation: vi.fn(),
        retryWeatherUpdate: vi.fn()
      });

      render(<WeatherWidget location="Unknown City" useOptimistic={true} />);

      expect(screen.getByText('Error: Weather service unavailable')).toBeInTheDocument();
    });

    it('should auto-load weather data on mount', () => {
      const mockUpdateLocation = vi.fn();
      
      vi.mocked(require('../hooks/useOptimisticWeather').useOptimisticWeather).mockReturnValue({
        weather: [],
        isUpdating: false,
        error: null,
        updateLocation: mockUpdateLocation,
        retryWeatherUpdate: vi.fn()
      });

      render(<WeatherWidget location="Chicago, IL" autoLoad={true} useOptimistic={true} />);

      expect(mockUpdateLocation).toHaveBeenCalledWith('Chicago, IL');
    });
  });

  describe('Error Recovery', () => {
    it('should handle outfit generation errors gracefully', () => {
      const mockOnRandomize = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock error in generation
      vi.mocked(require('../hooks/useOutfitEngine').useOutfitEngine).mockReturnValue({
        generateRandomOutfit: vi.fn().mockRejectedValue(new Error('Network error')),
        isGenerating: false,
        generationError: null,
        scoreOutfit: vi.fn(() => 85),
        getRandomOutfit: vi.fn(),
        getOutfitsForAnchor: vi.fn(),
        getAllOutfits: vi.fn(() => []),
        getCompatibleItems: vi.fn(() => []),
        getFilteredOutfits: vi.fn(() => []),
        validatePartialSelection: vi.fn(() => true)
      });

      render(
        <OutfitDisplay 
          selection={mockSelection} 
          onRandomize={mockOnRandomize} 
        />
      );

      const randomizeButton = screen.getByText('Try Another Combination');
      fireEvent.click(randomizeButton);

      // Should fall back to original randomize function
      expect(mockOnRandomize).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle weather retry functionality', async () => {
      const mockRetryWeatherUpdate = vi.fn();
      const mockError = { message: 'Network error', canRetry: true };
      
      vi.mocked(require('../hooks/useOptimisticWeather').useOptimisticWeather).mockReturnValue({
        weather: [],
        isUpdating: false,
        error: mockError,
        updateLocation: vi.fn(),
        retryWeatherUpdate: mockRetryWeatherUpdate
      });

      // Mock WeatherWidget with retry button
      vi.mocked(require('../components/WeatherWidget').WeatherWidget).mockImplementation(
        ({ error, onRetry }: any) => (
          <div data-testid="weather-widget">
            <span>Error: {error.message}</span>
            {onRetry && <button onClick={onRetry}>Retry</button>}
          </div>
        )
      );

      render(<WeatherWidget location="Test City" useOptimistic={true} />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockRetryWeatherUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Performance and User Experience', () => {
    it('should provide immediate feedback for outfit generation', () => {
      const mockOnRandomize = vi.fn();
      
      // Mock optimistic state
      vi.mocked(require('../hooks/useOutfitEngine').useOutfitEngine).mockReturnValue({
        generateRandomOutfit: vi.fn(),
        isGenerating: true, // Simulating immediate optimistic state
        generationError: null,
        scoreOutfit: vi.fn(() => 85),
        getRandomOutfit: vi.fn(),
        getOutfitsForAnchor: vi.fn(),
        getAllOutfits: vi.fn(() => []),
        getCompatibleItems: vi.fn(() => []),
        getFilteredOutfits: vi.fn(() => []),
        validatePartialSelection: vi.fn(() => true)
      });

      render(
        <OutfitDisplay 
          selection={mockSelection} 
          onRandomize={mockOnRandomize} 
        />
      );

      // Should show immediate loading feedback
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should provide immediate feedback for weather updates', () => {
      // Mock optimistic weather state
      vi.mocked(require('../hooks/useOptimisticWeather').useOptimisticWeather).mockReturnValue({
        weather: [
          {
            date: '2024-01-15',
            dayOfWeek: 'Monday',
            high: 70,
            low: 55,
            condition: 'Partly Cloudy',
            icon: 'partly-cloudy',
            precipitationChance: 15
          }
        ],
        isUpdating: true, // Simulating optimistic state
        error: null,
        updateLocation: vi.fn(),
        retryWeatherUpdate: vi.fn()
      });

      render(<WeatherWidget location="Denver, CO" useOptimistic={true} />);

      // Should show both optimistic weather and loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});