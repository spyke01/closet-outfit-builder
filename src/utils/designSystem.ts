import { type ClassValue, clsx } from 'clsx';

/**
 * Design system utilities for consistent styling and component variants
 */

// Component size variants
export const sizeVariants = {
  xs: 'text-xs px-2 py-1',
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-6 py-3',
  xl: 'text-xl px-8 py-4',
} as const;

// Color variants using CSS custom properties
export const colorVariants = {
  primary: {
    bg: 'bg-primary-500 hover:bg-primary-600',
    text: 'text-primary-600 hover:text-primary-700',
    border: 'border-primary-500 hover:border-primary-600',
  },
  surface: {
    bg: 'bg-surface hover:bg-surface-secondary',
    text: 'text-text-primary',
    border: 'border-border hover:border-border-secondary',
  },
  secondary: {
    bg: 'bg-surface-secondary hover:bg-surface-tertiary',
    text: 'text-text-secondary hover:text-text-primary',
    border: 'border-border hover:border-border-secondary',
  },
} as const;

// Shadow variants
export const shadowVariants = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
} as const;

// Radius variants
export const radiusVariants = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const;

// Animation variants
export const animationVariants = {
  none: '',
  fade: 'animate-fade-in',
  slide: 'animate-slide-up',
  shimmer: 'animate-shimmer',
  theme: 'animate-theme-transition',
} as const;

// Spacing system
export const spacing = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
} as const;

/**
 * Component variant builder for consistent styling
 */
export interface ComponentVariants {
  size?: keyof typeof sizeVariants;
  color?: keyof typeof colorVariants;
  shadow?: keyof typeof shadowVariants;
  radius?: keyof typeof radiusVariants;
  animation?: keyof typeof animationVariants;
}

export const buildVariantClasses = (variants: ComponentVariants): string => {
  const classes: string[] = [];

  if (variants.size) {
    classes.push(sizeVariants[variants.size]);
  }

  if (variants.color) {
    const colorSet = colorVariants[variants.color];
    classes.push(colorSet.bg, colorSet.text, colorSet.border);
  }

  if (variants.shadow) {
    classes.push(shadowVariants[variants.shadow]);
  }

  if (variants.radius) {
    classes.push(radiusVariants[variants.radius]);
  }

  if (variants.animation) {
    classes.push(animationVariants[variants.animation]);
  }

  return classes.join(' ');
};

/**
 * Utility function for combining class names with clsx
 */
export const cn = (...inputs: ClassValue[]) => {
  return clsx(inputs);
};

/**
 * Responsive breakpoint utilities
 */
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

/**
 * Container query breakpoints
 */
export const containerBreakpoints = {
  xs: '(min-width: 20rem)',
  sm: '(min-width: 24rem)',
  md: '(min-width: 28rem)',
  lg: '(min-width: 32rem)',
  xl: '(min-width: 36rem)',
  '2xl': '(min-width: 42rem)',
} as const;

/**
 * Design tokens for consistent spacing, typography, and colors
 */
export const designTokens = {
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/**
 * Accessibility utilities
 */
export const a11yClasses = {
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-primary-400 dark:focus:ring-offset-surface',
  touchTarget: 'min-h-[44px] min-w-[44px]',
  screenReaderOnly: 'sr-only',
  highContrast: 'contrast-more:border-2 contrast-more:border-current',
} as const;

/**
 * Performance-optimized class combinations
 */
export const performanceClasses = {
  willChange: 'will-change-transform',
  gpuAcceleration: 'transform-gpu',
  backfaceHidden: 'backface-hidden',
  containLayout: 'contain-layout',
  containStyle: 'contain-style',
} as const;

/**
 * Theme-aware utility for getting appropriate classes based on current theme
 */
export const getThemeAwareClasses = (lightClass: string, darkClass: string): string => {
  return `${lightClass} dark:${darkClass}`;
};

/**
 * Utility for creating responsive grid layouts
 */
export const createResponsiveGrid = (columns: Record<string, number>): string => {
  const classes: string[] = ['grid'];
  
  Object.entries(columns).forEach(([breakpoint, cols]) => {
    if (breakpoint === 'default') {
      classes.push(`grid-cols-${cols}`);
    } else {
      classes.push(`${breakpoint}:grid-cols-${cols}`);
    }
  });
  
  return classes.join(' ');
};

/**
 * Utility for creating container query responsive layouts
 */
export const createContainerGrid = (columns: Record<string, number>): string => {
  const classes: string[] = ['grid'];
  
  Object.entries(columns).forEach(([size, cols]) => {
    if (size === 'default') {
      classes.push(`grid-cols-${cols}`);
    } else {
      classes.push(`@${size}:grid-cols-${cols}`);
    }
  });
  
  return classes.join(' ');
};