import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeather } from '../use-weather';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('useWeather', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle successful weather data fetch', async () => {
    // Mock successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      });
    });

    // Mock successful weather API response
    const mockWeatherData = {
      current: {
        temperature: 75,
        condition: 'clear sky',
        icon: '01d',
      },
      forecast: [
        {
          date: '2024-01-01',
          temperature: { high: 80, low: 65 },
          condition: 'sunny',
          icon: '01d',
          precipitationProbability: 10,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    });

    const { result } = renderHook(() => useWeather());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.current).toBe(null);
    expect(result.current.forecast).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.current).toEqual(mockWeatherData.current);
    expect(result.current.forecast).toEqual(mockWeatherData.forecast);
    expect(result.current.error).toBe(null);
  });

  it('should handle geolocation permission denied', async () => {
    // Mock geolocation permission denied
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
      });
    });

    const { result } = renderHook(() => useWeather());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual({
      error: 'Location access is required to show weather information. Please enable location permissions in your browser settings.',
      details: 'Location access denied by user',
    });
    expect(result.current.current).toBe(null);
    expect(result.current.forecast).toEqual([]);
  });

  it('should handle weather API error', async () => {
    // Mock successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      });
    });

    // Mock API error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    const { result } = renderHook(() => useWeather());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual({
      error: 'Internal server error',
    });
    expect(result.current.current).toBe(null);
    expect(result.current.forecast).toEqual([]);
  });

  it('should provide retry functionality', async () => {
    // Mock geolocation failure first, then success
    let callCount = 0;
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      callCount++;
      if (callCount === 1) {
        error({
          code: 3, // TIMEOUT
          message: 'Timeout',
        });
      } else {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
        });
      }
    });

    const mockWeatherData = {
      current: {
        temperature: 75,
        condition: 'clear sky',
        icon: '01d',
      },
      forecast: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    });

    const { result } = renderHook(() => useWeather());

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Retry
    result.current.retry();

    // Wait for successful retry
    await waitFor(() => {
      expect(result.current.current).toEqual(mockWeatherData.current);
    });

    expect(result.current.error).toBe(null);
  });
});