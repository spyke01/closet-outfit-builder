import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion, getAnimationClass } from '../use-reduced-motion';

interface MockMediaQueryList {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe('useReducedMotion', () => {
  let matchMediaMock: MockMediaQueryList;
  let listeners: Array<(event: MediaQueryListEvent) => void> = [];

  beforeEach(() => {
    listeners = [];
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
        listeners.push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
        listeners = listeners.filter(l => l !== handler);
      }),
    };

    vi.stubGlobal('matchMedia', vi.fn(() => matchMediaMock));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return false when user does not prefer reduced motion', () => {
    matchMediaMock.matches = false;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('should return true when user prefers reduced motion', () => {
    matchMediaMock.matches = true;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('should update when media query changes', () => {
    matchMediaMock.matches = false;
    const { result, rerender } = renderHook(() => useReducedMotion());
    
    expect(result.current).toBe(false);

    // Simulate media query change
    matchMediaMock.matches = true;
    listeners.forEach(listener => {
      listener({ matches: true } as MediaQueryListEvent);
    });
    
    rerender();
    expect(result.current).toBe(true);
  });

  it('should clean up event listener on unmount', () => {
    const { unmount } = renderHook(() => useReducedMotion());
    
    expect(matchMediaMock.addEventListener).toHaveBeenCalled();
    
    unmount();
    
    expect(matchMediaMock.removeEventListener).toHaveBeenCalled();
  });
});

describe('getAnimationClass', () => {
  let matchMediaMock: MockMediaQueryList;

  beforeEach(() => {
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => matchMediaMock));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return normal animation when reduced motion is not preferred', () => {
    matchMediaMock.matches = false;
    const result = getAnimationClass('animate-spin', 'animate-none');
    expect(result).toBe('animate-spin');
  });

  it('should return reduced animation when reduced motion is preferred', () => {
    matchMediaMock.matches = true;
    const result = getAnimationClass('animate-spin', 'animate-none');
    expect(result).toBe('animate-none');
  });

  it('should return empty string when reduced animation is not provided and reduced motion is preferred', () => {
    matchMediaMock.matches = true;
    const result = getAnimationClass('animate-spin');
    expect(result).toBe('');
  });

  it('should handle server-side rendering', () => {
    vi.stubGlobal('window', undefined);
    const result = getAnimationClass('animate-spin', 'animate-none');
    expect(result).toBe('animate-spin');
    vi.unstubAllGlobals();
  });
});
