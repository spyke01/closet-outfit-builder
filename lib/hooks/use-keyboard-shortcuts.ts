/**
 * Keyboard Shortcuts Hook
 * Provides global keyboard shortcuts for common actions
 */

import useSWRSubscription from 'swr/subscription';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook for registering global keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useSWRSubscription('global-keyboard-shortcuts', () => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === e.ctrlKey;
        const metaMatch = shortcut.metaKey === undefined || shortcut.metaKey === e.metaKey;
        const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === e.shiftKey;
        const altMatch = shortcut.altKey === undefined || shortcut.altKey === e.altKey;
        const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase();

        if (ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
}

/**
 * Common keyboard shortcuts for the application
 */
export const COMMON_SHORTCUTS = {
  SEARCH: { key: 'k', metaKey: true, ctrlKey: true },
  SETTINGS: { key: ',', metaKey: true, ctrlKey: true },
  HELP: { key: '?', shiftKey: true },
  ESCAPE: { key: 'Escape' },
} as const;
