import { describe, it, expect } from 'vitest';
import {
  getAnimatedWrapperStyles,
  getOptimizedAnimationClass,
  shouldUseHardwareAcceleration,
  getOptimizedAnimationProps,
  DEFAULT_SVG_CONFIG,
} from '../svg-optimization';

describe('SVG Optimization Utilities', () => {
  describe('getAnimatedWrapperStyles', () => {
    it('should return hardware acceleration styles by default', () => {
      const styles = getAnimatedWrapperStyles();
      
      expect(styles.willChange).toBe('transform');
      expect(styles.transform).toBe('translateZ(0)');
    });

    it('should return empty styles when hardware acceleration is disabled', () => {
      const styles = getAnimatedWrapperStyles({ enableHardwareAcceleration: false });
      
      expect(styles.willChange).toBeUndefined();
      expect(styles.transform).toBeUndefined();
    });
  });

  describe('getOptimizedAnimationClass', () => {
    it('should return animation class alone', () => {
      const result = getOptimizedAnimationClass('animate-spin');
      expect(result).toBe('animate-spin');
    });

    it('should combine animation class with additional classes', () => {
      const result = getOptimizedAnimationClass('animate-spin', 'text-primary');
      expect(result).toBe('animate-spin text-primary');
    });
  });

  describe('shouldUseHardwareAcceleration', () => {
    it('should return true for transform-based animations', () => {
      expect(shouldUseHardwareAcceleration('animate-spin')).toBe(true);
      expect(shouldUseHardwareAcceleration('animate-pulse')).toBe(true);
      expect(shouldUseHardwareAcceleration('animate-bounce')).toBe(true);
      expect(shouldUseHardwareAcceleration('animate-ping')).toBe(true);
    });

    it('should return false for non-transform animations', () => {
      expect(shouldUseHardwareAcceleration('animate-fade')).toBe(false);
      expect(shouldUseHardwareAcceleration('custom-animation')).toBe(false);
    });
  });

  describe('getOptimizedAnimationProps', () => {
    it('should return hardware acceleration props for spin animation', () => {
      const props = getOptimizedAnimationProps('animate-spin');
      
      expect(props.willChange).toBe('transform');
      expect(props.transform).toBe('translateZ(0)');
      expect(props.transformOrigin).toBe('center');
    });

    it('should return hardware acceleration props for pulse animation', () => {
      const props = getOptimizedAnimationProps('animate-pulse');
      
      expect(props.willChange).toBe('transform');
      expect(props.transform).toBe('translateZ(0)');
    });

    it('should return empty props for non-transform animations', () => {
      const props = getOptimizedAnimationProps('animate-fade');
      
      expect(Object.keys(props).length).toBe(0);
    });
  });

  describe('DEFAULT_SVG_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SVG_CONFIG.enableHardwareAcceleration).toBe(true);
      expect(DEFAULT_SVG_CONFIG.coordinatePrecision).toBe(2);
      expect(DEFAULT_SVG_CONFIG.removeUnusedAttributes).toBe(true);
    });
  });
});
