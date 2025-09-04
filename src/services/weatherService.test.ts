/**
 * Comprehensive tests for weather service error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getWeatherData, 
  getWeatherDataWithFallback, 
  getFallbackWeatherData,
  checkWeatherServiceStatus,
  clearWeatherCache 
} from './weatherService';
import { WeatherError } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Weather Service Error Handling', () => {
  beforeEach(() => {
    clearWeatherCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Error Handling', () => {
    it('should handle rate limiting errors (429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']]),
        json: async () => ({ error: 'Rate limit exceeded' })
      });

      await expect(getWeatherData(40.7128, -74.0060)).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        message: expect.stringContaining('Weather service is temporarily busy')
      });
    });

    it('should handle unauthorized errors (401/403)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      await expect(getWeatherData(40.7128, -74.0060)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: expect.stringContaining('Weather service is temporarily unavailable')
      });
    });

    it('should handle service unavailable errors (503)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service unavailable' })
      });

      await expect(getWeatherData(40.7128, -74.0060)).rejects.toMatchObject({
        code: 'API_ERROR',
        message: expect.stringContaining('temporarily down for maintenance')
      });
    });

    it('should handle network timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'));

      await expect(getWeatherData(40.7128, -74.0060)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: expect.stringContaining('Weather request timed out')
      });
    });

    it('should retry on server errors and eventually fail', async () => {
      // Mock 3 failed attempts (server errors are retryable)
      mockFetch
        .mockRejectedValueOnce(new Error('Server error: 500'))
        .mockRejectedValueOnce(new Error('Server error: 500'))
        .mockRejectedValueOnce(new Error('Server error: 500'));

      await expect(getWeatherData(40.7128, -74.0060)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: expect.stringContaining('Unable to connect to weather service after multiple attempts')
      });

      // Should have made 3 attempts
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid coordinates', async () => {
      await expect(getWeatherData(NaN, 0)).rejects.toMatchObject({
        code: 'LOCATION_ERROR',
        message: 'Invalid location coordinates provided'
      });

      await expect(getWeatherData(91, 0)).rejects.toMatchObject({
        code: 'LOCATION_ERROR',
        message: 'Location coordinates are out of valid range'
      });

      await expect(getWeatherData(0, 181)).rejects.toMatchObject({
        code: 'LOCATION_ERROR',
        message: 'Location coordinates are out of valid range'
      });
    });
  });

  describe('Fallback Handling', () => {
    it('should return fallback data when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getWeatherDataWithFallback(40.7128, -74.0060, true);
      
      expect(result.isFallback).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({
        high: 75,
        low: 60,
        condition: 'Partly cloudy'
      });
    });

    it('should generate valid fallback weather data', () => {
      const fallbackData = getFallbackWeatherData();
      
      expect(fallbackData).toHaveLength(3);
      expect(fallbackData[0]).toMatchObject({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        dayOfWeek: expect.any(String),
        high: 75,
        low: 60,
        condition: 'Partly cloudy',
        icon: '02d'
      });
    });

    it('should throw error when fallback is disabled', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getWeatherDataWithFallback(40.7128, -74.0060, false))
        .rejects.toThrow();
    });
  });

  describe('Service Status Check', () => {
    it('should report service as available when API works', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: { temperature: 70, condition: 'Clear', icon: '01d' },
          forecast: []
        })
      });

      const status = await checkWeatherServiceStatus();
      
      expect(status.available).toBe(true);
      expect(status.error).toBeUndefined();
      expect(status.lastChecked).toBeInstanceOf(Date);
    });

    it('should report service as unavailable when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Service down'));

      const status = await checkWeatherServiceStatus();
      
      expect(status.available).toBe(false);
      expect(status.error).toBeDefined();
      expect(status.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('Cache Behavior with Errors', () => {
    it('should return stale cache data when API fails', async () => {
      // First, populate cache with successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: { temperature: 70, condition: 'Clear', icon: '01d' },
          forecast: [
            {
              date: '2024-01-01',
              temperature: { high: 75, low: 60 },
              condition: 'Sunny',
              icon: '01d',
              precipitationProbability: 0
            }
          ]
        })
      });

      const firstResult = await getWeatherData(40.7128, -74.0060);
      expect(firstResult).toHaveLength(1);

      // Now mock API failure
      mockFetch.mockRejectedValueOnce(new Error('API down'));

      // Should return cached data despite API failure
      const secondResult = await getWeatherData(40.7128, -74.0060);
      expect(secondResult).toEqual(firstResult);
    });
  });
});