import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useScrollSubscription,
  useResizeSubscription,
  useScrollAndResize,
} from '../use-scroll-subscription';

describe('Scroll and Resize Subscription Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useScrollSubscription', () => {
    it('should register scroll event listener', () => {
      const callback = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useScrollSubscription(callback));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      );
    });

    it('should use passive option by default', () => {
      const callback = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useScrollSubscription(callback));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      );
    });

    it('should cleanup event listener on unmount', () => {
      const callback = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useScrollSubscription(callback));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
    });
  });

  describe('useResizeSubscription', () => {
    it('should register resize event listener', () => {
      const callback = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useResizeSubscription(callback));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
    });

    it('should cleanup event listener on unmount', () => {
      const callback = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useResizeSubscription(callback));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
    });
  });

  describe('useScrollAndResize', () => {
    it('should register both scroll and resize listeners', () => {
      const callback = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useScrollAndResize(callback));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
    });

    it('should use passive scroll listener', () => {
      const callback = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useScrollAndResize(callback, { passive: true }));

      const scrollCall = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'scroll'
      );
      expect(scrollCall?.[2]).toEqual({ passive: true });
    });
  });
});
