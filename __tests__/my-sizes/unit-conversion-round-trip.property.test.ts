/**
 * Property-Based Test: Unit Conversion Round-Trip
 * 
 * **Property 21: Unit conversion round-trip**
 * For any measurement value, converting from imperial to metric and back to imperial 
 * (or vice versa) should produce a value within 1% of the original value (accounting for rounding).
 * 
 * **Validates: Requirements 13.3**
 * Feature: my-sizes
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { convertUnit } from '@/lib/utils/measurements';
import type { MeasurementUnit } from '@/lib/utils/measurements';

describe('Property 21: Unit Conversion Round-Trip', () => {
  /**
   * Property: Imperial to Metric to Imperial round-trip
   * For any positive measurement value in imperial units, converting to metric 
   * and back to imperial should produce a value within 1% of the original
   */
  it('should round-trip imperial → metric → imperial within 1% accuracy', () => {
    fc.assert(
      fc.property(
        fc.float({ 
          min: Math.fround(0.1), 
          max: Math.fround(1000), 
          noNaN: true,
          noDefaultInfinity: true
        }),
        (originalValue) => {
          // Convert imperial → metric → imperial
          const convertedToMetric = convertUnit(originalValue, 'imperial', 'metric');
          const roundTrip = convertUnit(convertedToMetric, 'metric', 'imperial');

          // Calculate percentage difference
          const percentDiff = Math.abs((roundTrip - originalValue) / originalValue);

          // Property: Round-trip should be within 1% of original
          expect(percentDiff).toBeLessThan(0.01);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Metric to Imperial to Metric round-trip
   * For any positive measurement value in metric units, converting to imperial 
   * and back to metric should produce a value within 1% of the original
   */
  it('should round-trip metric → imperial → metric within 1% accuracy', () => {
    fc.assert(
      fc.property(
        fc.float({ 
          min: Math.fround(0.1), 
          max: Math.fround(1000), 
          noNaN: true,
          noDefaultInfinity: true
        }),
        (originalValue) => {
          // Convert metric → imperial → metric
          const convertedToImperial = convertUnit(originalValue, 'metric', 'imperial');
          const roundTrip = convertUnit(convertedToImperial, 'imperial', 'metric');

          // Calculate percentage difference
          const percentDiff = Math.abs((roundTrip - originalValue) / originalValue);

          // Property: Round-trip should be within 1% of original
          expect(percentDiff).toBeLessThan(0.01);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Bidirectional round-trip consistency
   * For any measurement value and starting unit, a round-trip conversion 
   * should produce the same accuracy regardless of direction
   */
  it('should have consistent accuracy for both conversion directions', () => {
    fc.assert(
      fc.property(
        fc.record({
          value: fc.float({ 
            min: Math.fround(0.1), 
            max: Math.fround(1000), 
            noNaN: true,
            noDefaultInfinity: true
          }),
          startUnit: fc.constantFrom<MeasurementUnit>('imperial', 'metric')
        }),
        ({ value, startUnit }) => {
          const targetUnit: MeasurementUnit = startUnit === 'imperial' ? 'metric' : 'imperial';

          // Perform round-trip conversion
          const converted = convertUnit(value, startUnit, targetUnit);
          const roundTrip = convertUnit(converted, targetUnit, startUnit);

          // Calculate percentage difference
          const percentDiff = Math.abs((roundTrip - value) / value);

          // Property 1: Round-trip should be within 1% of original
          expect(percentDiff).toBeLessThan(0.01);

          // Property 2: Converted value should be different from original (unless units are same)
          if (startUnit !== targetUnit) {
            expect(converted).not.toBe(value);
          }

          // Property 3: Round-trip should be very close to original (within floating point precision)
          expect(roundTrip).toBeCloseTo(value, 10);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Multiple round-trips maintain accuracy
   * For any measurement value, performing multiple round-trip conversions 
   * should not accumulate significant error
   */
  it('should maintain accuracy across multiple round-trips', () => {
    fc.assert(
      fc.property(
        fc.record({
          value: fc.float({ 
            min: Math.fround(1), 
            max: Math.fround(100), 
            noNaN: true,
            noDefaultInfinity: true
          }),
          numRoundTrips: fc.integer({ min: 1, max: 5 })
        }),
        ({ value, numRoundTrips }) => {
          let currentValue = value;

          // Perform multiple round-trips
          for (let i = 0; i < numRoundTrips; i++) {
            const toMetric = convertUnit(currentValue, 'imperial', 'metric');
            currentValue = convertUnit(toMetric, 'metric', 'imperial');
          }

          // Calculate accumulated error
          const percentDiff = Math.abs((currentValue - value) / value);

          // Property: Even after multiple round-trips, error should be minimal
          // Allow slightly more tolerance for multiple conversions
          expect(percentDiff).toBeLessThan(0.01 * numRoundTrips);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Edge case values maintain accuracy
   * For edge case measurement values (very small, very large), 
   * round-trip conversion should still maintain accuracy
   */
  it('should handle edge case values with maintained accuracy', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Very small values
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true, noDefaultInfinity: true }),
          // Small values
          fc.float({ min: Math.fround(0.1), max: Math.fround(1), noNaN: true, noDefaultInfinity: true }),
          // Medium values
          fc.float({ min: Math.fround(10), max: Math.fround(100), noNaN: true, noDefaultInfinity: true }),
          // Large values
          fc.float({ min: Math.fround(100), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true })
        ),
        (value) => {
          // Test imperial → metric → imperial
          const toMetric = convertUnit(value, 'imperial', 'metric');
          const backToImperial = convertUnit(toMetric, 'metric', 'imperial');
          const percentDiff1 = Math.abs((backToImperial - value) / value);

          // Test metric → imperial → metric
          const toImperial = convertUnit(value, 'metric', 'imperial');
          const backToMetric = convertUnit(toImperial, 'imperial', 'metric');
          const percentDiff2 = Math.abs((backToMetric - value) / value);

          // Property: Both directions should maintain accuracy
          expect(percentDiff1).toBeLessThan(0.01);
          expect(percentDiff2).toBeLessThan(0.01);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Conversion preserves mathematical relationships
   * For any two measurement values where value1 < value2, 
   * the relationship should be preserved after round-trip conversion
   */
  it('should preserve ordering relationships after round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          value1: fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true, noDefaultInfinity: true }),
          value2: fc.float({ min: Math.fround(51), max: Math.fround(100), noNaN: true, noDefaultInfinity: true })
        }),
        ({ value1, value2 }) => {
          // Ensure value1 < value2
          expect(value1).toBeLessThan(value2);

          // Round-trip both values
          const roundTrip1 = convertUnit(
            convertUnit(value1, 'imperial', 'metric'),
            'metric',
            'imperial'
          );
          const roundTrip2 = convertUnit(
            convertUnit(value2, 'imperial', 'metric'),
            'metric',
            'imperial'
          );

          // Property: Ordering should be preserved
          expect(roundTrip1).toBeLessThan(roundTrip2);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Same unit conversion is identity
   * For any measurement value and unit, converting from a unit to itself 
   * should return the exact same value
   */
  it('should return identical value when converting to same unit', () => {
    fc.assert(
      fc.property(
        fc.record({
          value: fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true }),
          unit: fc.constantFrom<MeasurementUnit>('imperial', 'metric')
        }),
        ({ value, unit }) => {
          const result = convertUnit(value, unit, unit);

          // Property: Converting to same unit should be identity operation
          expect(result).toBe(value);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Conversion factor consistency
   * For any measurement value, the ratio between imperial and metric 
   * should be consistent with the conversion factor (2.54)
   */
  it('should maintain consistent conversion factor', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true, noDefaultInfinity: true }),
        (imperialValue) => {
          const metricValue = convertUnit(imperialValue, 'imperial', 'metric');

          // Property: Metric value should be imperial value * 2.54
          const expectedMetric = imperialValue * 2.54;
          expect(metricValue).toBeCloseTo(expectedMetric, 10);

          // Property: Ratio should be consistent
          const ratio = metricValue / imperialValue;
          expect(ratio).toBeCloseTo(2.54, 10);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
});
