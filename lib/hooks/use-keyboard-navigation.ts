/**
 * Keyboard Navigation Hook
 * Provides utilities for implementing keyboard navigation patterns
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
  preventDefault?: boolean;
}

/**
 * Hook for handling keyboard events on interactive elements
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onEnter,
    onSpace,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    preventDefault = true,
  } = options;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (onEnter) {
            if (preventDefault) e.preventDefault();
            onEnter();
          }
          break;
        case ' ':
          if (onSpace) {
            if (preventDefault) e.preventDefault();
            onSpace();
          }
          break;
        case 'Escape':
          if (onEscape) {
            if (preventDefault) e.preventDefault();
            onEscape();
          }
          break;
        case 'ArrowUp':
          if (onArrowUp) {
            if (preventDefault) e.preventDefault();
            onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            if (preventDefault) e.preventDefault();
            onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            if (preventDefault) e.preventDefault();
            onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            if (preventDefault) e.preventDefault();
            onArrowRight();
          }
          break;
        case 'Tab':
          if (onTab) {
            onTab(e.shiftKey);
          }
          break;
      }
    },
    [
      onEnter,
      onSpace,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onTab,
      preventDefault,
    ]
  );

  return { onKeyDown: handleKeyDown };
}

/**
 * Hook for implementing focus trap in modals and dropdowns
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive]);
}

/**
 * Hook for managing focus restoration
 */
export function useFocusRestore() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
}
