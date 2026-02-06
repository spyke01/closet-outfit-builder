import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { DeferredMonitoring } from '../deferred-monitoring';

// Mock dynamic imports
vi.mock('@/lib/monitoring', () => ({
  initializeMonitoring: vi.fn(),
}));

vi.mock('web-vitals', () => ({
  getCLS: vi.fn(),
  getFID: vi.fn(),
  getFCP: vi.fn(),
  getLCP: vi.fn(),
  getTTFB: vi.fn(),
}));

// Mock Sentry (optional dependency)
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
}), { virtual: true });

// Mock global APIs
const mockRequestIdleCallback = vi.fn();
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock window APIs
  Object.defineProperty(global, 'window', {
    value: {
      requestIdleCallback: mockRequestIdleCallback,
      location: { href: 'http://localhost:3000' },
      navigator: { userAgent: 'test' },
      document: { referrer: '' },
    },
    writable: true,
    configurable: true,
  });
  
  global.fetch = mockFetch;
  
  // Mock console methods to avoid noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DeferredMonitoring', () => {
  it('should render without errors', () => {
    const { container } = render(<DeferredMonitoring />);
    expect(container.firstChild).toBeNull(); // Component renders nothing
  });

  it('should defer monitoring initialization', async () => {
    const { initializeMonitoring } = await import('@/lib/monitoring');
    
    render(<DeferredMonitoring />);
    
    // Should not initialize immediately
    expect(initializeMonitoring).not.toHaveBeenCalled();
    
    // Should use requestIdleCallback for deferred initialization
    expect(mockRequestIdleCallback).toHaveBeenCalled();
  });

  it('should handle missing requestIdleCallback gracefully', async () => {
    // Remove requestIdleCallback to test fallback
    delete (global.window as any).requestIdleCallback;
    
    const { initializeMonitoring } = await import('@/lib/monitoring');
    
    render(<DeferredMonitoring />);
    
    // Should still work with setTimeout fallback
    await waitFor(() => {
      expect(initializeMonitoring).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should handle initialization errors gracefully', async () => {
    const { initializeMonitoring } = await import('@/lib/monitoring');
    (initializeMonitoring as any).mockRejectedValue(new Error('Test error'));
    
    render(<DeferredMonitoring />);
    
    // Should not throw errors
    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to initialize monitoring libraries:',
        expect.any(Error)
      );
    }, { timeout: 3000 });
  });

  it('should only initialize in browser environment', () => {
    // Mock server environment
    delete (global as any).window;
    
    render(<DeferredMonitoring />);
    
    // Should not attempt initialization on server
    expect(mockRequestIdleCallback).not.toHaveBeenCalled();
  });
});