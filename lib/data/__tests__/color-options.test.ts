import { describe, it, expect } from 'vitest';
import {
  COLOR_OPTIONS,
  getColorOptions,
  getValidColorValues,
  isValidColor,
  normalizeColor,
  getColorOption,
  isColorKeyword,
} from '../color-options';

describe('color-options', () => {
  describe('COLOR_OPTIONS', () => {
    it('should include all COLOR_KEYWORDS colors', () => {
      const colorKeywords = [
        'black', 'white', 'grey', 'navy', 'blue',
        'cream', 'khaki', 'brown', 'tan', 'green', 'red',
        'burgundy', 'olive', 'charcoal'
      ];
      
      const colorValues = COLOR_OPTIONS.map(opt => opt.value);
      
      colorKeywords.forEach(keyword => {
        expect(colorValues).toContain(keyword);
      });
    });

    it('should include Unspecified option with empty string value', () => {
      const unspecified = COLOR_OPTIONS.find(opt => opt.label === 'Unspecified');
      
      expect(unspecified).toBeDefined();
      expect(unspecified?.value).toBe('');
      expect(unspecified?.hex).toBeNull();
    });

    it('should have unique values', () => {
      const values = COLOR_OPTIONS.map(opt => opt.value);
      const uniqueValues = new Set(values);
      
      expect(values.length).toBe(uniqueValues.size);
    });

    it('should have all required properties', () => {
      COLOR_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('hex');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
      });
    });
  });

  describe('getColorOptions', () => {
    it('should return all COLOR_OPTIONS', () => {
      const options = getColorOptions();
      
      expect(options).toEqual(COLOR_OPTIONS);
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('getValidColorValues', () => {
    it('should return all color values except empty string', () => {
      const values = getValidColorValues();
      
      expect(values).not.toContain('');
      expect(values).toContain('black');
      expect(values).toContain('white');
      expect(values).toContain('navy');
    });

    it('should return array with length one less than COLOR_OPTIONS', () => {
      const values = getValidColorValues();
      
      // One less because we exclude the empty string option
      expect(values.length).toBe(COLOR_OPTIONS.length - 1);
    });
  });

  describe('isValidColor', () => {
    it('should return true for valid colors from COLOR_OPTIONS', () => {
      expect(isValidColor('black')).toBe(true);
      expect(isValidColor('white')).toBe(true);
      expect(isValidColor('navy')).toBe(true);
      expect(isValidColor('burgundy')).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isValidColor('')).toBe(true);
    });

    it('should return true for null', () => {
      expect(isValidColor(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isValidColor(undefined)).toBe(true);
    });

    it('should return false for invalid colors', () => {
      expect(isValidColor('invalid')).toBe(false);
      expect(isValidColor('notacolor')).toBe(false);
      expect(isValidColor('INVALID')).toBe(false);
    });

    it('should be case-sensitive', () => {
      // Color values should be lowercase in storage
      expect(isValidColor('Black')).toBe(false);
      expect(isValidColor('NAVY')).toBe(false);
    });
  });

  describe('normalizeColor', () => {
    it('should trim whitespace', () => {
      expect(normalizeColor('  black  ')).toBe('black');
      expect(normalizeColor('navy   ')).toBe('navy');
      expect(normalizeColor('   white')).toBe('white');
    });

    it('should convert to lowercase', () => {
      expect(normalizeColor('Black')).toBe('black');
      expect(normalizeColor('NAVY')).toBe('navy');
      expect(normalizeColor('BuRgUnDy')).toBe('burgundy');
    });

    it('should handle null and undefined', () => {
      expect(normalizeColor(null)).toBe('');
      expect(normalizeColor(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(normalizeColor('')).toBe('');
    });

    it('should trim and lowercase together', () => {
      expect(normalizeColor('  BLACK  ')).toBe('black');
      expect(normalizeColor('  Navy   ')).toBe('navy');
    });
  });

  describe('getColorOption', () => {
    it('should return color option for valid value', () => {
      const blackOption = getColorOption('black');
      
      expect(blackOption).toBeDefined();
      expect(blackOption?.value).toBe('black');
      expect(blackOption?.label).toBe('Black');
      expect(blackOption?.hex).toBe('#000000');
    });

    it('should return undefined for invalid value', () => {
      const invalid = getColorOption('invalid');
      
      expect(invalid).toBeUndefined();
    });

    it('should return Unspecified option for empty string', () => {
      const unspecified = getColorOption('');
      
      expect(unspecified).toBeDefined();
      expect(unspecified?.label).toBe('Unspecified');
      expect(unspecified?.hex).toBeNull();
    });
  });

  describe('isColorKeyword', () => {
    it('should return true for original COLOR_KEYWORDS colors', () => {
      const keywords = [
        'black', 'white', 'grey', 'navy', 'blue',
        'cream', 'khaki', 'brown', 'tan', 'green', 'red',
        'burgundy', 'olive', 'charcoal'
      ];
      
      keywords.forEach(keyword => {
        expect(isColorKeyword(keyword)).toBe(true);
      });
    });

    it('should return false for extended colors not in COLOR_KEYWORDS', () => {
      expect(isColorKeyword('light-blue')).toBe(false);
      expect(isColorKeyword('sky-blue')).toBe(false);
      expect(isColorKeyword('teal')).toBe(false);
      expect(isColorKeyword('camel')).toBe(false);
      expect(isColorKeyword('forest')).toBe(false);
    });

    it('should return false for invalid colors', () => {
      expect(isColorKeyword('invalid')).toBe(false);
      expect(isColorKeyword('')).toBe(false);
    });
  });

  describe('Requirements validation', () => {
    it('should satisfy Requirement 1.3: Include all COLOR_KEYWORDS', () => {
      const colorKeywords = [
        'black', 'white', 'grey', 'navy', 'blue',
        'cream', 'khaki', 'brown', 'tan', 'green', 'red',
        'burgundy', 'olive', 'charcoal'
      ];
      
      const colorValues = COLOR_OPTIONS.map(opt => opt.value);
      
      colorKeywords.forEach(keyword => {
        expect(colorValues, `COLOR_OPTIONS should include ${keyword}`).toContain(keyword);
      });
    });

    it('should satisfy Requirement 1.4: Include Unspecified option', () => {
      const unspecified = COLOR_OPTIONS.find(opt => opt.value === '');
      
      expect(unspecified, 'Should have Unspecified option').toBeDefined();
      expect(unspecified?.label).toBe('Unspecified');
    });

    it('should satisfy Requirement 4.4: Trim whitespace', () => {
      const normalized = normalizeColor('  black  ');
      
      expect(normalized).toBe('black');
      expect(normalized).not.toContain(' ');
    });

    it('should satisfy Requirement 4.5: Store colors in lowercase', () => {
      const normalized = normalizeColor('BLACK');
      
      expect(normalized).toBe('black');
      expect(normalized).toBe(normalized.toLowerCase());
    });
  });
});
