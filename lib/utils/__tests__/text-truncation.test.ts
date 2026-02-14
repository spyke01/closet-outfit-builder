import { describe, it, expect } from 'vitest';
import {
  truncateText,
  needsTruncation,
  truncateAtWord,
  getTruncationInfo,
  getTruncationClasses,
  getMultiLineTruncationClasses
} from '../text-truncation';

describe('Text Truncation Utilities', () => {
  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Short text', 50)).toBe('Short text');
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text with ellipsis', () => {
      const longText = 'This is a very long text that should be truncated';
      const result = truncateText(longText, 20);
      expect(result).toBe('This is a very long…');
      expect(result.length).toBe(20);
    });

    it('should handle empty or invalid input', () => {
      expect(truncateText('', 50)).toBe('');
      expect(truncateText(null as unknown, 50)).toBe('');
      expect(truncateText(undefined as unknown, 50)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(truncateText('  Text with spaces  ', 50)).toBe('Text with spaces');
    });

    it('should use default maxLength of 50', () => {
      const longText = 'a'.repeat(60);
      const result = truncateText(longText);
      expect(result.length).toBe(51); // 50 chars + ellipsis
    });
  });

  describe('needsTruncation', () => {
    it('should return true for long text', () => {
      const longText = 'a'.repeat(60);
      expect(needsTruncation(longText, 50)).toBe(true);
    });

    it('should return false for short text', () => {
      expect(needsTruncation('Short', 50)).toBe(false);
    });

    it('should handle edge case at exact length', () => {
      const text = 'a'.repeat(50);
      expect(needsTruncation(text, 50)).toBe(false);
    });
  });

  describe('truncateAtWord', () => {
    it('should truncate at word boundary', () => {
      const text = 'This is a very long sentence that needs truncation';
      const result = truncateAtWord(text, 20);
      expect(result).toBe('This is a very long…');
      expect(result).not.toContain('sentence');
    });

    it('should not cut words in half', () => {
      const text = 'Hello world this is a test';
      const result = truncateAtWord(text, 15);
      expect(result).toBe('Hello world…');
    });

    it('should handle text without spaces', () => {
      const text = 'verylongtextwithoutspaces';
      const result = truncateAtWord(text, 10);
      expect(result).toBe('verylongte…');
    });
  });

  describe('getTruncationInfo', () => {
    it('should return correct info for short text', () => {
      const info = getTruncationInfo('Short text', 50);
      expect(info.isTruncated).toBe(false);
      expect(info.displayText).toBe('Short text');
      expect(info.fullText).toBe('Short text');
    });

    it('should return correct info for long text', () => {
      const longText = 'This is a very long text that should be truncated';
      const info = getTruncationInfo(longText, 20);
      expect(info.isTruncated).toBe(true);
      expect(info.displayText).toBe('This is a very long…');
      expect(info.fullText).toBe(longText);
    });

    it('should handle empty text', () => {
      const info = getTruncationInfo('', 50);
      expect(info.isTruncated).toBe(false);
      expect(info.displayText).toBe('');
      expect(info.fullText).toBe('');
    });
  });

  describe('getTruncationClasses', () => {
    it('should return CSS classes for single-line truncation', () => {
      const classes = getTruncationClasses();
      expect(classes).toContain('truncate');
      expect(classes).toContain('overflow-hidden');
      expect(classes).toContain('text-ellipsis');
    });
  });

  describe('getMultiLineTruncationClasses', () => {
    it('should return line-clamp classes', () => {
      expect(getMultiLineTruncationClasses(2)).toBe('line-clamp-2');
      expect(getMultiLineTruncationClasses(3)).toBe('line-clamp-3');
    });

    it('should use default of 2 lines', () => {
      expect(getMultiLineTruncationClasses()).toBe('line-clamp-2');
    });
  });
});
