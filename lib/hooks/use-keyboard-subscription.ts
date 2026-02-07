'use client';

import useSWRSubscription from 'swr/subscription';
import type { SWRSubscription } from 'swr/subscription';

interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: (event: KeyboardEvent) => void;
}

/**
 * Hook for keyboard shortcuts using SWR subscription
 * Deduplicates keyboard event listeners across component instances
 */
export function useKeyboardShortcut(shortcut: KeyboardShortcut) {
  const { key, metaKey, ctrlKey, shiftKey, altKey, callback } = shortcut;
  
  // Create a unique key for this shortcut combination
  const shortcutKey = `keyboard:${key}:${metaKey ? 'meta' : ''}:${ctrlKey ? 'ctrl' : ''}:${shiftKey ? 'shift' : ''}:${altKey ? 'alt' : ''}`;

  useSWRSubscription(
    shortcutKey,
    (key, { next }: { next: (error?: Error, data?: KeyboardEvent) => void }) => {
      const handler = (event: KeyboardEvent) => {
        // Check if all modifier keys match
        const modifiersMatch =
          (metaKey === undefined || event.metaKey === metaKey) &&
          (ctrlKey === undefined || event.ctrlKey === ctrlKey) &&
          (shiftKey === undefined || event.shiftKey === shiftKey) &&
          (altKey === undefined || event.altKey === altKey);

        if (event.key === key && modifiersMatch) {
          event.preventDefault();
          callback(event);
          next(undefined, event);
        }
      };

      window.addEventListener('keydown', handler);

      return () => {
        window.removeEventListener('keydown', handler);
      };
    }
  );
}

/**
 * Hook for multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  shortcuts.forEach((shortcut) => {
    useKeyboardShortcut(shortcut);
  });
}

/**
 * Hook for global keyboard event subscription
 * Useful for analytics or debugging
 */
export function useKeyboardEvents(
  callback: (event: KeyboardEvent) => void,
  eventType: 'keydown' | 'keyup' = 'keydown'
) {
  useSWRSubscription(
    `keyboard-events:${eventType}`,
    (key: string, { next }: { next: (error?: Error, data?: KeyboardEvent) => void }) => {
      const handler = (event: KeyboardEvent) => {
        callback(event);
        next(undefined, event);
      };

      window.addEventListener(eventType, handler);

      return () => {
        window.removeEventListener(eventType, handler);
      };
    }
  );
}
