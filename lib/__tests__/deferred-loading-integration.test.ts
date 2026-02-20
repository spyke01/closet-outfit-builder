import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the monitoring module
vi.mock('@/lib/monitoring', () => ({
  monitoring: {
    initialize: vi.fn(),
    logError: vi.fn(),
    logUserEvent: vi.fn(),
    logApiCall: vi.fn(),
  },
  initializeMonitoring: vi.fn(),
}));

// Mock web-vitals
vi.mock('web-vitals/onCLS.js', () => ({ onCLS: vi.fn() }));
vi.mock('web-vitals/onFCP.js', () => ({ onFCP: vi.fn() }));
vi.mock('web-vitals/onLCP.js', () => ({ onLCP: vi.fn() }));
vi.mock('web-vitals/onTTFB.js', () => ({ onTTFB: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock console methods
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('Deferred Loading Integration', () => {
  it('should successfully import monitoring module', async () => {
    const { monitoring, initializeMonitoring } = await import('@/lib/monitoring');
    
    expect(monitoring).toBeDefined();
    expect(initializeMonitoring).toBeDefined();
    expect(typeof initializeMonitoring).toBe('function');
  });

  it('should successfully import third-party integrations', async () => {
    const integrations = await import('@/lib/providers/third-party-integrations');
    
    expect(integrations.initializeErrorTracking).toBeDefined();
    expect(integrations.initializeAnalytics).toBeDefined();
    expect(integrations.initializePerformanceMonitoring).toBeDefined();
  });

  it('should handle third-party integration initialization', async () => {
    const { initializePerformanceMonitoring } = await import('@/lib/providers/third-party-integrations');
    
    // Should not throw errors
    await expect(initializePerformanceMonitoring()).resolves.toBeUndefined();
  });

  it('should handle error tracking initialization gracefully', async () => {
    const { initializeErrorTracking } = await import('@/lib/providers/third-party-integrations');
    
    // Should not throw errors even without Sentry
    await expect(initializeErrorTracking()).resolves.toBeUndefined();
  });

  it('should handle analytics initialization gracefully', async () => {
    const { initializeAnalytics } = await import('@/lib/providers/third-party-integrations');
    
    // Should not throw errors even without GA
    await expect(initializeAnalytics()).resolves.toBeUndefined();
  });

  it('should verify monitoring provider can be imported', async () => {
    const { MonitoringProvider } = await import('@/lib/providers/monitoring-provider');
    
    expect(MonitoringProvider).toBeDefined();
    expect(typeof MonitoringProvider).toBe('function');
  });

  it('should verify deferred monitoring component can be imported', async () => {
    const { DeferredMonitoring } = await import('@/lib/providers/deferred-monitoring');
    
    expect(DeferredMonitoring).toBeDefined();
    expect(typeof DeferredMonitoring).toBe('function');
  });
});
