import { describe, it, expect } from 'vitest';
import {
  shouldUseContentVisibility,
  getContentVisibilityStyles,
  getContentVisibilityClass,
  useContentVisibility,
  DEFAULT_CONTENT_VISIBILITY_CONFIG,
} from '../content-visibility';
import { renderHook } from '@testing-library/react';

describe('Content Visibility Utilities', () => {
  describe('shouldUseContentVisibility', () => {
    it('should return false for item count below threshold', () => {
      expect(shouldUseContentVisibility(30)).toBe(false);
      expect(shouldUseContentVisibility(49)).toBe(false);
    });

    it('should return true for item count above threshold', () => {
      expect(shouldUseContentVisibility(51)).toBe(true);
      expect(shouldUseContentVisibility(100)).toBe(true);
    });

    it('should respect custom threshold', () => {
      expect(shouldUseContentVisibility(30, { threshold: 25 })).toBe(true);
      expect(shouldUseContentVisibility(20, { threshold: 25 })).toBe(false);
    });

    it('should respect enabled flag', () => {
      expect(shouldUseContentVisibility(100, { enabled: false })).toBe(false);
    });
  });

  describe('getContentVisibilityStyles', () => {
    it('should return empty object for small lists', () => {
      const styles = getContentVisibilityStyles(30);
      expect(Object.keys(styles).length).toBe(0);
    });

    it('should return content-visibility styles for large lists', () => {
      const styles = getContentVisibilityStyles(100);
      
      expect(styles.contentVisibility).toBe('auto');
      expect(styles.containIntrinsicSize).toBe('0 80px');
    });

    it('should use custom item height', () => {
      const styles = getContentVisibilityStyles(100, { itemHeight: 120 });
      
      expect(styles.containIntrinsicSize).toBe('0 120px');
    });
  });

  describe('getContentVisibilityClass', () => {
    it('should return empty string for small lists', () => {
      expect(getContentVisibilityClass(30)).toBe('');
    });

    it('should return class name for large lists', () => {
      expect(getContentVisibilityClass(100)).toBe('content-visibility-auto');
    });
  });

  describe('useContentVisibility', () => {
    it('should return optimization data for small lists', () => {
      const { result } = renderHook(() => useContentVisibility(30));
      
      expect(result.current.shouldOptimize).toBe(false);
      expect(result.current.className).toBe('');
      expect(Object.keys(result.current.styles).length).toBe(0);
      expect(result.current.itemCount).toBe(30);
    });

    it('should return optimization data for large lists', () => {
      const { result } = renderHook(() => useContentVisibility(100));
      
      expect(result.current.shouldOptimize).toBe(true);
      expect(result.current.className).toBe('content-visibility-auto');
      expect(result.current.styles.contentVisibility).toBe('auto');
      expect(result.current.itemCount).toBe(100);
    });
  });

  describe('DEFAULT_CONTENT_VISIBILITY_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONTENT_VISIBILITY_CONFIG.threshold).toBe(50);
      expect(DEFAULT_CONTENT_VISIBILITY_CONFIG.itemHeight).toBe(80);
      expect(DEFAULT_CONTENT_VISIBILITY_CONFIG.enabled).toBe(true);
    });
  });
});
