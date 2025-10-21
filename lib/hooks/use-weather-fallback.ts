'use client';

import { useState, useCallback } from 'react';
import type { WeatherResponse, WeatherError } from './use-weather';

/**
 * Fallback weather data when main service is unavailable
 * Provides basic weather information based on location and season
 */
interface FallbackWeatherData {
  location: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  temperature: number;
  condition: string;
  icon: string;
}

/**
 * Get season based on current date and hemisphere
 */
function getCurrentSeason(latitude: number): 'spring' | 'summer' | 'fall' | 'winter' {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const isNorthernHemisphere = latitude >= 0;

  if (isNorthernHemisphere) {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  } else {
    // Southern hemisphere seasons are opposite
    if (month >= 2 && month <= 4) return 'fall';
    if (month >= 5 && month <= 7) return 'winter';
    if (month >= 8 && month <= 10) return 'spring';
    return 'summer';
  }
}

/**
 * Get approximate location name based on coordinates
 */
function getApproximateLocation(latitude: number, longitude: number): string {
  // Simple location approximation based on major cities
  const locations = [
    { name: 'New York', lat: 40.7128, lon: -74.0060, range: 2 },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, range: 2 },
    { name: 'Chicago', lat: 41.8781, lon: -87.6298, range: 2 },
    { name: 'London', lat: 51.5074, lon: -0.1278, range: 2 },
    { name: 'Paris', lat: 48.8566, lon: 2.3522, range: 2 },
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503, range: 2 },
    { name: 'Sydney', lat: -33.8688, lon: 151.2093, range: 2 },
  ];

  for (const location of locations) {
    const latDiff = Math.abs(latitude - location.lat);
    const lonDiff = Math.abs(longitude - location.lon);
    if (latDiff <= location.range && lonDiff <= location.range) {
      return location.name;
    }
  }

  // Fallback to general region
  if (latitude > 40) return 'Northern Region';
  if (latitude > 0) return 'Temperate Region';
  if (latitude > -40) return 'Southern Region';
  return 'Polar Region';
}

/**
 * Generate seasonal weather estimates
 */
function getSeasonalWeatherEstimate(season: string, latitude: number): Omit<FallbackWeatherData, 'location'> {
  const isNorthernHemisphere = latitude >= 0;
  const isTropical = Math.abs(latitude) < 23.5;
  
  if (isTropical) {
    // Tropical regions have less seasonal variation
    return {
      season: season as any,
      temperature: 80,
      condition: 'partly cloudy',
      icon: '02d',
    };
  }

  switch (season) {
    case 'spring':
      return {
        season: 'spring',
        temperature: isNorthernHemisphere ? 65 : 60,
        condition: 'partly cloudy',
        icon: '02d',
      };
    case 'summer':
      return {
        season: 'summer',
        temperature: isNorthernHemisphere ? 80 : 75,
        condition: 'sunny',
        icon: '01d',
      };
    case 'fall':
      return {
        season: 'fall',
        temperature: isNorthernHemisphere ? 60 : 65,
        condition: 'cloudy',
        icon: '03d',
      };
    case 'winter':
      return {
        season: 'winter',
        temperature: isNorthernHemisphere ? 40 : 50,
        condition: 'overcast',
        icon: '04d',
      };
    default:
      return {
        season: 'spring',
        temperature: 65,
        condition: 'partly cloudy',
        icon: '02d',
      };
  }
}

/**
 * Hook for fallback weather data when main weather service is unavailable
 */
export function useWeatherFallback() {
  const [fallbackData, setFallbackData] = useState<WeatherResponse | null>(null);
  const [error, setError] = useState<WeatherError | null>(null);

  const generateFallbackWeather = useCallback(async (latitude: number, longitude: number): Promise<WeatherResponse> => {
    try {
      const location = getApproximateLocation(latitude, longitude);
      const season = getCurrentSeason(latitude);
      const weatherEstimate = getSeasonalWeatherEstimate(season, latitude);

      const fallbackResponse: WeatherResponse = {
        current: {
          temperature: weatherEstimate.temperature,
          condition: weatherEstimate.condition,
          icon: weatherEstimate.icon,
        },
        forecast: [
          {
            date: new Date().toISOString().split('T')[0],
            temperature: {
              high: weatherEstimate.temperature + 5,
              low: weatherEstimate.temperature - 10,
            },
            condition: weatherEstimate.condition,
            icon: weatherEstimate.icon,
            precipitationProbability: season === 'winter' ? 30 : 20,
          },
          {
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            temperature: {
              high: weatherEstimate.temperature + 3,
              low: weatherEstimate.temperature - 8,
            },
            condition: 'partly cloudy',
            icon: '02d',
            precipitationProbability: 15,
          },
          {
            date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
            temperature: {
              high: weatherEstimate.temperature + 2,
              low: weatherEstimate.temperature - 12,
            },
            condition: 'cloudy',
            icon: '03d',
            precipitationProbability: 25,
          },
        ],
      };

      setFallbackData(fallbackResponse);
      setError(null);
      return fallbackResponse;
    } catch (err) {
      const fallbackError: WeatherError = {
        error: 'Unable to provide weather information at this time.',
        details: err instanceof Error ? err.message : 'Fallback generation failed'
      };
      setError(fallbackError);
      throw fallbackError;
    }
  }, []);

  return {
    fallbackData,
    error,
    generateFallbackWeather,
  };
}

/**
 * Check if weather data is from fallback service
 */
export function isWeatherDataFromFallback(data: WeatherResponse): boolean {
  // Fallback data has specific characteristics we can detect
  return data.forecast.length === 3 && 
         data.forecast.every(day => day.precipitationProbability !== undefined) &&
         [65, 80, 60, 40, 75, 50].includes(data.current.temperature);
}