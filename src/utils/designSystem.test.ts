import { describe, it, expect } from 'vitest';
import {
  buildVariantClasses,
  cn,
  createResponsiveGrid,
  createContainerGrid,
  getThemeAwareClasses,
  sizeVariants,
  colorVariants,
  shadowVariants,
  radiusVariants,
  animationVariants,
} from './designSystem';

describe('designSystem utilities', () => {
  describe('buildVariantClasses', () => {
    it('should build classes for size variant', () => {
      const classes = buildVariantClasses({ size: 'md' });
      expect(classes).toContain('text-base px-4 py-2');
    });

    it('should build classes for color variant', () => {
      const classes = buildVariantClasses({ color: 'primary' });
      expect(classes).toContain('bg-primary-500 hover:bg-primary-600');
      expect(classes).toContain('text-primary-600 hover:text-primary-700');
      expect(classes).toContain('border-primary-500 hover:border-primary-600');
    });

    it('should build classes for shadow variant', () => {
      const classes = buildVariantClasses({ shadow: 'lg' });
      expect(classes).toContain('shadow-lg');
    });

    it('should build classes for radius variant', () => {
      const classes = buildVariantClasses({ radius: 'md' });
      expect(classes).toContain('rounded-md');
    });

    it('should build classes for animation variant', () => {
      const classes = buildVariantClasses({ animation: 'fade' });
      expect(classes).toContain('animate-fade-in');
    });

    it('should combine multiple variants', () => {
      const classes = buildVariantClasses({
        size: 'sm',
        color: 'surface',
        shadow: 'sm',
        radius: 'lg',
        animation: 'slide',
      });

      expect(classes).toContain('text-sm px-3 py-1.5');
      expect(classes).toContain('bg-surface hover:bg-surface-secondary');
      expect(classes).toContain('shadow-sm');
      expect(classes).toContain('rounded-lg');
      expect(classes).toContain('animate-slide-up');
    });

    it('should handle empty variants', () => {
      const classes = buildVariantClasses({});
      expect(classes).toBe('');
    });
  });

  describe('cn utility', () => {
    it('should combine class names', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toBe('base conditional');
    });

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle objects', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      });
      expect(result).toBe('class1 class3');
    });
  });

  describe('createResponsiveGrid', () => {
    it('should create responsive grid classes', () => {
      const classes = createResponsiveGrid({
        default: 1,
        sm: 2,
        md: 3,
        lg: 4,
      });

      expect(classes).toBe('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4');
    });

    it('should handle single column', () => {
      const classes = createResponsiveGrid({ default: 2 });
      expect(classes).toBe('grid grid-cols-2');
    });
  });

  describe('createContainerGrid', () => {
    it('should create container query grid classes', () => {
      const classes = createContainerGrid({
        default: 1,
        sm: 2,
        md: 3,
        lg: 4,
      });

      expect(classes).toBe('grid grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4');
    });

    it('should handle single column', () => {
      const classes = createContainerGrid({ default: 3 });
      expect(classes).toBe('grid grid-cols-3');
    });
  });

  describe('getThemeAwareClasses', () => {
    it('should combine light and dark classes', () => {
      const classes = getThemeAwareClasses('bg-white', 'bg-gray-900');
      expect(classes).toBe('bg-white dark:bg-gray-900');
    });
  });

  describe('variant constants', () => {
    it('should have correct size variants', () => {
      expect(sizeVariants.xs).toBe('text-xs px-2 py-1');
      expect(sizeVariants.sm).toBe('text-sm px-3 py-1.5');
      expect(sizeVariants.md).toBe('text-base px-4 py-2');
      expect(sizeVariants.lg).toBe('text-lg px-6 py-3');
      expect(sizeVariants.xl).toBe('text-xl px-8 py-4');
    });

    it('should have correct color variants', () => {
      expect(colorVariants.primary.bg).toBe('bg-primary-500 hover:bg-primary-600');
      expect(colorVariants.surface.bg).toBe('bg-surface hover:bg-surface-secondary');
      expect(colorVariants.secondary.bg).toBe('bg-surface-secondary hover:bg-surface-tertiary');
    });

    it('should have correct shadow variants', () => {
      expect(shadowVariants.none).toBe('shadow-none');
      expect(shadowVariants.sm).toBe('shadow-sm');
      expect(shadowVariants.md).toBe('shadow-md');
      expect(shadowVariants.lg).toBe('shadow-lg');
      expect(shadowVariants.xl).toBe('shadow-xl');
    });

    it('should have correct radius variants', () => {
      expect(radiusVariants.none).toBe('rounded-none');
      expect(radiusVariants.sm).toBe('rounded-sm');
      expect(radiusVariants.md).toBe('rounded-md');
      expect(radiusVariants.lg).toBe('rounded-lg');
      expect(radiusVariants.xl).toBe('rounded-xl');
      expect(radiusVariants.full).toBe('rounded-full');
    });

    it('should have correct animation variants', () => {
      expect(animationVariants.none).toBe('');
      expect(animationVariants.fade).toBe('animate-fade-in');
      expect(animationVariants.slide).toBe('animate-slide-up');
      expect(animationVariants.shimmer).toBe('animate-shimmer');
      expect(animationVariants.theme).toBe('animate-theme-transition');
    });
  });
});