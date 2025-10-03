import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn();
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

mockPerformanceObserver.mockImplementation((callback) => ({
  observe: mockObserve,
  disconnect: mockDisconnect
}));

// Mock performance.now
const mockPerformanceNow = vi.fn();

// Mock CSS.supports
const mockCSSSupports = vi.fn();

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup global mocks
    global.PerformanceObserver = mockPerformanceObserver;
    global.performance = {
      ...global.performance,
      now: mockPerformanceNow
    };
    global.CSS = {
      supports: mockCSSSupports
    };

    // Default mock implementations
    mockPerformanceNow.mockReturnValue(1000);
    mockCSSSupports.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    expect(result.current.metrics).toEqual({
      renderTime: {
        initial: 0,
        update: 0,
        optimistic: 0
      },
      interactionResponse: {
        average: 0,
        p95: 0,
        target: 100,
        samples: []
      },
      coreWebVitals: {
        fcp: null,
        lcp: null,
        cls: null,
        fid: null,
        inp: null
      },
      customMetrics: {
        outfitGenerationTime: [],
        searchResponseTime: [],
        filterResponseTime: []
      }
    });
  });

  it('should set up performance observers on mount', () => {
    renderHook(() => usePerformanceMonitoring());

    expect(mockPerformanceObserver).toHaveBeenCalledTimes(3); // paint, layout-shift, input observers
    expect(mockObserve).toHaveBeenCalledTimes(3);
  });

  it('should measure interaction response time', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    mockPerformanceNow
      .mockReturnValueOnce(1000) // start time
      .mockReturnValueOnce(1050); // end time

    const mockFn = vi.fn();

    await act(async () => {
      await result.current.measureInteraction('test-interaction', mockFn);
    });

    expect(mockFn).toHaveBeenCalled();
    expect(result.current.metrics.interactionResponse.samples).toContain(50);
    expect(result.current.metrics.interactionResponse.average).toBe(50);
  });

  it('should measure render time', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    mockPerformanceNow
      .mockReturnValueOnce(1000) // start time
      .mockReturnValueOnce(1025); // end time

    const mockRenderFn = vi.fn();

    act(() => {
      result.current.measureRenderTime('TestComponent', mockRenderFn);
    });

    expect(mockRenderFn).toHaveBeenCalled();
    expect(result.current.metrics.renderTime.update).toBe(25);
  });

  it('should record custom metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    act(() => {
      result.current.recordCustomMetric('outfitGenerationTime', 150);
      result.current.recordCustomMetric('searchResponseTime', 75);
    });

    expect(result.current.metrics.customMetrics.outfitGenerationTime).toContain(150);
    expect(result.current.metrics.customMetrics.searchResponseTime).toContain(75);
  });

  it('should calculate interaction response statistics correctly', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    const measurements = [50, 75, 100, 125, 150];
    
    for (const measurement of measurements) {
      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1000 + measurement);

      await act(async () => {
        await result.current.measureInteraction('test', () => {});
      });
    }

    const { interactionResponse } = result.current.metrics;
    expect(interactionResponse.samples).toEqual(measurements);
    expect(interactionResponse.average).toBe(100); // (50+75+100+125+150)/5
    expect(interactionResponse.p95).toBe(150); // 95th percentile
  });

  it('should limit samples to prevent memory leaks', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    // Add more than 100 samples
    for (let i = 0; i < 150; i++) {
      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1010);

      await act(async () => {
        await result.current.measureInteraction('test', () => {});
      });
    }

    expect(result.current.metrics.interactionResponse.samples.length).toBe(100);
  });

  it('should limit custom metric samples', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    // Add more than 50 samples
    act(() => {
      for (let i = 0; i < 75; i++) {
        result.current.recordCustomMetric('outfitGenerationTime', i);
      }
    });

    expect(result.current.metrics.customMetrics.outfitGenerationTime.length).toBe(50);
  });

  it('should warn about slow interactions', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => usePerformanceMonitoring());

    mockPerformanceNow
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1150); // 150ms - slow interaction

    await act(async () => {
      await result.current.measureInteraction('slow-interaction', () => {});
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Slow interaction detected: slow-interaction took 150.00ms')
    );

    consoleSpy.mockRestore();
  });

  it('should warn about slow renders', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => usePerformanceMonitoring());

    mockPerformanceNow
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1020); // 20ms - slow render (>16.67ms)

    act(() => {
      result.current.measureRenderTime('SlowComponent', () => {});
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Slow render detected: SlowComponent took 20.00ms')
    );

    consoleSpy.mockRestore();
  });

  it('should generate comprehensive performance report', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    // Add some sample data
    act(() => {
      result.current.recordCustomMetric('outfitGenerationTime', 100);
      result.current.recordCustomMetric('searchResponseTime', 50);
      result.current.recordCustomMetric('filterResponseTime', 25);
    });

    const report = result.current.getPerformanceReport();

    expect(report).toContain('Performance Report');
    expect(report).toContain('Core Web Vitals');
    expect(report).toContain('Interaction Response');
    expect(report).toContain('Custom Metrics');
    expect(report).toContain('Performance Status');
  });

  it('should reset all metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    // Add some data
    act(() => {
      result.current.recordCustomMetric('outfitGenerationTime', 100);
    });

    // Reset
    act(() => {
      result.current.resetMetrics();
    });

    expect(result.current.metrics.customMetrics.outfitGenerationTime).toEqual([]);
    expect(result.current.metrics.interactionResponse.samples).toEqual([]);
  });

  it('should handle errors in interaction measurement gracefully', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const errorFn = vi.fn().mockRejectedValue(new Error('Test error'));

    mockPerformanceNow
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1050);

    await act(async () => {
      await result.current.measureInteraction('error-interaction', errorFn);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error in interaction error-interaction:',
      expect.any(Error)
    );
    expect(result.current.metrics.interactionResponse.samples).toContain(50);

    consoleErrorSpy.mockRestore();
  });

  it('should handle missing PerformanceObserver gracefully', () => {
    // Remove PerformanceObserver
    delete (global as any).PerformanceObserver;

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() => usePerformanceMonitoring());

    // Should not throw and should warn
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Performance monitoring setup failed:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it('should disconnect observers on unmount', () => {
    const { unmount } = renderHook(() => usePerformanceMonitoring());

    unmount();

    expect(mockDisconnect).toHaveBeenCalledTimes(3);
  });

  it('should handle Core Web Vitals updates', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());

    // Simulate performance observer callback
    const observerCallback = mockPerformanceObserver.mock.calls[0][0];
    
    // Mock paint entries
    const paintEntries = [
      { entryType: 'paint', name: 'first-contentful-paint', startTime: 1200 },
      { entryType: 'largest-contentful-paint', startTime: 1500 }
    ];

    act(() => {
      observerCallback({ getEntries: () => paintEntries });
    });

    expect(result.current.metrics.coreWebVitals.fcp).toBe(1200);
    expect(result.current.metrics.coreWebVitals.lcp).toBe(1500);
  });
});