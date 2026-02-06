/**
 * Tests for intelligent preloading hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { useIntelligentPreloading, useNavigationPreloading, useComponentPreloading } from '../use-intelligent-preloading';
import * as preloadManager from '../../utils/preload-manager';
import * as featureFlags from '../../utils/feature-flags';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock preload manager
vi.mock('../../utils/preload-manager', () => ({
  preloadManager: {
    preloadOnInteraction: vi.fn(),
    isPreloaded: vi.fn(),
    register: vi.fn(),
    processQueue: vi.fn(),
  },
  preloadByFeatureFlags: vi.fn(),
}));

// Mock feature flags
vi.mock('../../utils/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
}));

// Mock requestIdleCallback
const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
  setTimeout(callback, 0);
  return 1;
});

Object.defineProperty(window, 'requestIdleCallback', {
  writable: true,
  value: mockRequestIdleCallback,
});

describe('useIntelligentPreloading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/wardrobe');
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should preload modules for current route on mount', () => {
    renderHook(() => useIntelligentPreloading());

    expect(preloadManager.preloadByFeatureFlags).toHaveBeenCalled();
  });

  it('should preload modules when route changes', () => {
    const { rerender } = renderHook(() => useIntelligentPreloading());

    vi.mocked(usePathname).mockReturnValue('/outfits');
    rerender();

    expect(preloadManager.preloadByFeatureFlags).toHaveBeenCalledTimes(2);
  });

  it('should return preload functions', () => {
    const { result } = renderHook(() => useIntelligentPreloading());

    expect(result.current.preloadForRoute).toBeInstanceOf(Function);
    expect(result.current.preloadOnUserIntent).toBeInstanceOf(Function);
  });

  it('should preload for target route', () => {
    const { result } = renderHook(() => useIntelligentPreloading());

    result.current.preloadForRoute('/outfits');

    expect(preloadManager.preloadManager.register).toHaveBeenCalled();
  });

  it('should preload on user intent', () => {
    const { result } = renderHook(() => useIntelligentPreloading());
    const mockImport = vi.fn();

    result.current.preloadOnUserIntent('weather', mockImport);

    expect(preloadManager.preloadManager.preloadOnInteraction).toHaveBeenCalledWith('weather', mockImport);
  });
});

describe('useNavigationPreloading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/wardrobe');
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
  });

  it('should return navigation props with preload handlers', () => {
    const { result } = renderHook(() => useNavigationPreloading());

    const props = result.current.getNavigationProps('/outfits');

    expect(props).toHaveProperty('onMouseEnter');
    expect(props).toHaveProperty('onFocus');
    expect(props).toHaveProperty('onTouchStart');
    expect(props.onMouseEnter).toBeInstanceOf(Function);
    expect(props.onFocus).toBeInstanceOf(Function);
    expect(props.onTouchStart).toBeInstanceOf(Function);
  });

  it('should trigger preload on mouse enter', () => {
    const { result } = renderHook(() => useNavigationPreloading());

    const props = result.current.getNavigationProps('/outfits');
    props.onMouseEnter();

    expect(preloadManager.preloadManager.register).toHaveBeenCalled();
  });

  it('should trigger preload on focus', () => {
    const { result } = renderHook(() => useNavigationPreloading());

    const props = result.current.getNavigationProps('/outfits');
    props.onFocus();

    expect(preloadManager.preloadManager.register).toHaveBeenCalled();
  });

  it('should trigger preload on touch start', () => {
    const { result } = renderHook(() => useNavigationPreloading());

    const props = result.current.getNavigationProps('/outfits');
    props.onTouchStart();

    expect(preloadManager.preloadManager.register).toHaveBeenCalled();
  });
});

describe('useComponentPreloading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(preloadManager.preloadManager.isPreloaded).mockReturnValue(false);
  });

  it('should return preload props and preload state', () => {
    const mockImport = vi.fn();
    const { result } = renderHook(() => useComponentPreloading('weather', mockImport));

    expect(result.current.preloadProps).toHaveProperty('onMouseEnter');
    expect(result.current.preloadProps).toHaveProperty('onFocus');
    expect(result.current.preloadProps).toHaveProperty('onTouchStart');
    expect(result.current.isPreloaded).toBe(false);
  });

  it('should trigger preload on interaction', () => {
    const mockImport = vi.fn();
    const { result } = renderHook(() => useComponentPreloading('weather', mockImport));

    result.current.preloadProps.onMouseEnter();

    expect(preloadManager.preloadManager.preloadOnInteraction).toHaveBeenCalledWith('weather', mockImport);
  });

  it('should return correct preload state', () => {
    vi.mocked(preloadManager.preloadManager.isPreloaded).mockReturnValue(true);
    
    const mockImport = vi.fn();
    const { result } = renderHook(() => useComponentPreloading('weather', mockImport));

    expect(result.current.isPreloaded).toBe(true);
  });

  it('should update when preload state changes', () => {
    const mockImport = vi.fn();
    const { result, rerender } = renderHook(() => useComponentPreloading('weather', mockImport));

    expect(result.current.isPreloaded).toBe(false);

    vi.mocked(preloadManager.preloadManager.isPreloaded).mockReturnValue(true);
    rerender();

    expect(result.current.isPreloaded).toBe(true);
  });
});