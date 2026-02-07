/**
 * SVG Optimization Utilities
 * 
 * Provides utilities for optimizing SVG rendering and animations
 * following Vercel React best practices.
 */

/**
 * Wraps an SVG icon component with a hardware-accelerated animation wrapper
 * 
 * Best Practice: Animate wrapper divs instead of SVG elements directly
 * This enables hardware acceleration and better performance
 * 
 * @example
 * ```tsx
 * <AnimatedIconWrapper className="animate-spin">
 *   <Loader2 size={24} />
 * </AnimatedIconWrapper>
 * ```
 */
export interface AnimatedIconWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Configuration for SVG optimization
 */
export interface SVGOptimizationConfig {
  /**
   * Enable hardware acceleration for animations
   * Adds will-change: transform to animated elements
   */
  enableHardwareAcceleration?: boolean;
  
  /**
   * Coordinate precision for SVG paths (1-5)
   * Lower values = smaller file size, less precision
   */
  coordinatePrecision?: number;
  
  /**
   * Remove unnecessary SVG attributes
   */
  removeUnusedAttributes?: boolean;
}

/**
 * Default SVG optimization configuration
 */
export const DEFAULT_SVG_CONFIG: SVGOptimizationConfig = {
  enableHardwareAcceleration: true,
  coordinatePrecision: 2,
  removeUnusedAttributes: true,
};

/**
 * Gets optimized styles for animated SVG wrappers
 * Enables hardware acceleration for better performance
 */
export function getAnimatedWrapperStyles(
  config: SVGOptimizationConfig = DEFAULT_SVG_CONFIG
): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  if (config.enableHardwareAcceleration) {
    // Enable hardware acceleration
    styles.willChange = 'transform';
    // Force GPU rendering
    styles.transform = 'translateZ(0)';
  }
  
  return styles;
}

/**
 * Combines animation classes with hardware acceleration
 */
export function getOptimizedAnimationClass(
  animationClass: string,
  additionalClasses?: string
): string {
  const classes = [animationClass];
  
  if (additionalClasses) {
    classes.push(additionalClasses);
  }
  
  return classes.join(' ');
}

/**
 * SVG optimization guidelines for SVGO configuration
 * 
 * Recommended SVGO plugins for optimal file size:
 * - removeDoctype
 * - removeXMLProcInst
 * - removeComments
 * - removeMetadata
 * - removeEditorsNSData
 * - cleanupAttrs
 * - mergeStyles
 * - inlineStyles
 * - minifyStyles
 * - cleanupIds
 * - removeUselessDefs
 * - cleanupNumericValues (precision: 2)
 * - convertColors
 * - removeUnknownsAndDefaults
 * - removeNonInheritableGroupAttrs
 * - removeUselessStrokeAndFill
 * - removeViewBox (false - keep viewBox for responsive SVGs)
 * - cleanupEnableBackground
 * - removeHiddenElems
 * - removeEmptyText
 * - convertShapeToPath
 * - convertEllipseToCircle
 * - moveElemsAttrsToGroup
 * - moveGroupAttrsToElems
 * - collapseGroups
 * - convertPathData (precision: 2)
 * - convertTransform
 * - removeEmptyAttrs
 * - removeEmptyContainers
 * - mergePaths
 * - removeUnusedNS
 * - sortDefsChildren
 * - removeTitle
 * - removeDesc
 */
export const SVGO_CONFIG = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Keep viewBox for responsive SVGs
          removeViewBox: false,
          // Reduce coordinate precision for smaller file size
          cleanupNumericValues: {
            floatPrecision: 2,
          },
          convertPathData: {
            floatPrecision: 2,
          },
        },
      },
    },
    // Remove unnecessary metadata
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',
  ],
};

/**
 * Checks if an element should use hardware acceleration
 * Based on animation type and browser support
 */
export function shouldUseHardwareAcceleration(animationType: string): boolean {
  // Hardware acceleration is beneficial for transform-based animations
  const transformAnimations = ['spin', 'pulse', 'bounce', 'ping'];
  
  return transformAnimations.some(type => animationType.includes(type));
}

/**
 * Gets optimized animation properties for CSS
 */
export function getOptimizedAnimationProps(animationType: string): React.CSSProperties {
  const baseStyles: React.CSSProperties = {};
  
  if (shouldUseHardwareAcceleration(animationType)) {
    baseStyles.willChange = 'transform';
    baseStyles.transform = 'translateZ(0)';
  }
  
  // Ensure animations only use transform and opacity
  if (animationType.includes('spin')) {
    baseStyles.transformOrigin = 'center';
  }
  
  return baseStyles;
}
