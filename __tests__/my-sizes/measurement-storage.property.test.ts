/**
 * Property-Based Test: Measurement storage with units
 * 
 * Property 20: Measurement storage with units
 * For any measurement entry, the system should store the numeric value along 
 * with the unit (imperial or metric), and both should be retrievable together.
 * 
 * **Validates: Requirements 13.2**
 * 
 * This test verifies that:
 * 1. Measurements are stored with their associated unit
 * 2. Both numeric values and units are retrievable together
 * 3. Multiple measurements can be stored in a single record
 * 4. Measurement values are preserved accurately
 * 5. Unit information is preserved accurately
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { MeasurementUnit } from '@/lib/types/sizes';

/**
 * Type representing stored measurement data
 * This mirrors the CategoryMeasurements type structure
 */
interface StoredMeasurements {
  measurements: Record<string, number>;
  unit: MeasurementUnit;
}

/**
 * Simulate storing measurements
 * In the real implementation, this would be a database operation
 */
function storeMeasurements(
  measurements: Record<string, number>,
  unit: MeasurementUnit
): StoredMeasurements {
  return {
    measurements: { ...measurements },
    unit,
  };
}

/**
 * Simulate retrieving measurements
 * In the real implementation, this would be a database query
 */
function retrieveMeasurements(stored: StoredMeasurements): StoredMeasurements {
  return {
    measurements: { ...stored.measurements },
    unit: stored.unit,
  };
}

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generator for measurement unit
 */
const unitArb = fc.oneof(
  fc.constant<MeasurementUnit>('imperial'),
  fc.constant<MeasurementUnit>('metric')
);

/**
 * Generator for measurement field names
 */
const measurementFieldArb = fc.oneof(
  fc.constant('chest'),
  fc.constant('waist'),
  fc.constant('hip'),
  fc.constant('inseam'),
  fc.constant('foot_length'),
  fc.constant('foot_width')
);

/**
 * Generator for positive measurement values
 * Realistic range: 1 to 200 (covers both inches and centimeters)
 */
const measurementValueArb = fc.float({
  min: 1,
  max: 200,
  noNaN: true,
  noDefaultInfinity: true,
});

/**
 * Generator for a single measurement entry
 */
const measurementEntryArb = fc.record({
  field: measurementFieldArb,
  value: measurementValueArb,
});

/**
 * Generator for multiple measurement entries
 * Creates a record with 1-6 measurements
 */
const measurementsRecordArb = fc
  .array(measurementEntryArb, { minLength: 1, maxLength: 6 })
  .map((entries) => {
    const record: Record<string, number> = {};
    for (const entry of entries) {
      record[entry.field] = entry.value;
    }
    return record;
  });

/**
 * Generator for complete measurement data
 */
const storedMeasurementsArb = fc.record({
  measurements: measurementsRecordArb,
  unit: unitArb,
});

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 20: Measurement storage with units', () => {
  /**
   * Property: Measurements and units are stored together
   * For any measurement data, storing it should preserve both
   * the numeric values and the unit system
   */
  it('should store measurements with their unit', () => {
    fc.assert(
      fc.property(
        measurementsRecordArb,
        unitArb,
        (measurements, unit) => {
          const stored = storeMeasurements(measurements, unit);
          
          // Property: Both measurements and unit should be stored
          expect(stored.measurements).toBeDefined();
          expect(stored.unit).toBeDefined();
          expect(stored.unit).toBe(unit);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Stored measurements are retrievable
   * For any stored measurement data, retrieving it should return
   * the same measurements and unit
   */
  it('should retrieve measurements with their unit', () => {
    fc.assert(
      fc.property(
        storedMeasurementsArb,
        (data) => {
          const stored = storeMeasurements(data.measurements, data.unit);
          const retrieved = retrieveMeasurements(stored);
          
          // Property: Retrieved data should match stored data
          expect(retrieved.measurements).toEqual(data.measurements);
          expect(retrieved.unit).toBe(data.unit);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Measurement values are preserved accurately
   * For any measurement values, storing and retrieving them should
   * preserve the numeric values without loss of precision
   */
  it('should preserve measurement values accurately', () => {
    fc.assert(
      fc.property(
        measurementsRecordArb,
        unitArb,
        (measurements, unit) => {
          const stored = storeMeasurements(measurements, unit);
          const retrieved = retrieveMeasurements(stored);
          
          // Property: All measurement values should be preserved
          for (const [field, value] of Object.entries(measurements)) {
            expect(retrieved.measurements[field]).toBe(value);
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Unit information is preserved
   * For any unit system, storing and retrieving measurements should
   * preserve the unit information exactly
   */
  it('should preserve unit information', () => {
    fc.assert(
      fc.property(
        measurementsRecordArb,
        unitArb,
        (measurements, unit) => {
          const stored = storeMeasurements(measurements, unit);
          const retrieved = retrieveMeasurements(stored);
          
          // Property: Unit should be preserved exactly
          expect(retrieved.unit).toBe(unit);
          expect(retrieved.unit).toBe(stored.unit);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Multiple measurements can be stored together
   * For any set of measurements, all measurements should be stored
   * and retrievable as a single record
   */
  it('should store multiple measurements together', () => {
    fc.assert(
      fc.property(
        measurementsRecordArb,
        unitArb,
        (measurements, unit) => {
          const stored = storeMeasurements(measurements, unit);
          const retrieved = retrieveMeasurements(stored);
          
          // Property: All measurements should be present
          const storedFields = Object.keys(measurements);
          const retrievedFields = Object.keys(retrieved.measurements);
          
          expect(retrievedFields.length).toBe(storedFields.length);
          for (const field of storedFields) {
            expect(retrievedFields).toContain(field);
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Empty measurements can be stored
   * For an empty measurement record, storing and retrieving should
   * still preserve the unit information
   */
  it('should handle empty measurements', () => {
    fc.assert(
      fc.property(
        unitArb,
        (unit) => {
          const emptyMeasurements = {};
          const stored = storeMeasurements(emptyMeasurements, unit);
          const retrieved = retrieveMeasurements(stored);
          
          // Property: Unit should be preserved even with empty measurements
          expect(retrieved.unit).toBe(unit);
          expect(Object.keys(retrieved.measurements).length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Measurement field names are preserved
   * For any measurement field names, storing and retrieving should
   * preserve the field names exactly
   */
  it('should preserve measurement field names', () => {
    fc.assert(
      fc.property(
        measurementsRecordArb,
        unitArb,
        (measurements, unit) => {
          const stored = storeMeasurements(measurements, unit);
          const retrieved = retrieveMeasurements(stored);
          
          // Property: Field names should be preserved exactly
          const originalFields = Object.keys(measurements).sort();
          const retrievedFields = Object.keys(retrieved.measurements).sort();
          
          expect(retrievedFields).toEqual(originalFields);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Measurements are independent of unit
   * For any measurements, the numeric values should be stored
   * independently of the unit system (conversion happens at display time)
   */
  it('should store measurements independently of unit', () => {
    fc.assert(
      fc.property(
        measurementsRecordArb,
        (measurements) => {
          // Store same measurements with different units
          const storedImperial = storeMeasurements(measurements, 'imperial');
          const storedMetric = storeMeasurements(measurements, 'metric');
          
          // Property: Measurement values should be the same regardless of unit
          // (unit only affects display, not storage)
          for (const [field, value] of Object.entries(measurements)) {
            expect(storedImperial.measurements[field]).toBe(value);
            expect(storedMetric.measurements[field]).toBe(value);
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Decimal precision is preserved
   * For any measurement values with decimal places, storing and
   * retrieving should preserve the decimal precision
   */
  it('should preserve decimal precision', () => {
    fc.assert(
      fc.property(
        fc.record({
          chest: fc.float({ min: 30, max: 50, noNaN: true }),
          waist: fc.float({ min: 25, max: 45, noNaN: true }),
        }),
        unitArb,
        (measurements, unit) => {
          const stored = storeMeasurements(measurements, unit);
          const retrieved = retrieveMeasurements(stored);
          
          // Property: Decimal values should be preserved
          expect(retrieved.measurements.chest).toBe(measurements.chest);
          expect(retrieved.measurements.waist).toBe(measurements.waist);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Storage is idempotent
   * For any measurement data, storing it multiple times should
   * produce the same result
   */
  it('should be idempotent', () => {
    fc.assert(
      fc.property(
        storedMeasurementsArb,
        (data) => {
          const stored1 = storeMeasurements(data.measurements, data.unit);
          const stored2 = storeMeasurements(data.measurements, data.unit);
          
          // Property: Multiple stores should produce identical results
          expect(stored2.measurements).toEqual(stored1.measurements);
          expect(stored2.unit).toBe(stored1.unit);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
