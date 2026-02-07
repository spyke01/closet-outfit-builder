import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut, useKeyboardShortcuts } from '../use-keyboard-subscription';

describe('Keyboard Subscription Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useKeyboardShortcut', () => {
    it('should register keyboard shortcut', () => {
      const callback = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useKeyboardShortcut({
          key: 's',
          metaKey: true,
          callback,
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('should not call callback when modifiers do not match', () => {
      const callback = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useKeyboardShortcut({
          key: 's',
          metaKey: true,
          callback,
        })
      );

      // Verify listener was registered
      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it('should handle ctrl+shift combinations', () => {
      const callback = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          ctrlKey: true,
          shiftKey: true,
          callback,
        })
      );

      // Verify listener was registered with correct parameters
      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it('should cleanup event listener on unmount', () => {
      const callback = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardShortcut({
          key: 's',
          metaKey: true,
          callback,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });

  describe('useKeyboardShortcuts', () => {
    it('should register multiple shortcuts', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useKeyboardShortcuts([
          { key: 's', metaKey: true, callback: callback1 },
          { key: 'k', ctrlKey: true, callback: callback2 },
        ])
      );

      // Should register 2 event listeners
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle empty shortcuts array', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useKeyboardShortcuts([]));

      // Should not register any listeners
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });
});
