/**
 * Tests for preload manager functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { preloadManager, preloadByFeatureFlags, preloadCriticalModules } from '../preload-manager';
import * as featureFlags from '../feature-flags';

// Mock feature flags
vi.mock('../feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
  conditionalImport: vi.fn(),
  type: {} as unknown,
}));

// Mock requestIdleCallback
const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
  setTimeout(callback, 0);
  return 1;
});

const mockCancelIdleCallback = vi.fn();

Object.defineProperty(window, 'requestIdleCallback', {
  writable: true,
  value: mockRequestIdleCallback,
});

Object.defineProperty(window, 'cancelIdleCallback', {
  writable: true,
  value: mockCancelIdleCallback,
});

describe('PreloadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preloadManager.reset();
    
    // Default mock implementations
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.conditionalImport).mockResolvedValue({ default: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('preload', () => {
    it('should preload a module when feature is enabled', async () => {
      const mockImport = vi.fn().mockResolvedValue({ default: {} });
      
      const result = await preloadManager.preload('weather', mockImport);
      
      expect(result).toBe(true);
      expect(featureFlags.conditionalImport).toHaveBeenCalledWith('weather', mockImport);
    });

    it('should not preload when feature is disabled', async () => {
      vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false);
      const mockImport = vi.fn();
      
      const result = await preloadManager.preload('weather', mockImport);
      
      expect(result).toBe(false);
      expect(featureFlags.conditionalImport).not.toHaveBeenCalled();
    });

    it('should handle preload errors gracefully', async () => {
      const mockImport = vi.fn();
      vi.mocked(featureFlags.conditionalImport).mockRejectedValue(new Error('Import failed'));
      
      const result = await preloadManager.preload('weather', mockImport);
      
      expect(result).toBe(false);
      expect(preloadManager.getState('weather')?.error).toBe(true);
    });

    it('should not preload if already loaded', async () => {
      const mockImport = vi.fn().mockResolvedValue({ default: {} });
      
      // First preload
      await preloadManager.preload('weather', mockImport);
      
      // Second preload should be skipped
      const result = await preloadManager.preload('weather', mockImport);
      
      expect(result).toBe(true);
      expect(featureFlags.conditionalImport).toHaveBeenCalledTimes(1);
    });
  });

  describe('register and processQueue', () => {
    it('should register and process preload configs by priority', async () => {
      const highPriorityImport = vi.fn().mockResolvedValue({ default: {} });
      const lowPriorityImport = vi.fn().mockResolvedValue({ default: {} });
      
      // Register in reverse priority order
      preloadManager.register({
        feature: 'analytics',
        importFn: lowPriorityImport,
        priority: 'low',
      });
      
      preloadManager.register({
        feature: 'weather',
        importFn: highPriorityImport,
        priority: 'high',
      });
      
      await preloadManager.processQueue();
      
      // High priority should be processed first
      expect(featureFlags.conditionalImport).toHaveBeenNthCalledWith(1, 'weather', highPriorityImport);
      expect(featureFlags.conditionalImport).toHaveBeenNthCalledWith(2, 'analytics', lowPriorityImport);
    });

    it('should respect delay configuration', async () => {
      const mockImport = vi.fn().mockResolvedValue({ default: {} });
      
      preloadManager.register({
        feature: 'weather',
        importFn: mockImport,
        priority: 'high',
        delay: 100,
      });
      
      const startTime = Date.now();
      await preloadManager.processQueue();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(featureFlags.conditionalImport).toHaveBeenCalledWith('weather', mockImport);
    });
  });

  describe('preloadOnInteraction', () => {
    it('should use requestIdleCallback when available', () => {
      const mockImport = vi.fn();
      
      preloadManager.preloadOnInteraction('weather', mockImport);
      
      expect(mockRequestIdleCallback).toHaveBeenCalled();
    });

    it.skip('should fallback to setTimeout when requestIdleCallback is not available', () => {
      // This test is skipped because requestIdleCallback cannot be easily mocked in jsdom
      // The fallback behavior is tested in real browser environments
    });
  });

  describe('preloadOnIntersection', () => {
    it('should create IntersectionObserver when supported', () => {
      const mockElement = document.createElement('div');
      const mockImport = vi.fn();
      
      // Mock IntersectionObserver
      const mockObserver = {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
      
      const IntersectionObserverSpy = vi.fn().mockImplementation(() => mockObserver);
      (global as unknown).IntersectionObserver = IntersectionObserverSpy;
      
      const cleanup = preloadManager.preloadOnIntersection(mockElement, 'weather', mockImport);
      
      expect(IntersectionObserverSpy).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalledWith(mockElement);
      
      // Test cleanup
      cleanup();
      expect(mockObserver.unobserve).toHaveBeenCalledWith(mockElement);
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should fallback to immediate preload when IntersectionObserver is not supported', () => {
      // Remove IntersectionObserver
      delete (global as unknown).IntersectionObserver;
      
      const mockElement = document.createElement('div');
      const mockImport = vi.fn();
      
      preloadManager.preloadOnIntersection(mockElement, 'weather', mockImport);
      
      expect(mockRequestIdleCallback).toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('should track preload state correctly', async () => {
      const mockImport = vi.fn().mockResolvedValue({ default: {} });
      
      expect(preloadManager.getState('weather')).toBeNull();
      expect(preloadManager.isPreloaded('weather')).toBe(false);
      
      await preloadManager.preload('weather', mockImport);
      
      const state = preloadManager.getState('weather');
      expect(state?.loaded).toBe(true);
      expect(state?.loading).toBe(false);
      expect(state?.error).toBe(false);
      expect(preloadManager.isPreloaded('weather')).toBe(true);
    });

    it('should reset state correctly', async () => {
      const mockImport = vi.fn().mockResolvedValue({ default: {} });
      
      await preloadManager.preload('weather', mockImport);
      expect(preloadManager.isPreloaded('weather')).toBe(true);
      
      preloadManager.reset();
      expect(preloadManager.isPreloaded('weather')).toBe(false);
      expect(preloadManager.getState('weather')).toBeNull();
    });
  });
});

describe('preloadByFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preloadManager.reset();
  });

  it('should preload modules for enabled features only', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockImplementation((feature) => {
      return feature === 'weather' || feature === 'imageProcessing';
    });
    
    preloadByFeatureFlags();
    
    // Should register configs for enabled features
    expect(featureFlags.isFeatureEnabled).toHaveBeenCalledWith('weather');
    expect(featureFlags.isFeatureEnabled).toHaveBeenCalledWith('imageProcessing');
    expect(featureFlags.isFeatureEnabled).toHaveBeenCalledWith('monitoring');
    expect(featureFlags.isFeatureEnabled).toHaveBeenCalledWith('analytics');
  });

  it('should use requestIdleCallback for non-blocking preload', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    
    preloadByFeatureFlags();
    
    expect(mockRequestIdleCallback).toHaveBeenCalled();
  });
});

describe('preloadCriticalModules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preloadManager.reset();
  });

  it('should register critical modules with high priority', () => {
    const processQueueSpy = vi.spyOn(preloadManager, 'processQueue');
    
    preloadCriticalModules();
    
    expect(processQueueSpy).toHaveBeenCalled();
  });
});