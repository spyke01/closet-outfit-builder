'use client';

/**
 * Conditional Rendering Optimization Utilities
 * 
 * Provides utilities for safe conditional rendering following Vercel React best practices.
 * 
 * Best Practices:
 * 1. Use explicit ternary operators instead of && to prevent rendering 0 or NaN
 * 2. Use null coalescing for safe fallbacks
 * 3. Implement Activity component pattern for show/hide with state preservation
 */

import React from 'react';

/**
 * Safe conditional rendering helper
 * 
 * Prevents accidental rendering of 0, NaN, or other falsy values
 * by using explicit ternary operators.
 * 
 * @example
 * ```tsx
 * // ❌ Bad: Can render "0" if count is 0
 * {count && <div>Count: {count}</div>}
 * 
 * // ✅ Good: Only renders when count > 0
 * {renderIf(count > 0, <div>Count: {count}</div>)}
 * ```
 */
export function renderIf<T>(
  condition: boolean,
  element: T
): T | null {
  return condition ? element : null;
}

/**
 * Safe conditional rendering with fallback
 * 
 * @example
 * ```tsx
 * {renderIfElse(
 *   hasData,
 *   <DataDisplay data={data} />,
 *   <EmptyState />
 * )}
 * ```
 */
export function renderIfElse<T, F>(
  condition: boolean,
  trueElement: T,
  falseElement: F
): T | F {
  return condition ? trueElement : falseElement;
}

/**
 * Safe number rendering
 * 
 * Prevents rendering 0 or NaN by checking if value is truthy
 * 
 * @example
 * ```tsx
 * // ❌ Bad: Renders "0" when count is 0
 * {count && <span>{count} items</span>}
 * 
 * // ✅ Good: Only renders when count > 0
 * {renderNumber(count, (n) => <span>{n} items</span>)}
 * ```
 */
export function renderNumber(
  value: number | null | undefined,
  render: (value: number) => React.ReactNode
): React.ReactNode {
  // Check if value is a valid number and not 0
  if (typeof value === 'number' && !isNaN(value) && value !== 0) {
    return render(value);
  }
  return null;
}

/**
 * Safe array rendering
 * 
 * Prevents rendering when array is empty or undefined
 * 
 * @example
 * ```tsx
 * // ❌ Bad: Can render "0" if array is empty
 * {items.length && <List items={items} />}
 * 
 * // ✅ Good: Only renders when array has items
 * {renderArray(items, (arr) => <List items={arr} />)}
 * ```
 */
export function renderArray<T>(
  array: T[] | null | undefined,
  render: (array: T[]) => React.ReactNode
): React.ReactNode {
  if (array && array.length > 0) {
    return render(array);
  }
  return null;
}

/**
 * Activity Component Props
 * 
 * Component that preserves state and DOM when hidden
 * using CSS visibility instead of conditional rendering
 */
export interface ActivityProps {
  /**
   * Whether the content should be visible
   */
  show: boolean;
  
  /**
   * Content to show/hide
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to preserve DOM when hidden (default: true)
   * If false, uses display: none instead of visibility: hidden
   */
  preserveDOM?: boolean;
}

/**
 * Activity Component
 * 
 * Shows/hides content while preserving state and DOM.
 * Uses CSS visibility instead of conditional rendering.
 * 
 * Benefits:
 * - Preserves component state when hidden
 * - Preserves DOM structure and layout
 * - Faster show/hide transitions
 * - No re-mounting overhead
 * 
 * @example
 * ```tsx
 * <Activity show={isVisible}>
 *   <ExpensiveComponent />
 * </Activity>
 * ```
 */
export function Activity({
  show,
  children,
  className = '',
  preserveDOM = true,
}: ActivityProps) {
  const style: React.CSSProperties = preserveDOM
    ? {
        visibility: show ? 'visible' : 'hidden',
        // Prevent interaction when hidden
        pointerEvents: show ? 'auto' : 'none',
      }
    : {
        display: show ? 'block' : 'none',
      };
  
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Checks if a value is safe to render
 * 
 * Returns false for values that would render unexpectedly:
 * - 0 (renders as "0")
 * - NaN (renders as "NaN")
 * - Empty strings (renders nothing but takes up space)
 */
export function isSafeToRender(value: any): boolean {
  // Null and undefined are safe (render nothing)
  if (value === null || value === undefined) {
    return false;
  }
  
  // Check for problematic number values
  if (typeof value === 'number') {
    return !isNaN(value) && value !== 0;
  }
  
  // Empty strings are not safe
  if (typeof value === 'string') {
    return value.length > 0;
  }
  
  // Arrays should have items
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  // Boolean false is not safe
  if (typeof value === 'boolean') {
    return value === true;
  }
  
  // Everything else is safe
  return true;
}

/**
 * Safe conditional rendering with automatic safety check
 * 
 * @example
 * ```tsx
 * // Automatically prevents rendering 0, NaN, empty strings, etc.
 * {safeRender(count, <div>Count: {count}</div>)}
 * ```
 */
export function safeRender(
  condition: any,
  element: React.ReactNode
): React.ReactNode {
  return isSafeToRender(condition) ? element : null;
}
