/**
 * AnimatedIcon Component
 * 
 * Wraps SVG icons with hardware-accelerated animation support.
 * Follows Vercel best practice: animate wrapper divs instead of SVG elements.
 */

import React from 'react';
import { getAnimatedWrapperStyles, getOptimizedAnimationClass } from '@/lib/utils/svg-optimization';

export interface AnimatedIconProps {
  /**
   * The icon component to render (from lucide-react or similar)
   */
  children: React.ReactNode;
  
  /**
   * Animation class (e.g., 'animate-spin', 'animate-pulse')
   */
  animation?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether animation is currently active
   */
  isAnimating?: boolean;
  
  /**
   * Enable hardware acceleration (default: true)
   */
  enableHardwareAcceleration?: boolean;
}

/**
 * AnimatedIcon - Hardware-accelerated icon animation wrapper
 * 
 * Best Practice: Animates the wrapper div instead of the SVG element directly
 * This enables GPU acceleration and better performance.
 * 
 * @example
 * ```tsx
 * // Spinning loader
 * <AnimatedIcon animation="animate-spin" isAnimating={isLoading}>
 *   <Loader2 size={24} />
 * </AnimatedIcon>
 * 
 * // Pulsing indicator
 * <AnimatedIcon animation="animate-pulse" isAnimating={isUpdating}>
 *   <RefreshCw size={16} />
 * </AnimatedIcon>
 * ```
 */
export function AnimatedIcon({
  children,
  animation,
  className = '',
  isAnimating = true,
  enableHardwareAcceleration = true,
}: AnimatedIconProps) {
  // Get hardware acceleration styles
  const wrapperStyles = enableHardwareAcceleration
    ? getAnimatedWrapperStyles({ enableHardwareAcceleration: true })
    : {};
  
  // Build animation class
  const animationClass = animation && isAnimating
    ? getOptimizedAnimationClass(animation, className)
    : className;
  
  return (
    <div
      className={animationClass}
      style={wrapperStyles}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/**
 * Convenience component for spinning icons (most common use case)
 */
export interface SpinningIconProps {
  children: React.ReactNode;
  className?: string;
  isSpinning?: boolean;
}

export function SpinningIcon({
  children,
  className = '',
  isSpinning = true,
}: SpinningIconProps) {
  return (
    <AnimatedIcon
      animation="animate-spin"
      className={className}
      isAnimating={isSpinning}
    >
      {children}
    </AnimatedIcon>
  );
}

/**
 * Convenience component for pulsing icons
 */
export interface PulsingIconProps {
  children: React.ReactNode;
  className?: string;
  isPulsing?: boolean;
}

export function PulsingIcon({
  children,
  className = '',
  isPulsing = true,
}: PulsingIconProps) {
  return (
    <AnimatedIcon
      animation="animate-pulse"
      className={className}
      isAnimating={isPulsing}
    >
      {children}
    </AnimatedIcon>
  );
}
