import React from 'react';
import { cn, buildVariantClasses, type ComponentVariants, a11yClasses } from '../utils/designSystem';
import { useFeatureSupport, ConditionalEnhancement } from '../hooks/useFeatureSupport';

/**
 * Enhanced Button component with design system variants
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'surface';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animation?: 'none' | 'fade' | 'slide' | 'theme';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  animation = 'none',
  className = '',
  children,
  ...props
}) => {
  const variants: ComponentVariants = {
    size,
    color: variant,
    shadow: 'sm',
    radius: 'md',
    animation,
  };

  const baseClasses = buildVariantClasses(variants);
  const accessibilityClasses = a11yClasses.focusRing + ' ' + a11yClasses.touchTarget;

  return (
    <button
      className={cn(
        baseClasses,
        accessibilityClasses,
        'font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Enhanced Card component with container queries and design system
 */
export interface CardProps {
  children: React.ReactNode;
  variant?: 'surface' | 'secondary';
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg';
  className?: string;
  containerQuery?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  padding = 'md',
  shadow = 'sm',
  radius = 'lg',
  className = '',
  containerQuery = false,
}) => {
  const support = useFeatureSupport();
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const containerClass = containerQuery && support.containerQueries ? '@container' : '';

  return (
    <div
      className={cn(
        buildVariantClasses({ color: variant, shadow, radius }),
        paddingClasses[padding],
        containerClass,
        'border transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Enhanced Grid component with responsive and container query support
 */
export interface GridProps {
  children: React.ReactNode;
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  containerColumns?: {
    default: number;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns,
  containerColumns,
  gap = 'md',
  className = '',
}) => {
  const support = useFeatureSupport();
  
  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  // Build responsive grid classes
  const gridClasses: string[] = ['grid'];
  
  if (containerColumns && support.containerQueries) {
    // Use container queries if supported
    gridClasses.push(`grid-cols-${containerColumns.default}`);
    if (containerColumns.xs) gridClasses.push(`@xs:grid-cols-${containerColumns.xs}`);
    if (containerColumns.sm) gridClasses.push(`@sm:grid-cols-${containerColumns.sm}`);
    if (containerColumns.md) gridClasses.push(`@md:grid-cols-${containerColumns.md}`);
    if (containerColumns.lg) gridClasses.push(`@lg:grid-cols-${containerColumns.lg}`);
    if (containerColumns.xl) gridClasses.push(`@xl:grid-cols-${containerColumns.xl}`);
  } else if (columns) {
    // Fallback to viewport-based responsive design
    gridClasses.push(`grid-cols-${columns.default}`);
    if (columns.sm) gridClasses.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) gridClasses.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) gridClasses.push(`lg:grid-cols-${columns.lg}`);
    if (columns.xl) gridClasses.push(`xl:grid-cols-${columns.xl}`);
  }

  return (
    <div
      className={cn(
        gridClasses.join(' '),
        gapClasses[gap],
        support.containerQueries ? '@container' : '',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Enhanced Skeleton component with design system integration
 */
export interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: 'sm' | 'md' | 'lg' | 'full';
  animation?: boolean;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = 'w-full',
  height = 'h-4',
  radius = 'md',
  animation = true,
  className = '',
}) => {
  const support = useFeatureSupport();
  
  return (
    <div
      className={cn(
        width,
        height,
        buildVariantClasses({ radius }),
        'bg-surface-secondary',
        animation && support.cssCustomProperties ? 'animate-shimmer' : '',
        'relative overflow-hidden',
        className
      )}
    >
      {animation && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-surface-tertiary to-transparent animate-shimmer" />
      )}
    </div>
  );
};

/**
 * Enhanced Loading component with feature detection
 */
export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'shimmer';
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (variant === 'spinner') {
    return (
      <ConditionalEnhancement
        feature="cssCustomProperties"
        fallback={
          <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-blue-600', sizeClasses[size], className)} />
        }
      >
        <div className={cn('animate-spin rounded-full border-2 border-border border-t-primary-500', sizeClasses[size], className)} />
      </ConditionalEnhancement>
    );
  }

  if (variant === 'skeleton') {
    return <Skeleton className={cn(sizeClasses[size], className)} />;
  }

  return (
    <div className={cn('bg-surface-secondary animate-shimmer', sizeClasses[size], className)} />
  );
};

/**
 * Enhanced Text component with design system typography
 */
export interface TextProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'primary',
  size = 'base',
  weight = 'normal',
  as: Component = 'p',
  className = '',
}) => {
  const support = useFeatureSupport();
  
  const variantClasses = support.cssCustomProperties ? {
    primary: 'text-text-primary',
    secondary: 'text-text-secondary',
    tertiary: 'text-text-tertiary',
  } : {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-300',
    tertiary: 'text-gray-500 dark:text-gray-400',
  };

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  return (
    <Component
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        weightClasses[weight],
        'transition-colors duration-200',
        className
      )}
    >
      {children}
    </Component>
  );
};

/**
 * Enhanced Badge component
 */
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
}) => {
  return (
    <span
      className={cn(
        buildVariantClasses({ 
          size: size === 'sm' ? 'xs' : 'sm',
          color: variant,
          radius: 'full'
        }),
        'inline-flex items-center font-medium',
        className
      )}
    >
      {children}
    </span>
  );
};