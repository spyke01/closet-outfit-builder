/**
 * Static Elements Optimization Utilities
 * 
 * Provides utilities and patterns for optimizing static JSX elements
 * following Vercel React best practices.
 * 
 * Best Practice: Hoist static JSX elements outside component functions
 * to avoid recreating them on each render.
 */

import React from 'react';

/**
 * Type guard to check if a value is a valid React element
 */
export function isReactElement(value: unknown): value is React.ReactElement {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    'props' in value
  );
}

/**
 * Hydration-safe script injection
 * 
 * Prevents hydration mismatches by executing scripts synchronously
 * before React hydration occurs.
 * 
 * @example
 * ```tsx
 * <script
 *   dangerouslySetInnerHTML={{
 *     __html: getHydrationSafeScript(`
 *       try {
 *         var theme = localStorage.getItem('theme') || 'light';
 *         document.documentElement.className = theme;
 *       } catch (e) {}
 *     `)
 *   }}
 * />
 * ```
 */
export function getHydrationSafeScript(code: string): string {
  // Wrap in IIFE to avoid global scope pollution
  return `(function(){${code}})();`;
}

/**
 * Creates a hydration-safe theme script
 * 
 * This script runs synchronously before React hydration to prevent
 * theme flashing and hydration mismatches.
 */
export function getThemeScript(storageKey: string = 'theme'): string {
  return getHydrationSafeScript(`
    try {
      var theme = localStorage.getItem('${storageKey}');
      if (theme) {
        document.documentElement.classList.add(theme);
      }
    } catch (e) {
      console.error('Failed to load theme:', e);
    }
  `);
}

/**
 * Static element optimization guidelines
 * 
 * 1. Hoist static JSX outside component functions
 * 2. Use constants for elements that never change
 * 3. Avoid inline object/array creation in JSX
 * 4. Use React.memo() for expensive static components
 * 5. Prevent hydration mismatches with synchronous scripts
 */
export const STATIC_ELEMENT_GUIDELINES = {
  /**
   * Elements that should be hoisted:
   * - Icons that don't change
   * - Empty state messages
   * - Static labels and text
   * - Decorative elements
   */
  shouldHoist: (element: unknown): boolean => {
    // Check if element has no dynamic props
    if (!isReactElement(element)) return false;
    
    const props = element.props || {};
    const propKeys = Object.keys(props);
    
    // If element has children or dynamic props, don't hoist
    return propKeys.length === 0 || (propKeys.length === 1 && propKeys[0] === 'children');
  },
  
  /**
   * Elements that should NOT be hoisted:
   * - Elements with dynamic props
   * - Elements that depend on component state
   * - Elements with event handlers
   * - Elements with conditional rendering
   */
  shouldNotHoist: (element: unknown): boolean => {
    if (!isReactElement(element)) return true;
    
    const props = (element.props || {}) as Record<string, unknown>;
    
    // Check for dynamic props
    const hasDynamicProps = Object.keys(props).some(key => 
      key.startsWith('on') || // Event handlers
      key === 'className' || // Dynamic classes
      key === 'style' || // Dynamic styles
      typeof props[key] === 'function' // Callbacks
    );
    
    return hasDynamicProps;
  },
} as const;

/**
 * Memoization helper for static components
 * 
 * Use this to wrap components that render static content
 * and don't need to re-render when parent updates.
 */
export function createStaticComponent<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const MemoizedComponent = React.memo(Component);
  
  if (displayName) {
    MemoizedComponent.displayName = `Static(${displayName})`;
  }
  
  return MemoizedComponent;
}
