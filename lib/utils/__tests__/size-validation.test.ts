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
      expect(isValidLetterSize('m')).toBe(true);
      expect(isValidLetterSize('2xl')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(isValidLetterSize(' M ')).toBe(true);
      expect(isValidLetterSize('  XL  ')).toBe(true);
      expect(isValidLetterSize('\tS\t')).toBe(true);
    });

    it('should reject invalid letter sizes', () => {
      expect(isValidLetterSize('A')).toBe(false);
      expect(isValidLetterSize('XM')).toBe(false);
      expect(isValidLetterSize('6XL')).toBe(false);
      expect(isValidLetterSize('')).toBe(false);
      expect(isValidLetterSize('ML')).toBe(false);
      expect(isValidLetterSize('LS')).toBe(false);
      expect(isValidLetterSize('1XL')).toBe(false);
      expect(isValidLetterSize('0XL')).toBe(false);
    });

    it('should reject null and undefined inputs', () => {
      expect(isValidLetterSize(null as any)).toBe(false);
      expect(isValidLetterSize(undefined as any)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(isValidLetterSize(123 as any)).toBe(false);
      expect(isValidLetterSize({} as any)).toBe(false);
      expect(isValidLetterSize([] as any)).toBe(false);
    });
  });

  describe('isValidNumericSize', () => {
    it('should validate whole number sizes', () => {
      expect(isValidNumericSize('2')).toBe(true);
      expect(isValidNumericSize('8')).toBe(true);
      expect(isValidNumericSize('10')).toBe(true);
      expect(isValidNumericSize('32')).toBe(true);
      expect(isValidNumericSize('0')).toBe(true);
      expect(isValidNumericSize('99')).toBe(true);
    });

    it('should validate half sizes', () => {
      expect(isValidNumericSize('8.5')).toBe(true);
      expect(isValidNumericSize('10.5')).toBe(true);
      expect(isValidNumericSize('0.5')).toBe(true);
      expect(isValidNumericSize('98.5')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(isValidNumericSize(' 10 ')).toBe(true);
      expect(isValidNumericSize('  8.5  ')).toBe(true);
    });

    it('should reject invalid numeric sizes', () => {
      expect(isValidNumericSize('100')).toBe(false);
      expect(isValidNumericSize('8.25')).toBe(false);
      expect(isValidNumericSize('abc')).toBe(false);
      expect(isValidNumericSize('')).toBe(false);
      expect(isValidNumericSize('-5')).toBe(false);
      expect(isValidNumericSize('10.5.5')).toBe(false);
      expect(isValidNumericSize('1e2')).toBe(false);
    });

    it('should reject boundary violations', () => {
      expect(isValidNumericSize('100')).toBe(false);
      expect(isValidNumericSize('999')).toBe(false);
      expect(isValidNumericSize('-1')).toBe(false);
    });

    it('should reject null and undefined inputs', () => {
      expect(isValidNumericSize(null as any)).toBe(false);
      expect(isValidNumericSize(undefined as any)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(isValidNumericSize(10 as any)).toBe(false);
      expect(isValidNumericSize({} as any)).toBe(false);
      expect(isValidNumericSize([] as any)).toBe(false);
    });
  });

  describe('isValidWaistInseamSize', () => {
    it('should validate waist/inseam format', () => {
      expect(isValidWaistInseamSize('32x34')).toBe(true);
      expect(isValidWaistInseamSize('30x32')).toBe(true);
      expect(isValidWaistInseamSize('34X36')).toBe(true);
      expect(isValidWaistInseamSize('28x30')).toBe(true);
      expect(isValidWaistInseamSize('40x32')).toBe(true);
    });

    it('should be case insensitive for separator', () => {
      expect(isValidWaistInseamSize('32x34')).toBe(true);
      expect(isValidWaistInseamSize('32X34')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(isValidWaistInseamSize(' 32x34 ')).toBe(true);
      expect(isValidWaistInseamSize('  30x32  ')).toBe(true);
    });

    it('should validate boundary values', () => {
      expect(isValidWaistInseamSize('10x20')).toBe(true); // minimum valid
      expect(isValidWaistInseamSize('99x40')).toBe(true); // maximum valid
    });

    it('should reject invalid waist/inseam format', () => {
      expect(isValidWaistInseamSize('32-34')).toBe(false);
      expect(isValidWaistInseamSize('32')).toBe(false);
      expect(isValidWaistInseamSize('5x50')).toBe(false); // waist too small
      expect(isValidWaistInseamSize('32x10')).toBe(false); // inseam too small
      expect(isValidWaistInseamSize('')).toBe(false);
      expect(isValidWaistInseamSize('32x41')).toBe(false); // inseam too large
      expect(isValidWaistInseamSize('100x32')).toBe(false); // waist too large
      expect(isValidWaistInseamSize('9x30')).toBe(false); // waist too small
      expect(isValidWaistInseamSize('32x19')).toBe(false); // inseam too small
    });

    it('should reject malformed formats', () => {
      expect(isValidWaistInseamSize('32 x 34')).toBe(false); // spaces
      expect(isValidWaistInseamSize('32/34')).toBe(false); // wrong separator
      expect(isValidWaistInseamSize('x34')).toBe(false); // missing waist
      expect(isValidWaistInseamSize('32x')).toBe(false); // missing inseam
      expect(isValidWaistInseamSize('abcxdef')).toBe(false); // non-numeric
    });

    it('should reject null and undefined inputs', () => {
      expect(isValidWaistInseamSize(null as any)).toBe(false);
      expect(isValidWaistInseamSize(undefined as any)).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(isValidWaistInseamSize(32 as any)).toBe(false);
      expect(isValidWaistInseamSize({} as any)).toBe(false);
      expect(isValidWaistInseamSize([] as any)).toBe(false);
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
      expect(isValidSizeFormat('XL', 'waist-inseam')).toBe(false);
      expect(isValidSizeFormat('abc', 'numeric')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidSizeFormat('', 'letter')).toBe(false);
      expect(isValidSizeFormat('', 'numeric')).toBe(false);
      expect(isValidSizeFormat('', 'waist-inseam')).toBe(false);
    });

    it('should always accept measurements format', () => {
      expect(isValidSizeFormat('', 'measurements')).toBe(true);
      expect(isValidSizeFormat('any string', 'measurements')).toBe(true);
      expect(isValidSizeFormat('123', 'measurements')).toBe(true);
    });
  });

  describe('isValidSize', () => {
    it('should validate against multiple formats', () => {
      expect(isValidSize('M', ['letter', 'numeric'])).toBe(true);
      expect(isValidSize('10', ['letter', 'numeric'])).toBe(true);
      expect(isValidSize('32x34', ['waist-inseam'])).toBe(true);
      expect(isValidSize('XL', ['letter', 'numeric', 'waist-inseam'])).toBe(true);
    });

    it('should reject if no formats match', () => {
      expect(isValidSize('invalid', ['letter', 'numeric'])).toBe(false);
      expect(isValidSize('', ['letter'])).toBe(false);
      expect(isValidSize('abc', ['numeric', 'waist-inseam'])).toBe(false);
    });

    it('should handle empty supported formats array', () => {
      expect(isValidSize('M', [])).toBe(false);
      expect(isValidSize('10', [])).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      expect(isValidSize('', ['letter'])).toBe(false);
      expect(isValidSize(null as any, ['letter'])).toBe(false);
      expect(isValidSize(undefined as any, ['letter'])).toBe(false);
      expect(isValidSize('M', null as any)).toBe(false);
      expect(isValidSize('M', undefined as any)).toBe(false);
    });

    it('should match first valid format', () => {
      // '10' could be numeric or part of a letter size, should match numeric first
      expect(isValidSize('10', ['numeric', 'letter'])).toBe(true);
      expect(isValidSize('M', ['letter', 'numeric'])).toBe(true);
    });
  });

  describe('detectSizeFormat', () => {
    it('should detect letter sizes', () => {
      expect(detectSizeFormat('M')).toBe('letter');
      expect(detectSizeFormat('XL')).toBe('letter');
      expect(detectSizeFormat('xs')).toBe('letter');
      expect(detectSizeFormat('2XL')).toBe('letter');
    });

    it('should detect numeric sizes', () => {
      expect(detectSizeFormat('10')).toBe('numeric');
      expect(detectSizeFormat('8.5')).toBe('numeric');
      expect(detectSizeFormat('0')).toBe('numeric');
      expect(detectSizeFormat('99')).toBe('numeric');
    });

    it('should detect waist/inseam sizes', () => {
      expect(detectSizeFormat('32x34')).toBe('waist-inseam');
      expect(detectSizeFormat('30X32')).toBe('waist-inseam');
    });

    it('should return null for invalid formats', () => {
      expect(detectSizeFormat('invalid')).toBe(null);
      expect(detectSizeFormat('')).toBe(null);
      expect(detectSizeFormat('abc123')).toBe(null);
      expect(detectSizeFormat('100')).toBe(null); // out of range
      expect(detectSizeFormat('6XL')).toBe(null); // invalid letter size
    });

    it('should handle null and undefined inputs', () => {
      expect(detectSizeFormat(null as any)).toBe(null);
      expect(detectSizeFormat(undefined as any)).toBe(null);
    });

    it('should prioritize format detection correctly', () => {
      // When a size could match multiple formats, it should return the first match
      // based on the order: letter -> numeric -> waist-inseam
      expect(detectSizeFormat('M')).toBe('letter');
      expect(detectSizeFormat('10')).toBe('numeric');
      expect(detectSizeFormat('32x34')).toBe('waist-inseam');
    });
  });

  describe('getSizeFormatErrorMessage', () => {
    it('should generate error message with supported formats', () => {
      const message = getSizeFormatErrorMessage(['letter', 'numeric']);
      expect(message).toContain('letter sizes');
      expect(message).toContain('numeric sizes');
      expect(message).toContain('Please enter a valid size format');
    });

    it('should handle single format', () => {
      const message = getSizeFormatErrorMessage(['waist-inseam']);
      expect(message).toContain('waist/inseam');
      expect(message).toContain('Please enter a valid size format');
    });

    it('should handle all formats', () => {
      const message = getSizeFormatErrorMessage(['letter', 'numeric', 'waist-inseam', 'measurements']);
      expect(message).toContain('letter sizes');
      expect(message).toContain('numeric sizes');
      expect(message).toContain('waist/inseam');
      expect(message).toContain('custom measurements');
    });

    it('should handle empty formats array', () => {
      const message = getSizeFormatErrorMessage([]);
      expect(message).toContain('Please enter a valid size format');
    });

    it('should include examples in message', () => {
      const message = getSizeFormatErrorMessage(['letter']);
      expect(message).toContain('e.g., S, M, L, XL');
    });
  });
});
