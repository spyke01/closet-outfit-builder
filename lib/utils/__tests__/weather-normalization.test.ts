/**
 * Tests for Weather Normalization Utilities
 * 
 * Includes both unit tests for specific examples and property-based tests
 * for universal properties across all inputs.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  classifyTemperature,
  isRainLikely,
  calculateDailySwing,
  hasLargeSwing,
  mapTemperatureToWeight,
  normalizeWeatherContext,
  describeWeatherContext,
} from '../weather-normalization';
import { WeatherContext } from '@/lib/types/generation';

describe('Weather Normalization - Unit Tests', () => {
  describe('classifyTemperature', () => {
    it('classifies 50°F as cold', () => {
      const result = classifyTemperature(50);
      expect(result.isCold).toBe(true);
      expect(result.isMild).toBe(false);
      expect(result.isWarm).toBe(false);
      expect(result.isHot).toBe(false);
    });

    it('classifies 54°F as cold (boundary)', () => {
      const result = classifyTemperature(54);
      expect(result.isCold).toBe(true);
    });

    it('classifies 55°F as mild (boundary)', () => {
      const result = classifyTemperature(55);
      expect(result.isMild).toBe(true);
    });

    it('classifies 65°F as mild', () => {
      const result = classifyTemperature(65);
      expect(result.isMild).toBe(true);
    });

    it('classifies 74°F as mild (boundary)', () => {
      const result = classifyTemperature(74);
      expect(result.isMild).toBe(true);
    });

    it('classifies 75°F as warm (boundary)', () => {
      const result = classifyTemperature(75);
      expect(result.isWarm).toBe(true);
    });

    it('classifies 85°F as warm', () => {
      const result = classifyTemperature(85);
      expect(result.isWarm).toBe(true);
    });

    it('classifies 89°F as warm (boundary)', () => {
      const result = classifyTemperature(89);
      expect(result.isWarm).toBe(true);
    });

    it('classifies 90°F as hot (boundary)', () => {
      const result = classifyTemperature(90);
      expect(result.isHot).toBe(true);
    });

    it('classifies 95°F as hot', () => {
      const result = classifyTemperature(95);
      expect(result.isHot).toBe(true);
    });

    it('classifies 110°F as hot', () => {
      const result = classifyTemperature(110);
      expect(result.isHot).toBe(true);
    });

    it('classifies 0°F as cold', () => {
      const result = classifyTemperature(0);
      expect(result.isCold).toBe(true);
    });

    it('classifies -10°F as cold', () => {
      const result = classifyTemperature(-10);
      expect(result.isCold).toBe(true);
    });
  });

  describe('isRainLikely', () => {
    it('returns false for 0% precipitation', () => {
      expect(isRainLikely(0)).toBe(false);
    });

    it('returns false for 30% precipitation', () => {
      expect(isRainLikely(0.3)).toBe(false);
    });

    it('returns false for 34% precipitation (boundary)', () => {
      expect(isRainLikely(0.34)).toBe(false);
    });

    it('returns true for 35% precipitation (boundary)', () => {
      expect(isRainLikely(0.35)).toBe(true);
    });

    it('returns true for 50% precipitation', () => {
      expect(isRainLikely(0.5)).toBe(true);
    });

    it('returns true for 100% precipitation', () => {
      expect(isRainLikely(1.0)).toBe(true);
    });
  });

  describe('calculateDailySwing', () => {
    it('calculates swing for 70°F high and 50°F low', () => {
      expect(calculateDailySwing(70, 50)).toBe(20);
    });

    it('calculates swing for 85°F high and 65°F low', () => {
      expect(calculateDailySwing(85, 65)).toBe(20);
    });

    it('calculates swing for same high and low', () => {
      expect(calculateDailySwing(70, 70)).toBe(0);
    });

    it('handles reversed order (low, high)', () => {
      expect(calculateDailySwing(50, 70)).toBe(20);
    });

    it('calculates swing for negative temperatures', () => {
      expect(calculateDailySwing(10, -10)).toBe(20);
    });
  });

  describe('hasLargeSwing', () => {
    it('returns false for 0°F swing', () => {
      expect(hasLargeSwing(0)).toBe(false);
    });

    it('returns false for 10°F swing', () => {
      expect(hasLargeSwing(10)).toBe(false);
    });

    it('returns false for 19°F swing (boundary)', () => {
      expect(hasLargeSwing(19)).toBe(false);
    });

    it('returns true for 20°F swing (boundary)', () => {
      expect(hasLargeSwing(20)).toBe(true);
    });

    it('returns true for 25°F swing', () => {
      expect(hasLargeSwing(25)).toBe(true);
    });

    it('returns true for 40°F swing', () => {
      expect(hasLargeSwing(40)).toBe(true);
    });
  });

  describe('mapTemperatureToWeight', () => {
    it('maps cold to weight 3', () => {
      const bands = { isCold: true, isMild: false, isWarm: false, isHot: false };
      expect(mapTemperatureToWeight(bands)).toBe(3);
    });

    it('maps mild to weight 2', () => {
      const bands = { isCold: false, isMild: true, isWarm: false, isHot: false };
      expect(mapTemperatureToWeight(bands)).toBe(2);
    });

    it('maps warm to weight 1', () => {
      const bands = { isCold: false, isMild: false, isWarm: true, isHot: false };
      expect(mapTemperatureToWeight(bands)).toBe(1);
    });

    it('maps hot to weight 0', () => {
      const bands = { isCold: false, isMild: false, isWarm: false, isHot: true };
      expect(mapTemperatureToWeight(bands)).toBe(0);
    });
  });

  describe('normalizeWeatherContext', () => {
    it('normalizes complete weather data', () => {
      const current = {
        temperature: 65,
        condition: 'Partly Cloudy',
        icon: 'partly-cloudy',
      };
      const forecast = [
        {
          date: '2024-01-01',
          temperature: { high: 70, low: 60 },
          condition: 'Partly Cloudy',
          icon: 'partly-cloudy',
          precipitationProbability: 0.2,
        },
      ];

      const context = normalizeWeatherContext(current, forecast);

      expect(context.isMild).toBe(true);
      expect(context.isCold).toBe(false);
      expect(context.isWarm).toBe(false);
      expect(context.isHot).toBe(false);
      expect(context.isRainLikely).toBe(false);
      expect(context.dailySwing).toBe(10);
      expect(context.hasLargeSwing).toBe(false);
      expect(context.targetWeight).toBe(2);
      expect(context.currentTemp).toBe(65);
      expect(context.highTemp).toBe(70);
      expect(context.lowTemp).toBe(60);
      expect(context.precipChance).toBe(0.2);
    });

    it('handles missing weather data with neutral defaults', () => {
      const context = normalizeWeatherContext(null, []);

      expect(context.isMild).toBe(true);
      expect(context.isCold).toBe(false);
      expect(context.isWarm).toBe(false);
      expect(context.isHot).toBe(false);
      expect(context.isRainLikely).toBe(false);
      expect(context.dailySwing).toBe(0);
      expect(context.hasLargeSwing).toBe(false);
      expect(context.targetWeight).toBe(1);
      expect(context.currentTemp).toBe(65);
      expect(context.highTemp).toBe(70);
      expect(context.lowTemp).toBe(60);
      expect(context.precipChance).toBe(0);
    });

    it('handles missing forecast with current data', () => {
      const current = {
        temperature: 75,
        condition: 'Sunny',
        icon: 'sunny',
      };

      const context = normalizeWeatherContext(current, []);

      expect(context.isWarm).toBe(true);
      expect(context.currentTemp).toBe(75);
      expect(context.highTemp).toBe(80); // Estimated
      expect(context.lowTemp).toBe(70); // Estimated
    });

    it('handles missing precipitation probability', () => {
      const current = {
        temperature: 65,
        condition: 'Cloudy',
        icon: 'cloudy',
      };
      const forecast = [
        {
          date: '2024-01-01',
          temperature: { high: 70, low: 60 },
          condition: 'Cloudy',
          icon: 'cloudy',
          // No precipitationProbability
        },
      ];

      const context = normalizeWeatherContext(current, forecast);

      expect(context.isRainLikely).toBe(false);
      expect(context.precipChance).toBe(0);
    });

    it('classifies cold weather correctly', () => {
      const current = {
        temperature: 45,
        condition: 'Cold',
        icon: 'cold',
      };
      const forecast = [
        {
          date: '2024-01-01',
          temperature: { high: 50, low: 40 },
          condition: 'Cold',
          icon: 'cold',
          precipitationProbability: 0.1,
        },
      ];

      const context = normalizeWeatherContext(current, forecast);

      expect(context.isCold).toBe(true);
      expect(context.targetWeight).toBe(3);
    });

    it('classifies hot weather correctly', () => {
      const current = {
        temperature: 95,
        condition: 'Hot',
        icon: 'hot',
      };
      const forecast = [
        {
          date: '2024-01-01',
          temperature: { high: 100, low: 85 },
          condition: 'Hot',
          icon: 'hot',
          precipitationProbability: 0.0,
        },
      ];

      const context = normalizeWeatherContext(current, forecast);

      expect(context.isHot).toBe(true);
      expect(context.targetWeight).toBe(0);
    });

    it('detects large temperature swing', () => {
      const current = {
        temperature: 70,
        condition: 'Variable',
        icon: 'variable',
      };
      const forecast = [
        {
          date: '2024-01-01',
          temperature: { high: 80, low: 50 },
          condition: 'Variable',
          icon: 'variable',
          precipitationProbability: 0.0,
        },
      ];

      const context = normalizeWeatherContext(current, forecast);

      expect(context.dailySwing).toBe(30);
      expect(context.hasLargeSwing).toBe(true);
    });

    it('detects rain likelihood', () => {
      const current = {
        temperature: 65,
        condition: 'Rainy',
        icon: 'rain',
      };
      const forecast = [
        {
          date: '2024-01-01',
          temperature: { high: 70, low: 60 },
          condition: 'Rainy',
          icon: 'rain',
          precipitationProbability: 0.8,
        },
      ];

      const context = normalizeWeatherContext(current, forecast);

      expect(context.isRainLikely).toBe(true);
      expect(context.precipChance).toBe(0.8);
    });
  });

  describe('describeWeatherContext', () => {
    it('describes cold weather', () => {
      const context: WeatherContext = {
        isCold: true,
        isMild: false,
        isWarm: false,
        isHot: false,
        isRainLikely: false,
        dailySwing: 10,
        hasLargeSwing: false,
        targetWeight: 3,
        currentTemp: 45,
        highTemp: 50,
        lowTemp: 40,
        precipChance: 0,
      };

      expect(describeWeatherContext(context)).toBe('cold weather');
    });

    it('describes mild weather with large swing', () => {
      const context: WeatherContext = {
        isCold: false,
        isMild: true,
        isWarm: false,
        isHot: false,
        isRainLikely: false,
        dailySwing: 25,
        hasLargeSwing: true,
        targetWeight: 2,
        currentTemp: 65,
        highTemp: 77,
        lowTemp: 52,
        precipChance: 0,
      };

      expect(describeWeatherContext(context)).toBe('mild weather with a large temperature swing (25°F)');
    });

    it('describes warm weather with rain', () => {
      const context: WeatherContext = {
        isCold: false,
        isMild: false,
        isWarm: true,
        isHot: false,
        isRainLikely: true,
        dailySwing: 10,
        hasLargeSwing: false,
        targetWeight: 1,
        currentTemp: 80,
        highTemp: 85,
        lowTemp: 75,
        precipChance: 0.6,
      };

      expect(describeWeatherContext(context)).toBe('warm weather and rain likely (60%)');
    });

    it('describes hot weather with large swing and rain', () => {
      const context: WeatherContext = {
        isCold: false,
        isMild: false,
        isWarm: false,
        isHot: true,
        isRainLikely: true,
        dailySwing: 22,
        hasLargeSwing: true,
        targetWeight: 0,
        currentTemp: 95,
        highTemp: 100,
        lowTemp: 78,
        precipChance: 0.4,
      };

      expect(describeWeatherContext(context)).toBe('hot weather with a large temperature swing (22°F) and rain likely (40%)');
    });
  });
});

describe('Weather Normalization - Property-Based Tests', () => {
  /**
   * Property 2: Weather Context Normalization
   * 
   * For any weather data with temperature and precipitation values,
   * the normalization function must classify the temperature into
   * exactly one band and correctly set isRainLikely based on the
   * 0.35 threshold.
   * 
   * **Validates: Requirements 4.1, 4.2, 2.5**
   */
  it('Property 2: Temperature classification is exclusive', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 150 }),
        (temp) => {
          const result = classifyTemperature(temp);
          const bands = [result.isCold, result.isMild, result.isWarm, result.isHot];
          const trueCount = bands.filter(b => b).length;
          
          // Exactly one band should be true
          expect(trueCount).toBe(1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Precipitation threshold is correctly applied', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1 }),
        (precipChance) => {
          const result = isRainLikely(precipChance);
          
          if (precipChance >= 0.35) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Temperature Swing Calculation
   * 
   * For any high and low temperature pair, the daily swing must
   * equal the absolute difference between high and low temperatures.
   * 
   * **Validates: Requirements 4.3**
   */
  it('Property 3: Daily swing equals high minus low', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 150 }),
        fc.float({ min: -50, max: 150 }),
        (temp1, temp2) => {
          const high = Math.max(temp1, temp2);
          const low = Math.min(temp1, temp2);
          const swing = calculateDailySwing(high, low);
          
          expect(swing).toBeCloseTo(high - low, 5);
          expect(swing).toBeGreaterThanOrEqual(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Target Weight Mapping
   * 
   * For any temperature band classification, the target weight must
   * be correctly mapped: isCold → 3, isMild → 2, isWarm → 1, isHot → 0.
   * 
   * **Validates: Requirements 4.4**
   */
  it('Property 4: Target weight correctly maps to temperature bands', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 150 }),
        (temp) => {
          const bands = classifyTemperature(temp);
          const weight = mapTemperatureToWeight(bands);
          
          if (bands.isCold) {
            expect(weight).toBe(3);
          } else if (bands.isMild) {
            expect(weight).toBe(2);
          } else if (bands.isWarm) {
            expect(weight).toBe(1);
          } else if (bands.isHot) {
            expect(weight).toBe(0);
          }
          
          // Weight must be in valid range
          expect(weight).toBeGreaterThanOrEqual(0);
          expect(weight).toBeLessThanOrEqual(3);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Large Swing Layering Adjustment
   * 
   * For any weather context where daily swing is 20°F or greater,
   * the hasLargeSwing flag must be true.
   * 
   * **Validates: Requirements 4.5**
   */
  it('Property 5: Large swing flag correctly set for swings >= 20°F', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 60 }),
        (swing) => {
          const result = hasLargeSwing(swing);
          
          if (swing >= 20) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: normalizeWeatherContext produces valid WeatherContext', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 150, noNaN: true }),
        fc.float({ min: -50, max: 150, noNaN: true }),
        fc.float({ min: -50, max: 150, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (currentTemp, temp1, temp2, precipChance) => {
          const high = Math.max(temp1, temp2);
          const low = Math.min(temp1, temp2);
          
          const current = {
            temperature: currentTemp,
            condition: 'Test',
            icon: 'test',
          };
          const forecast = [
            {
              date: '2024-01-01',
              temperature: { high, low },
              condition: 'Test',
              icon: 'test',
              precipitationProbability: precipChance,
            },
          ];
          
          const context = normalizeWeatherContext(current, forecast);
          
          // Verify structure
          expect(context).toHaveProperty('isCold');
          expect(context).toHaveProperty('isMild');
          expect(context).toHaveProperty('isWarm');
          expect(context).toHaveProperty('isHot');
          expect(context).toHaveProperty('isRainLikely');
          expect(context).toHaveProperty('dailySwing');
          expect(context).toHaveProperty('hasLargeSwing');
          expect(context).toHaveProperty('targetWeight');
          
          // Verify exactly one temperature band is true
          const bands = [context.isCold, context.isMild, context.isWarm, context.isHot];
          const trueCount = bands.filter(b => b).length;
          expect(trueCount).toBe(1);
          
          // Verify target weight is in valid range
          expect(context.targetWeight).toBeGreaterThanOrEqual(0);
          expect(context.targetWeight).toBeLessThanOrEqual(3);
          
          // Verify daily swing is non-negative and finite
          expect(context.dailySwing).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(context.dailySwing)).toBe(true);
          
          // Verify precipitation chance is in valid range
          expect(context.precipChance).toBeGreaterThanOrEqual(0);
          expect(context.precipChance).toBeLessThanOrEqual(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: normalizeWeatherContext handles missing data gracefully', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (hasCurrentData, hasForecastData) => {
          const current = hasCurrentData ? {
            temperature: 65,
            condition: 'Test',
            icon: 'test',
          } : null;
          
          const forecast = hasForecastData ? [
            {
              date: '2024-01-01',
              temperature: { high: 70, low: 60 },
              condition: 'Test',
              icon: 'test',
              precipitationProbability: 0.2,
            },
          ] : [];
          
          const context = normalizeWeatherContext(current, forecast);
          
          // Should always return a valid context
          expect(context).toBeDefined();
          expect(context.targetWeight).toBeGreaterThanOrEqual(0);
          expect(context.targetWeight).toBeLessThanOrEqual(3);
          
          // Exactly one temperature band should be true
          const bands = [context.isCold, context.isMild, context.isWarm, context.isHot];
          const trueCount = bands.filter(b => b).length;
          expect(trueCount).toBe(1);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
