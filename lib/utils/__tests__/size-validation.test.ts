import { describe, it, expect } from 'vitest';
import {
  isValidLetterSize,
  isValidNumericSize,
  isValidWaistInseamSize,
  isValidSizeFormat,
  isValidSize,
  detectSizeFormat,
  getSizeFormatErrorMessage
} from '../size-validation';

describe('Size Validation Utilities', () => {
  describe('isValidLetterSize', () => {
    it('should validate standard letter sizes', () => {
      expect(isValidLetterSize('XS')).toBe(true);
      expect(isValidLetterSize('S')).toBe(true);
      expect(isValidLetterSize('M')).toBe(true);
      expect(isValidLetterSize('L')).toBe(true);
      expect(isValidLetterSize('XL')).toBe(true);
      expect(isValidLetterSize('XXL')).toBe(true);
      expect(isValidLetterSize('XXXL')).toBe(true);
    });

    it('should validate numeric XL sizes', () => {
      expect(isValidLetterSize('2XL')).toBe(true);
      expect(isValidLetterSize('3XL')).toBe(true);
      expect(isValidLetterSize('4XL')).toBe(true);
      expect(isValidLetterSize('5XL')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isValidLetterSize('xs')).toBe(true);
      expect(isValidLetterSize('Xl')).toBe(true);
      expect(isValidLetterSize('xxl')).toBe(true);
    });

    it('should reject invalid letter sizes', () => {
      expect(isValidLetterSize('A')).toBe(false);
      expect(isValidLetterSize('XM')).toBe(false);
      expect(isValidLetterSize('6XL')).toBe(false);
      expect(isValidLetterSize('')).toBe(false);
    });
  });

  describe('isValidNumericSize', () => {
    it('should validate whole number sizes', () => {
      expect(isValidNumericSize('2')).toBe(true);
      expect(isValidNumericSize('8')).toBe(true);
      expect(isValidNumericSize('10')).toBe(true);
      expect(isValidNumericSize('32')).toBe(true);
    });

    it('should validate half sizes', () => {
      expect(isValidNumericSize('8.5')).toBe(true);
      expect(isValidNumericSize('10.5')).toBe(true);
    });

    it('should reject invalid numeric sizes', () => {
      expect(isValidNumericSize('100')).toBe(false);
      expect(isValidNumericSize('8.25')).toBe(false);
      expect(isValidNumericSize('abc')).toBe(false);
      expect(isValidNumericSize('')).toBe(false);
    });
  });

  describe('isValidWaistInseamSize', () => {
    it('should validate waist/inseam format', () => {
      expect(isValidWaistInseamSize('32x34')).toBe(true);
      expect(isValidWaistInseamSize('30x32')).toBe(true);
      expect(isValidWaistInseamSize('34X36')).toBe(true);
    });

    it('should reject invalid waist/inseam format', () => {
      expect(isValidWaistInseamSize('32-34')).toBe(false);
      expect(isValidWaistInseamSize('32')).toBe(false);
      expect(isValidWaistInseamSize('5x50')).toBe(false); // waist too small
      expect(isValidWaistInseamSize('32x10')).toBe(false); // inseam too small
      expect(isValidWaistInseamSize('')).toBe(false);
    });
  });

  describe('isValidSizeFormat', () => {
    it('should validate based on format type', () => {
      expect(isValidSizeFormat('M', 'letter')).toBe(true);
      expect(isValidSizeFormat('10', 'numeric')).toBe(true);
      expect(isValidSizeFormat('32x34', 'waist-inseam')).toBe(true);
      expect(isValidSizeFormat('anything', 'measurements')).toBe(true);
    });

    it('should reject mismatched formats', () => {
      expect(isValidSizeFormat('M', 'numeric')).toBe(false);
      expect(isValidSizeFormat('10', 'letter')).toBe(false);
      expect(isValidSizeFormat('32x34', 'letter')).toBe(false);
    });
  });

  describe('isValidSize', () => {
    it('should validate against multiple formats', () => {
      expect(isValidSize('M', ['letter', 'numeric'])).toBe(true);
      expect(isValidSize('10', ['letter', 'numeric'])).toBe(true);
      expect(isValidSize('32x34', ['waist-inseam'])).toBe(true);
    });

    it('should reject if no formats match', () => {
      expect(isValidSize('invalid', ['letter', 'numeric'])).toBe(false);
      expect(isValidSize('', ['letter'])).toBe(false);
    });
  });

  describe('detectSizeFormat', () => {
    it('should detect letter sizes', () => {
      expect(detectSizeFormat('M')).toBe('letter');
      expect(detectSizeFormat('XL')).toBe('letter');
    });

    it('should detect numeric sizes', () => {
      expect(detectSizeFormat('10')).toBe('numeric');
      expect(detectSizeFormat('8.5')).toBe('numeric');
    });

    it('should detect waist/inseam sizes', () => {
      expect(detectSizeFormat('32x34')).toBe('waist-inseam');
    });

    it('should return null for invalid formats', () => {
      expect(detectSizeFormat('invalid')).toBe(null);
      expect(detectSizeFormat('')).toBe(null);
    });
  });

  describe('getSizeFormatErrorMessage', () => {
    it('should generate error message with supported formats', () => {
      const message = getSizeFormatErrorMessage(['letter', 'numeric']);
      expect(message).toContain('letter sizes');
      expect(message).toContain('numeric sizes');
    });

    it('should handle single format', () => {
      const message = getSizeFormatErrorMessage(['waist-inseam']);
      expect(message).toContain('waist/inseam');
    });
  });
});
