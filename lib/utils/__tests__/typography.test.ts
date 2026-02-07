import { describe, it, expect } from 'vitest';
import {
  formatEllipsis,
  formatCurlyQuotes,
  formatUnit,
  formatShortcut,
  formatTemperature,
  formatLoadingText,
  TABULAR_NUMS_CLASS,
  NBSP_CLASS,
} from '../typography';

describe('Typography Utilities', () => {
  describe('formatEllipsis', () => {
    it('should replace three dots with ellipsis character', () => {
      expect(formatEllipsis('Loading...')).toBe('Loading…');
      expect(formatEllipsis('Saving...')).toBe('Saving…');
      expect(formatEllipsis('Processing...')).toBe('Processing…');
    });

    it('should handle multiple ellipses in one string', () => {
      expect(formatEllipsis('Loading... Please wait...')).toBe('Loading… Please wait…');
    });

    it('should not affect other periods', () => {
      expect(formatEllipsis('This is a sentence. And another...')).toBe('This is a sentence. And another…');
    });

    it('should handle empty string', () => {
      expect(formatEllipsis('')).toBe('');
    });
  });

  describe('formatCurlyQuotes', () => {
    it('should replace straight double quotes with curly quotes', () => {
      expect(formatCurlyQuotes('"Hello"')).toBe('\u201CHello\u201D');
      expect(formatCurlyQuotes('He said "Hello"')).toBe('He said \u201CHello\u201D');
    });

    it('should replace straight single quotes with curly quotes for quoted text', () => {
      expect(formatCurlyQuotes("'Hello'")).toBe('\u2018Hello\u2019');
    });

    it('should handle empty string', () => {
      expect(formatCurlyQuotes('')).toBe('');
    });
  });

  describe('formatUnit', () => {
    it('should add non-breaking space between value and unit', () => {
      const result = formatUnit(100, 'px');
      expect(result).toBe('100\u00A0px');
      expect(result).toContain('\u00A0'); // Non-breaking space
    });

    it('should work with different units', () => {
      expect(formatUnit(500, 'ms')).toBe('500\u00A0ms');
      expect(formatUnit(72, '°F')).toBe('72\u00A0°F');
      expect(formatUnit(1.5, 'rem')).toBe('1.5\u00A0rem');
    });

    it('should work with string values', () => {
      expect(formatUnit('100', 'px')).toBe('100\u00A0px');
    });
  });

  describe('formatShortcut', () => {
    it('should join keys with non-breaking spaces and plus signs', () => {
      const result = formatShortcut(['Cmd', 'S']);
      expect(result).toBe('Cmd\u00A0+\u00A0S');
      expect(result).toContain('\u00A0'); // Non-breaking space
    });

    it('should handle multiple keys', () => {
      expect(formatShortcut(['Ctrl', 'Shift', 'P'])).toBe('Ctrl\u00A0+\u00A0Shift\u00A0+\u00A0P');
    });

    it('should handle single key', () => {
      expect(formatShortcut(['Esc'])).toBe('Esc');
    });

    it('should handle empty array', () => {
      expect(formatShortcut([])).toBe('');
    });
  });

  describe('formatTemperature', () => {
    it('should format temperature with degree symbol', () => {
      expect(formatTemperature(72, 'F')).toBe('72°F');
      expect(formatTemperature(22, 'C')).toBe('22°C');
    });

    it('should round temperature values', () => {
      expect(formatTemperature(72.7, 'F')).toBe('73°F');
      expect(formatTemperature(72.3, 'F')).toBe('72°F');
    });

    it('should default to Fahrenheit', () => {
      expect(formatTemperature(72)).toBe('72°F');
    });

    it('should handle negative temperatures', () => {
      expect(formatTemperature(-5, 'C')).toBe('-5°C');
    });
  });

  describe('formatLoadingText', () => {
    it('should format loading text with proper ellipsis', () => {
      expect(formatLoadingText('Loading')).toBe('Loading…');
      expect(formatLoadingText('Saving')).toBe('Saving…');
      expect(formatLoadingText('Processing')).toBe('Processing…');
    });

    it('should handle empty string', () => {
      expect(formatLoadingText('')).toBe('…');
    });
  });

  describe('CSS Class Constants', () => {
    it('should export tabular nums class', () => {
      expect(TABULAR_NUMS_CLASS).toBe('tabular-nums');
    });

    it('should export nbsp class', () => {
      expect(NBSP_CLASS).toBe('nbsp');
    });
  });

  describe('Typography Integration', () => {
    it('should properly format a complete loading message', () => {
      const action = 'Loading weather';
      const formatted = formatEllipsis(`${action}...`);
      expect(formatted).toBe('Loading weather…');
    });

    it('should properly format temperature with unit', () => {
      const temp = 72;
      const formatted = formatTemperature(temp, 'F');
      expect(formatted).toBe('72°F');
      expect(formatted).not.toContain(' '); // No regular space
    });

    it('should properly format keyboard shortcuts', () => {
      const shortcut = formatShortcut(['Cmd', 'K']);
      expect(shortcut).toBe('Cmd\u00A0+\u00A0K');
      // Verify it uses non-breaking spaces
      expect(shortcut.split('\u00A0')).toHaveLength(3);
    });
  });
});
