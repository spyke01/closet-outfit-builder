import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  measureBundleSize,
  measureCoreWebVitals,
  measureInteractionResponse,
  generatePerformanceReport,
  logPerformanceMetrics,
} from './performanceMetrics';

// Mock performance APIs
const mockPerformanceObserver = vi.fn();
const mockPerformanceNow = vi.fn();

Object.defineProperty(global, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
});

Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock CSS.supports
const mockCSSSupports = vi.fn();
Object.defineProperty(global, 'CSS', {
  value: {
    supports: mockCSSSupports,
  },
  writable: true,
});

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: true,
  },
  writable: true,
});

describe('performanceMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    mockCSSSupports.mockReturnValue(true);
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('measureBundleSize', () => {
    it('should estimate CSS size in development', async () => {
      const metrics = await measureBundleSize();

      expect(metrics.css.size).toBeGreaterThan(0);
      expect(metrics.css.gzipSize).toBeGreaterThan(0);
      expect(metrics.total.size).toBe(metrics.css.size + metrics.javascript.size);
    });

    it('should calculate reduction when previous metrics exist', async () => {
      const previousMetrics = {
        css: { size: 20000, gzipSize: 6000, reduction: 0 },
        javascript: { size: 150000, gzipSize: 45000, reduction: 0 },
        total: { size: 170000, gzipSize: 51000, reduction: 0 },
        timestamp: Date.now(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(previousMetrics));

      const metrics = await measureBundleSize();

      expect(metrics.css.reduction).toBeGreaterThanOrEqual(0);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const metrics = await measureBundleSize();

      expect(metrics.css.size).toBe(0);
      expect(metrics.javascript.size).toBe(0);
      expect(metrics.total.size).toBe(0);
    });
  });

  describe('measureCoreWebVitals', () => {
    it('should measure core web vitals', async () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      mockPerformanceObserver.mockImplementation((callback) => {
        // Simulate performance entries
        setTimeout(() => {
          callback({
            getEntries: () => [
              { name: 'first-contentful-paint', startTime: 1200 },
              { startTime: 1500 }, // LCP entry
              { value: 0.1, hadRecentInput: false }, // CLS entry
              { processingStart: 1100, startTime: 1000, duration: 50 }, // FID/INP entry
            ],
          });
        }, 0);

        return mockObserver;
      });

      const promise = measureCoreWebVitals();
      
      // Fast-forward time to resolve the promise
      vi.advanceTimersByTime(5000);
      
      const metrics = await promise;

      expect(metrics.fcp).toBe(1200);
      expect(metrics.lcp).toBe(1500);
      expect(metrics.cls).toBe(0.1);
      expect(metrics.fid).toBe(100);
      expect(metrics.inp).toBe(50);
    });
  });

  describe('measureInteractionResponse', () => {
    it('should measure interaction response times', async () => {
      const mockAddEventListener = vi.fn();
      Object.defineProperty(document, 'addEventListener', {
        value: mockAddEventListener,
        writable: true,
      });

      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1050); // End time

      const promise = measureInteractionResponse();

      // Simulate click event
      const clickHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'click'
      )?.[1];

      if (clickHandler) {
        clickHandler({});
        // Simulate requestAnimationFrame callback
        vi.advanceTimersByTime(16);
      }

      vi.advanceTimersByTime(10000);

      const metrics = await promise;

      expect(metrics.target).toBe(100);
      expect(metrics.average).toBeGreaterThanOrEqual(0);
      expect(metrics.p95).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', async () => {
      mockCSSSupports.mockReturnValue(true);

      const report = await generatePerformanceReport();

      expect(report).toHaveProperty('bundleMetrics');
      expect(report).toHaveProperty('coreWebVitals');
      expect(report).toHaveProperty('interactionResponse');
      expect(report).toHaveProperty('featureSupport');
      expect(report).toHaveProperty('renderTime');

      expect(report.featureSupport.containerQueries).toBe(true);
      expect(report.featureSupport.cssCustomProperties).toBe(true);
      expect(report.featureSupport.backdropFilter).toBe(true);
    });
  });

  describe('logPerformanceMetrics', () => {
    it('should log metrics in development', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      const mockMetrics = {
        bundleMetrics: {
          css: { size: 15000, gzipSize: 4500, reduction: 10 },
          javascript: { size: 120000, gzipSize: 35000, reduction: 5 },
          total: { size: 135000, gzipSize: 39500, reduction: 7 },
        },
        coreWebVitals: {
          fcp: 1200,
          lcp: 1500,
          cls: 0.1,
          fid: 100,
          inp: 50,
        },
        interactionResponse: {
          average: 80,
          p95: 95,
          target: 100,
        },
        featureSupport: {
          containerQueries: true,
          cssCustomProperties: true,
          backdropFilter: true,
          optimisticUpdates: true,
        },
        renderTime: {
          initial: 0,
          update: 0,
          optimistic: 0,
        },
      };

      logPerformanceMetrics(mockMetrics);

      expect(consoleSpy).toHaveBeenCalledWith('🚀 Performance Metrics');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CSS: 14.6KB')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CSS Reduction: 10%')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Meeting Target: ✅')
      );

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it('should not log in production', () => {
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: false },
        writable: true,
      });

      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      const mockMetrics = {
        bundleMetrics: {
          css: { size: 15000, gzipSize: 4500, reduction: 0 },
          javascript: { size: 120000, gzipSize: 35000, reduction: 0 },
          total: { size: 135000, gzipSize: 39500, reduction: 0 },
        },
        coreWebVitals: {
          fcp: 1200,
          lcp: 1500,
          cls: 0.1,
          fid: 100,
          inp: 50,
        },
        interactionResponse: {
          average: 80,
          p95: 95,
          target: 100,
        },
        featureSupport: {
          containerQueries: true,
          cssCustomProperties: true,
          backdropFilter: true,
          optimisticUpdates: true,
        },
        renderTime: {
          initial: 0,
          update: 0,
          optimistic: 0,
        },
      };

      logPerformanceMetrics(mockMetrics);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});