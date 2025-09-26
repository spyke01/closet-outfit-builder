/**
 * Accessibility utility functions for keyboard navigation and ARIA support
 */

/**
 * Handles keyboard events for interactive elements
 * Triggers the onClick handler when Enter or Space is pressed
 */
export const handleKeyboardClick = (
  event: React.KeyboardEvent,
  onClick?: () => void
) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick?.();
  }
};

/**
 * Creates accessibility props for interactive div elements
 */
export const createInteractiveProps = (
  onClick?: () => void,
  ariaLabel?: string,
  role: string = 'button'
) => ({
  onClick,
  onKeyDown: (event: React.KeyboardEvent) => handleKeyboardClick(event, onClick),
  role,
  tabIndex: 0,
  'aria-label': ariaLabel,
});

/**
 * Focus trap utility for modals
 */
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);
  
  // Focus the first element
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Escape key handler for modals
 */
export const handleEscapeKey = (
  event: KeyboardEvent,
  onEscape: () => void
) => {
  if (event.key === 'Escape') {
    onEscape();
  }
};