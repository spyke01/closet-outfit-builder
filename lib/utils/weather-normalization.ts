/**
 * Weather Normalization Utilities
 * 
 * Pure functions for normalizing weather data into actionable bands
 * and flags for the outfit generation algorithm.
 * 
 * All functions are pure (no side effects) and fully testable.
 */

import { WeatherContext } from '@/lib/types/generation';
import { WeatherResponse } from '@/lib/hooks/use-weather';

/**
 * Temperature band thresholds (in Fahrenheit)
 */
const TEMP_THRESHOLDS = {
  COLD: 55,   // Below 55°F is cold
  MILD: 75,   // 55-75°F is mild
  WARM: 90,   // 75-90°F is warm
  // 90°F and above is hot
} as const;

/**
 * Precipitation threshold for "rain likely"
 */
const PRECIP_THRESHOLD = 0.35; // 35% chance or higher

/**
 * Temperature swing threshold for "large swing"
 */
const LARGE_SWING_THRESHOLD = 20; // 20°F or greater

/**
 * Classify temperature into exactly one band
 * 
 * @param temp - Temperature in Fahrenheit
 * @returns Object with exactly one band set to true
 */
export function classifyTemperature(temp: number): {
  isCold: boolean;
  isMild: boolean;
  isWarm: boolean;
  isHot: boolean;
} {
  if (temp < TEMP_THRESHOLDS.COLD) {
    return { isCold: true, isMild: false, isWarm: false, isHot: false };
  } else if (temp < TEMP_THRESHOLDS.MILD) {
    return { isCold: false, isMild: true, isWarm: false, isHot: false };
  } else if (temp < TEMP_THRESHOLDS.WARM) {
    return { isCold: false, isMild: false, isWarm: true, isHot: false };
  } else {
    return { isCold: false, isMild: false, isWarm: false, isHot: true };
  }
}

/**
 * Determine if rain is likely based on precipitation probability
 * 
 * @param precipChance - Precipitation probability (0-1)
 * @returns True if precipitation chance is >= 35%
 */
export function isRainLikely(precipChance: number): boolean {
  return precipChance >= PRECIP_THRESHOLD;
}

/**
 * Calculate daily temperature swing
 * 
 * @param high - High temperature in Fahrenheit
 * @param low - Low temperature in Fahrenheit
 * @returns Absolute difference between high and low (0 if invalid)
 */
export function calculateDailySwing(high: number, low: number): number {
  // Handle invalid inputs (NaN, Infinity)
  if (!Number.isFinite(high) || !Number.isFinite(low)) {
    return 0;
  }
  return Math.abs(high - low);
}

/**
 * Determine if temperature swing is large
 * 
 * @param swing - Daily temperature swing in Fahrenheit
 * @returns True if swing is >= 20°F
 */
export function hasLargeSwing(swing: number): boolean {
  return swing >= LARGE_SWING_THRESHOLD;
}

/**
 * Map temperature band to target weight (warmth level)
 * 
 * Target weight determines layering:
 * - 0: Minimal coverage (hot weather)
 * - 1: Light layering (warm weather)
 * - 2: Moderate layering (mild weather)
 * - 3: Heavy layering (cold weather)
 * 
 * @param bands - Temperature band classification
 * @returns Target weight (0-3)
 */
export function mapTemperatureToWeight(bands: {
  isCold: boolean;
  isMild: boolean;
  isWarm: boolean;
  isHot: boolean;
}): number {
  if (bands.isCold) return 3;
  if (bands.isMild) return 2;
  if (bands.isWarm) return 1;
  if (bands.isHot) return 0;
  
  // Fallback (should never reach here if bands are valid)
  return 1;
}

/**
 * Normalize weather data into actionable context for outfit generation
 * 
 * This is the main entry point for weather normalization. It takes raw
 * weather data and produces a WeatherContext with all necessary flags
 * and classifications.
 * 
 * @param current - Current weather data (or null for defaults)
 * @param forecast - Forecast data array (or empty for defaults)
 * @returns Normalized weather context
 */
export function normalizeWeatherContext(
  current: WeatherResponse['current'] | null,
  forecast: WeatherResponse['forecast']
): WeatherContext {
  // Handle completely missing weather data with neutral defaults
  if (!current) {
    return {
      isCold: false,
      isMild: true,
      isWarm: false,
      isHot: false,
      isRainLikely: false,
      dailySwing: 0,
      hasLargeSwing: false,
      targetWeight: 1,
      currentTemp: 65,
      highTemp: 70,
      lowTemp: 60,
      precipChance: 0,
    };
  }
  
  // Extract today's forecast (first item)
  const today = forecast[0];
  
  // Use current temperature for classification
  const currentTemp = current.temperature;
  
  // Get high/low from today's forecast, or estimate from current
  const highTemp = today?.temperature.high ?? currentTemp + 5;
  const lowTemp = today?.temperature.low ?? currentTemp - 5;
  
  // Get precipitation probability, default to 0 if not available
  const precipChance = today?.precipitationProbability ?? 0;
  
  // Classify temperature into bands
  const tempBands = classifyTemperature(currentTemp);
  
  // Calculate daily swing
  const swing = calculateDailySwing(highTemp, lowTemp);
  
  // Determine if swing is large
  const largeSwing = hasLargeSwing(swing);
  
  // Map temperature to target weight
  const targetWeight = mapTemperatureToWeight(tempBands);
  
  // Determine if rain is likely
  const rainLikely = isRainLikely(precipChance);
  
  return {
    ...tempBands,
    isRainLikely: rainLikely,
    dailySwing: swing,
    hasLargeSwing: largeSwing,
    targetWeight,
    currentTemp,
    highTemp,
    lowTemp,
    precipChance,
  };
}

/**
 * Get a human-readable description of the weather context
 * 
 * Useful for debugging and displaying weather information to users.
 * 
 * @param context - Weather context
 * @returns Human-readable description
 */
export function describeWeatherContext(context: WeatherContext): string {
  const tempDesc = context.isCold ? 'cold' :
                   context.isMild ? 'mild' :
                   context.isWarm ? 'warm' : 'hot';
  
  const swingDesc = context.hasLargeSwing ? 
    ` with a large temperature swing (${Math.round(context.dailySwing)}°F)` : '';
  
  const rainDesc = context.isRainLikely ? 
    ` and rain likely (${Math.round(context.precipChance * 100)}%)` : '';
  
  return `${tempDesc} weather${swingDesc}${rainDesc}`;
}
