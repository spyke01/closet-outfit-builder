/**
 * Content Visibility Utilities
 * 
 * Provides utilities for optimizing rendering performance of large lists
 * using CSS content-visibility property.
 * 
 * Best Practice: Use content-visibility: auto for lists with >50 items
 * to defer off-screen rendering and improve performance.
 */

/**
 * Configuration for content-visibility optimization
 */
export interface ContentVisibilityConfig {
  /**
   * Minimum number of items before applying content-visibility
   * Default: 50
   */
  threshold?: number;
  
  /**
   * Estimated height of each item in pixels
   * Used for contain-intrinsic-size
   */
  itemHeight?: number;
  
  /**
   * Enable content-visibility optimization
   * Default: true
   */
  enabled?: boolean;
}

/**
 * Default content-visibility configuration
 */
export const DEFAULT_CONTENT_VISIBILITY_CONFIG: Required<ContentVisibilityConfig> = {
  threshold: 50,
  itemHeight: 80,
  enabled: true,
};

/**
 * Determines if content-visibility should be applied based on item count
 */
export function shouldUseContentVisibility(
  itemCount: number,
  config: ContentVisibilityConfig = {}
): boolean {
  const { threshold, enabled } = {
    ...DEFAULT_CONTENT_VISIBILITY_CONFIG,
    ...config,
  };
  
  return enabled && itemCount > threshold;
}

/**
 * Gets optimized styles for list items with content-visibility
 */
export function getContentVisibilityStyles(
  itemCount: number,
  config: ContentVisibilityConfig = {}
): React.CSSProperties {
  if (!shouldUseContentVisibility(itemCount, config)) {
    return {};
  }
  
  const { itemHeight } = {
    ...DEFAULT_CONTENT_VISIBILITY_CONFIG,
    ...config,
  };
  
  return {
    contentVisibility: 'auto' as React.CSSProperties['contentVisibility'],
    containIntrinsicSize: `0 ${itemHeight}px`,
  };
}

/**
 * Gets CSS class name for content-visibility optimization
 */
export function getContentVisibilityClass(
  itemCount: number,
  config: ContentVisibilityConfig = {}
): string {
  return shouldUseContentVisibility(itemCount, config)
    ? 'content-visibility-auto'
    : '';
}

/**
 * Hook for managing content-visibility in React components
 */
export function useContentVisibility(
  itemCount: number,
  config: ContentVisibilityConfig = {}
) {
  const shouldOptimize = shouldUseContentVisibility(itemCount, config);
  const styles = getContentVisibilityStyles(itemCount, config);
  const className = getContentVisibilityClass(itemCount, config);
  
  return {
    shouldOptimize,
    styles,
    className,
    itemCount,
  };
}
