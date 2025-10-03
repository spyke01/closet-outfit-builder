import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureSupport } from './useFeatureSupport';

// Mock CSS.supports
const mockCSSSupports = vi.fn();
Object.defineProperty(window, 'CSS', {
  value: {
    supports: mockCSSSupports,
  },
  writable: true,
});

// Mock React features
const mockReact = {
  useOptimistic: vi.fn(),
  Suspense: vi.fn(),
  startTransition: vi.fn(),
};

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    ...mockReact,
  };
});

describe('useFeatureSupport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCSSSupports.mockReturnValue(false);
    
    // Mock document.startViewTransition
    Object.defineProperty(document, 'startViewTransition', {
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect container query support', () => {
    mockCSSSupports.mockImplementation((property: string) => {
      return property === 'container-type: inline-size';
    });

    const { result } = renderHook(() => useFeatureSupport());

    expect(result.current.containerQueries).toBe(true);
    expect(mockCSSSupports).toHaveBeenCalledWith('container-type: inline-size');
  });

  it('should detect CSS custom properties support', () => {
    mockCSSSupports.mockImplementation((property: string) => {
      return property === 'color: var(--test)';
    });

    const { result } = renderHook(() => useFeatureSupport());

    expect(result.current.cssCustomProperties).toBe(true);
    expect(mockCSSSupports).toHaveBeenCalledWith('color: var(--test)');
  });

  it('should detect backdrop filter support', () => {
    mockCSSSupports.mockImplementation((property: string) => {
      return property === 'backdrop-filter: blur(10px)';
    });

    const { result } = renderHook(() => useFeatureSupport());

    expect(result.current.backdropFilter).toBe(true);
    expect(mockCSSSupports).toHaveBeenCalledWith('backdrop-filter: blur(10px)');
  });

  it('should detect grid subgrid support', () => {
    mockCSSSupports.mockImplementation((property: string) => {
      return property === 'grid-template-rows: subgrid';
    });

    const { result } = renderHook(() => useFeatureSupport());

    expect(result.current.gridSubgrid).toBe(true);
    expect(mockCSSSupports).toHaveBeenCalledWith('grid-template-rows: subgrid');
  });

  it('should detect view transitions support', () => {
    const { result } = renderHook(() => useFeatureSupport());

    expect(result.current.viewTransitions).toBe(true);
  });

  it('should handle missing CSS.supports gracefully', () => {
    Object.defineProperty(window, 'CSS', {
      value: undefined,
      writable: true,
    });

    const { result } = renderHook(() => useFeatureSupport());

    expect(result.current.containerQueries).toBe(false);
    expect(result.current.cssCustomProperties).toBe(false);
    expect(result.current.backdropFilter).toBe(false);
    expect(result.current.gridSubgrid).toBe(false);
  });

  it('should detect React 19 features', () => {
    const { result } = renderHook(() => useFeatureSupport());

    expect(result.current.optimistic).toBe(true);
    expect(result.current.suspense).toBe(true);
    expect(result.current.transitions).toBe(true);
  });

  it('should return false for unsupported features', () => {
    mockCSSSupports.mockReturnValue(false);
    
    // Remove React features
    vi.doMock('react', () => ({}));

    const { result } = renderHook(() => useFeatureSupport());

    expect(result.current.containerQueries).toBe(false);
    expect(result.current.cssCustomProperties).toBe(false);
    expect(result.current.backdropFilter).toBe(false);
    expect(result.current.gridSubgrid).toBe(false);
  });
});