/**
 * Property-Based Test: Sizing Format Validation
 * Feature: my-sizes
 * Property 6: Sizing format support
 * 
 * For any category with supported sizing formats, when a user enters a size
 * in any of the supported formats (letter, numeric, waist/inseam, or measurements),
 * the system should accept and store the value correctly.
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  isValidSizeFormat,
  isValidSize,
  detectSizeFormat,
  type SizeFormat
} from '@/lib/utils/size-validation';

describe('Property 6: Sizing format support', () => {
  // Generators for different size formats
  const letterSizeArb = fc.oneof(
    fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'),
    fc.constantFrom('2XL', '3XL', '4XL', '5XL'),
    fc.constantFrom('XXS', 'XS')
  );

  const numericSizeArb = fc.oneof(
    fc.integer({ min: 0, max: 99 }).map(n => n.toString()),
    fc.integer({ min: 0, max: 98 }).map(n => `${n}.5`)
  );

  const waistInseamSizeArb = fc.record({
    waist: fc.integer({ min: 10, max: 99 }),
    inseam: fc.integer({ min: 20, max: 40 })
  }).map(({ waist, inseam }) => `${waist}x${inseam}`);

  it('should accept valid letter sizes', () => {
    fc.assert(
      fc.property(letterSizeArb, (size) => {
        const result = isValidSizeFormat(size, 'letter');
        expect(result).toBe(true);
        return true;
      }),
      { numRuns: 5 }
    );
  });

  it('should accept valid numeric sizes', () => {
    fc.assert(
      fc.property(numericSizeArb, (size) => {
        const result = isValidSizeFormat(size, 'numeric');
        expect(result).toBe(true);
        return true;
      }),
      { numRuns: 5 }
    );
  });

  it('should accept valid waist/inseam sizes', () => {
    fc.assert(
      fc.property(waistInseamSizeArb, (size) => {
        const result = isValidSizeFormat(size, 'waist-inseam');
        expect(result).toBe(true);
        return true;
      }),
      { numRuns: 5 }
    );
  });

  it('should accept sizes in any supported format', () => {
    const sizeArb = fc.oneof(
      letterSizeArb.map(s => ({ size: s, format: 'letter' as SizeFormat })),
      numericSizeArb.map(s => ({ size: s, format: 'numeric' as SizeFormat })),
      waistInseamSizeArb.map(s => ({ size: s, format: 'waist-inseam' as SizeFormat }))
    );

    fc.assert(
      fc.property(sizeArb, ({ size, format }) => {
        const supportedFormats = [format];
        const result = isValidSize(size, supportedFormats);
        expect(result).toBe(true);
        return true;
      }),
      { numRuns: 5 }
    );
  });

  it('should correctly detect size format', () => {
    const sizeArb = fc.oneof(
      letterSizeArb.map(s => ({ size: s, expectedFormat: 'letter' as SizeFormat })),
      numericSizeArb.map(s => ({ size: s, expectedFormat: 'numeric' as SizeFormat })),
      waistInseamSizeArb.map(s => ({ size: s, expectedFormat: 'waist-inseam' as SizeFormat }))
    );

    fc.assert(
      fc.property(sizeArb, ({ size, expectedFormat }) => {
        const detectedFormat = detectSizeFormat(size);
        expect(detectedFormat).toBe(expectedFormat);
        return true;
      }),
      { numRuns: 5 }
    );
  });

  it('should accept sizes when multiple formats are supported', () => {
    const allFormats: SizeFormat[] = ['letter', 'numeric', 'waist-inseam'];
    const sizeArb = fc.oneof(letterSizeArb, numericSizeArb, waistInseamSizeArb);

    fc.assert(
      fc.property(sizeArb, (size) => {
        const result = isValidSize(size, allFormats);
        expect(result).toBe(true);
        return true;
      }),
      { numRuns: 5 }
    );
  });

  it('should reject sizes not in supported formats', () => {
    const invalidSizeArb = fc.oneof(
      fc.constant('invalid'),
      fc.constant('123abc'),
      fc.constant('x'),
      fc.constant('100x50'), // inseam too large
      fc.constant('5x10') // waist too small
    );

    fc.assert(
      fc.property(invalidSizeArb, (size) => {
        const supportedFormats: SizeFormat[] = ['letter', 'numeric', 'waist-inseam'];
        const result = isValidSize(size, supportedFormats);
        expect(result).toBe(false);
        return true;
      }),
      { numRuns: 5 }
    );
  });

  it('should handle case-insensitive letter sizes', () => {
    const letterSizeWithCaseArb = fc.oneof(
      fc.constantFrom('xs', 'XS', 'Xs', 'xS'),
      fc.constantFrom('m', 'M'),
      fc.constantFrom('xl', 'XL', 'Xl', 'xL')
    );

    fc.assert(
      fc.property(letterSizeWithCaseArb, (size) => {
        const result = isValidSizeFormat(size, 'letter');
        expect(result).toBe(true);
        return true;
      }),
      { numRuns: 5 }
    );
  });

  it('should handle waist/inseam with different separators', () => {
    const waistInseamWithSeparatorArb = fc.record({
      waist: fc.integer({ min: 10, max: 99 }),
      inseam: fc.integer({ min: 20, max: 40 }),
      separator: fc.constantFrom('x', 'X')
    }).map(({ waist, inseam, separator }) => `${waist}${separator}${inseam}`);

    fc.assert(
      fc.property(waistInseamWithSeparatorArb, (size) => {
        const result = isValidSizeFormat(size, 'waist-inseam');
        expect(result).toBe(true);
        return true;
      }),
      { numRuns: 5 }
    );
  });
});
