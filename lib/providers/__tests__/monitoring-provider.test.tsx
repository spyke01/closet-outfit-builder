import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MonitoringProvider } from '../monitoring-provider';

// Mock Next.js dynamic import
vi.mock('next/dynamic', () => ({
  default: vi.fn((importFn, options) => {
    // Create a mock component that respects SSR settings
    const MockDeferredMonitoring = () => {
      // Don't render on server when ssr: false
      if (options?.ssr === false && typeof window === 'undefined') {
        return null;
      }
      return <div data-testid="deferred-monitoring">Deferred Monitoring</div>;
    };
    MockDeferredMonitoring.displayName = 'MockDeferredMonitoring';
    return MockDeferredMonitoring;
  }),
}));

// Mock the deferred monitoring module
vi.mock('../deferred-monitoring', () => ({
  DeferredMonitoring: () => <div data-testid="deferred-monitoring">Deferred Monitoring</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  
  // Ensure we have a clean window object for browser tests
  if (typeof window === 'undefined') {
    Object.defineProperty(global, 'window', {
      value: {
        location: { href: 'http://localhost:3000' },
        navigator: { userAgent: 'test' },
        document: { referrer: '' },
      },
      writable: true,
      configurable: true,
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MonitoringProvider', () => {
  it('should render children correctly', () => {
    const { getByText } = render(
      <MonitoringProvider>
        <div>Test Child</div>
      </MonitoringProvider>
    );
    
    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('should include deferred monitoring component in browser', () => {
    const { getByTestId } = render(
      <MonitoringProvider>
        <div>Test Child</div>
      </MonitoringProvider>
    );
    
    // Should render the deferred monitoring component in browser
    expect(getByTestId('deferred-monitoring')).toBeInTheDocument();
  });

  it('should handle multiple children correctly', () => {
    const { getByText } = render(
      <MonitoringProvider>
        <div>Child 1</div>
        <div>Child 2</div>
      </MonitoringProvider>
    );
    
    expect(getByText('Child 1')).toBeInTheDocument();
    expect(getByText('Child 2')).toBeInTheDocument();
  });

  it('should not break when children are null or undefined', () => {
    const { container } = render(
      <MonitoringProvider>
        {null}
        {undefined}
        <div>Valid Child</div>
      </MonitoringProvider>
    );
    
    expect(container.querySelector('div')).toBeInTheDocument();
  });
});