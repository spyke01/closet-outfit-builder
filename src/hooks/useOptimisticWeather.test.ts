/**
 * Comprehensive tests for useOptimisticWeather hook
 * Tests optimistic updates, error handling, and weather predictions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimisticWeather, predictWeatherFromLocation } from './useOptimisticWeather';
import { WeatherData, WeatherError } from '../types';

describe('predictWeatherFromLocation', () => {
  beforeEach(() => {
    // Mock Date to ensure consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate 3 days of weather predictions', () => {
    const predictions = predictWeatherFromLocation('New York, NY');
    
    expect(predictions).toHaveLength(3);
    predictions.forEach((prediction, index) => {
      expect(prediction).toHaveProperty('date');
      expect(prediction).toHaveProperty('dayOfWeek');
      expect(prediction).toHaveProperty('high');
      expect(prediction).toHaveProperty('low');
      expect(prediction).toHaveProperty('condition');
      expect(prediction).toHaveProperty('precipitationChance');
    });
  });

  it('should predict warmer weather for Miami', () => {
    const miamiPredictions = predictWeatherFromLocation('Miami, FL');
    const nyPredictions = predictWeatherFromLocation('New York, NY');
    
    expect(miamiPredictions[0].high).toBeGreaterThan(nyPredictions[0].high!);
    expect(miamiPredictions[0].condition).toBe('Sunny');
  });

  it('should predict cooler weather for Seattle', () => {
    const seattlePredictions = predictWeatherFromLocation('Seattle, WA');
    const defaultPredictions = predictWeatherFromLocation('Unknown City');
    
    expect(seattlePredictions[0].high).toBeLessThan(defaultPredictions[0].high!);
    expect(seattlePredictions[0].condition).toBe('Cloudy');
  });

  it('should predict hot weather for Phoenix', () => {
    const phoenixPredictions = predictWeatherFromLocation('Phoenix, AZ');
    
    expect(phoenixPredictions[0].high).toBeGreaterThan(80);
    expect(phoenixPredictions[0].condition).toBe('Sunny');
  });

  it('should handle case-insensitive location matching', () => {
    const upperCasePredictions = predictWeatherFromLocation('MIAMI, FLORIDA');
    const lowerCasePredictions = predictWeatherFromLocation('miami, florida');
    
    expect(upperCasePredictions[0].high).toBe(lowerCasePredictions[0].high);
    expect(upperCasePredictions[0].condition).toBe(lowerCasePredictions[0].condition);
  });

  it('should generate different temperatures for different days', () => {
    const predictions = predictWeatherFromLocation('Chicago, IL');
    
    // Temperatures should vary between days
    const temperatures = predictions.map(p => p.high);
    const uniqueTemperatures = new Set(temperatures);
    expect(uniqueTemperatures.size).toBeGreaterThan(1);
  });

  it('should ensure low temperature is less than high temperature', () => {
    const predictions = predictWeatherFromLocation('Denver, CO');
    
    predictions.forEach(prediction => {
      expect(prediction.low).toBeLessThan(prediction.high!);
    });
  });

  it('should generate proper day of week', () => {
    const predictions = predictWeatherFromLocation('Boston, MA');
    
    // January 15, 2024 is a Monday
    expect(predictions[0].dayOfWeek).toBe('Monday');
    expect(predictions[1].dayOfWeek).toBe('Tuesday');
    expect(predictions[2].dayOfWeek).toBe('Wednesday');
  });

  it('should generate proper date format', () => {
    const predictions = predictWeatherFromLocation('Philadelphia, PA');
    
    expect(predictions[0].date).toBe('2024-01-15');
    expect(predictions[1].date).toBe('2024-01-16');
    expect(predictions[2].date).toBe('2024-01-17');
  });
});

describe('useOptimisticWeather', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Math.random for consistent test results
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useOptimisticWeather());

    expect(result.current.weather).toEqual([]);
    expect(result.current.forecast).toEqual([]);
    expect(result.current.location).toBe('');
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });

  it('should show optimistic weather immediately when updating location', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    act(() => {
      result.current.updateLocation('Miami, FL');
    });

    // Should show optimistic result immediately
    expect(result.current.weather).toHaveLength(3);
    expect(result.current.isUpdating).toBe(true);
    expect(result.current.location).toBe('Miami, FL');
    
    // Check optimistic weather properties
    expect(result.current.weather[0]).toHaveProperty('condition');
    expect(result.current.weather[0]).toHaveProperty('high');
    expect(result.current.weather[0]).toHaveProperty('low');
  });

  it('should replace optimistic weather with actual data', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    act(() => {
      result.current.updateLocation('Seattle, WA');
    });

    // Wait for actual result
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    }, { timeout: 3000 });

    // Should have actual weather data
    expect(result.current.weather).toHaveLength(3);
    expect(result.current.lastUpdated).toBeTruthy();
    expect(result.current.error).toBeNull();
  });

  it('should revert optimistic update on error', async () => {
    // Mock Math.random to force API error
    vi.spyOn(Math, 'random').mockReturnValue(0.05); // Force error (< 0.1)

    const { result } = renderHook(() => useOptimisticWeather());

    act(() => {
      result.current.updateLocation('Test City');
    });

    // Should show optimistic result initially
    expect(result.current.weather).toHaveLength(3);
    expect(result.current.isUpdating).toBe(true);

    // Wait for error and reversion
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    }, { timeout: 3000 });

    // Should revert to empty state and show error
    expect(result.current.weather).toHaveLength(0);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.code).toMatch(/NETWORK_ERROR|RATE_LIMIT|API_ERROR/);
  });

  it('should handle empty location gracefully', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    await act(async () => {
      await result.current.updateLocation('');
    });

    // Should not update anything for empty location
    expect(result.current.weather).toHaveLength(0);
    expect(result.current.location).toBe('');
    expect(result.current.isUpdating).toBe(false);
  });

  it('should handle whitespace-only location', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    await act(async () => {
      await result.current.updateLocation('   ');
    });

    // Should not update anything for whitespace-only location
    expect(result.current.weather).toHaveLength(0);
    expect(result.current.location).toBe('   ');
    expect(result.current.isUpdating).toBe(false);
  });

  it('should refresh current weather data', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    // First, set a location
    await act(async () => {
      await result.current.updateLocation('Chicago, IL');
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    }, { timeout: 3000 });

    const firstUpdate = result.current.lastUpdated;

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    // Refresh weather
    await act(async () => {
      await result.current.refreshWeather();
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    }, { timeout: 3000 });

    // Should have updated timestamp
    expect(result.current.lastUpdated).not.toBe(firstUpdate);
  });

  it('should not refresh without location', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    await act(async () => {
      await result.current.refreshWeather();
    });

    // Should remain empty
    expect(result.current.weather).toHaveLength(0);
    expect(result.current.isUpdating).toBe(false);
  });

  it('should retry failed weather requests', async () => {
    // First, force an error
    vi.spyOn(Math, 'random').mockReturnValue(0.05);

    const { result } = renderHook(() => useOptimisticWeather());

    await act(async () => {
      await result.current.updateLocation('Test City');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 3000 });

    // Now allow success
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // Retry the request
    await act(async () => {
      await result.current.retryWeatherUpdate();
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    }, { timeout: 3000 });

    // Should have successful result
    expect(result.current.weather).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('should not retry without location or retryable error', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    await act(async () => {
      await result.current.retryWeatherUpdate();
    });

    // Should remain empty
    expect(result.current.weather).toHaveLength(0);
    expect(result.current.isUpdating).toBe(false);
  });

  it('should clear optimistic state', () => {
    const { result } = renderHook(() => useOptimisticWeather());

    // Add some state
    act(() => {
      result.current.updateLocation('Denver, CO');
    });

    expect(result.current.weather).toHaveLength(3);
    expect(result.current.location).toBe('Denver, CO');

    // Clear state
    act(() => {
      result.current.clearOptimistic();
    });

    expect(result.current.weather).toHaveLength(0);
    expect(result.current.location).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });

  it('should handle different error types correctly', async () => {
    const errorTypes = ['NETWORK_ERROR', 'RATE_LIMIT', 'API_ERROR'];
    
    for (const errorType of errorTypes) {
      // Mock specific error type
      vi.spyOn(Math, 'random').mockReturnValue(0.05);
      
      const { result } = renderHook(() => useOptimisticWeather());

      await act(async () => {
        await result.current.updateLocation('Test City');
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      }, { timeout: 3000 });

      expect(result.current.error?.code).toMatch(/NETWORK_ERROR|RATE_LIMIT|API_ERROR/);
      expect(result.current.error?.canRetry).toBeDefined();
    }
  });

  it('should simulate realistic API delays', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    const startTime = Date.now();

    act(() => {
      result.current.updateLocation('Portland, OR');
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    }, { timeout: 4000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should take at least 1000ms (minimum delay)
    expect(duration).toBeGreaterThan(1000);
    // Should not take more than 3000ms (max delay + buffer)
    expect(duration).toBeLessThan(3000);
  });

  it('should generate realistic weather data', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    await act(async () => {
      await result.current.updateLocation('Vancouver, BC');
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    }, { timeout: 3000 });

    const weather = result.current.weather;
    expect(weather).toHaveLength(3);

    weather.forEach(day => {
      expect(day.high).toBeGreaterThan(day.low);
      expect(day.high).toBeGreaterThan(0);
      expect(day.high).toBeLessThan(120); // Reasonable temperature range
      expect(day.precipitationChance).toBeGreaterThanOrEqual(0);
      expect(day.precipitationChance).toBeLessThanOrEqual(100);
      expect(day.condition).toBeTruthy();
      expect(day.dayOfWeek).toBeTruthy();
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('should handle concurrent location updates', async () => {
    const { result } = renderHook(() => useOptimisticWeather());

    // Start multiple updates
    act(() => {
      result.current.updateLocation('Miami, FL');
    });

    act(() => {
      result.current.updateLocation('Seattle, WA');
    });

    // Should show optimistic results
    expect(result.current.weather).toHaveLength(3);
    expect(result.current.isUpdating).toBe(true);

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    }, { timeout: 4000 });

    // Should have final location's weather
    expect(result.current.location).toBe('Seattle, WA');
    expect(result.current.weather).toHaveLength(3);
  });

  it('should log errors for debugging', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Force an error
    vi.spyOn(Math, 'random').mockReturnValue(0.05);

    const { result } = renderHook(() => useOptimisticWeather());

    await act(async () => {
      await result.current.updateLocation('Test City');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 3000 });

    expect(consoleSpy).toHaveBeenCalledWith('Weather update failed:', expect.any(Object));
    consoleSpy.mockRestore();
  });
});