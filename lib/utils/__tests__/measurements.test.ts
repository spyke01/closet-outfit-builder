import { describe, it, expect } from 'vitest';
import { convertUnit, formatMeasurement } from '../measurements';

describe('Measurement Utilities', () => {
  describe('convertUnit', () => {
    it('should convert inches to centimeters', () => {
      expect(convertUnit(10, 'imperial', 'metric')).toBe(25.4);
      expect(convertUnit(1, 'imperial', 'metric')).toBe(2.54);
    });

    it('should convert centimeters to inches', () => {
      expect(convertUnit(25.4, 'metric', 'imperial')).toBe(10);
      expect(convertUnit(2.54, 'metric', 'imperial')).toBe(1);
    });

    it('should return same value when units are the same', () => {
      expect(convertUnit(10, 'imperial', 'imperial')).toBe(10);
      expect(convertUnit(25.4, 'metric', 'metric')).toBe(25.4);
    });

    it('should handle decimal values', () => {
      const result = convertUnit(10.5, 'imperial', 'metric');
      expect(result).toBeCloseTo(26.67, 1);
    });
  });

  describe('formatMeasurement', () => {
    it('should format imperial measurements', () => {
      expect(formatMeasurement(10, 'imperial')).toBe('10 in');
      expect(formatMeasurement(10.5, 'imperial')).toBe('10.5 in');
    });

    it('should format metric measurements', () => {
      expect(formatMeasurement(25.4, 'metric')).toBe('25.4 cm');
      expect(formatMeasurement(100, 'metric')).toBe('100 cm');
    });

    it('should round to 1 decimal place', () => {
      expect(formatMeasurement(10.456, 'imperial')).toBe('10.5 in');
      expect(formatMeasurement(25.444, 'metric')).toBe('25.4 cm');
    });
  });
});
