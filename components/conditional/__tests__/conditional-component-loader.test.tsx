import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConditionalComponentLoader, withConditionalLoading } from '../conditional-component-loader';
import * as featureFlags from '@/lib/utils/feature-flags';

// Mock feature flags module
vi.mock('@/lib/utils/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
  conditionalImport: vi.fn(),
}));

// Mock test component
const TestComponent = ({ message }: { message: string }) => (
  <div data-testid="test-component">{message}</div>
);

describe('ConditionalComponentLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render fallback when feature is disabled', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false);

    const fallback = <div data-testid="fallback">Feature disabled</div>;

    render(
      <ConditionalComponentLoader
        feature="weather"
        importFn={() => Promise.resolve({ default: TestComponent })}
        fallback={fallback}
        message="Test message"
      />
    );

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('should show loading state while importing component', async () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    
    // Mock a delayed import
    const importPromise = new Promise(resolve => 
      setTimeout(() => resolve({ default: TestComponent }), 100)
    );
    vi.mocked(featureFlags.conditionalImport).mockReturnValue(importPromise);

    const loadingComponent = <div data-testid="loading">Loading...</div>;

    render(
      <ConditionalComponentLoader
        feature="weather"
        importFn={() => Promise.resolve({ default: TestComponent })}
        loadingComponent={loadingComponent}
        message="Test message"
      />
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should render component after successful import', async () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.conditionalImport).mockResolvedValue({ default: TestComponent });

    render(
      <ConditionalComponentLoader
        feature="weather"
        importFn={() => Promise.resolve({ default: TestComponent })}
        message="Test message"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should show error state when import fails', async () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.conditionalImport).mockRejectedValue(new Error('Import failed'));

    const errorComponent = <div data-testid="error">Failed to load</div>;

    render(
      <ConditionalComponentLoader
        feature="weather"
        importFn={() => Promise.resolve({ default: TestComponent })}
        errorComponent={errorComponent}
        message="Test message"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });

  it('should show default loading state when no loading component provided', async () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    
    // Mock a delayed import
    const importPromise = new Promise(resolve => 
      setTimeout(() => resolve({ default: TestComponent }), 100)
    );
    vi.mocked(featureFlags.conditionalImport).mockReturnValue(importPromise);

    render(
      <ConditionalComponentLoader
        feature="weather"
        importFn={() => Promise.resolve({ default: TestComponent })}
        message="Test message"
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show default error state when no error component provided', async () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.conditionalImport).mockRejectedValue(new Error('Import failed'));

    render(
      <ConditionalComponentLoader
        feature="weather"
        importFn={() => Promise.resolve({ default: TestComponent })}
        message="Test message"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load component')).toBeInTheDocument();
    });
  });

  it('should pass props to loaded component', async () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.conditionalImport).mockResolvedValue({ default: TestComponent });

    render(
      <ConditionalComponentLoader
        feature="weather"
        importFn={() => Promise.resolve({ default: TestComponent })}
        message="Custom message"
        data-testid="wrapper"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });
  });
});

describe('withConditionalLoading', () => {
  it('should create a conditional component wrapper', async () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true);
    vi.mocked(featureFlags.conditionalImport).mockResolvedValue({ default: TestComponent });

    const ConditionalTestComponent = withConditionalLoading(
      'weather',
      () => Promise.resolve({ default: TestComponent }),
      {
        fallback: <div data-testid="fallback">Fallback</div>,
      }
    );

    render(<ConditionalTestComponent message="HOC Test" />);

    await waitFor(() => {
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    expect(screen.getByText('HOC Test')).toBeInTheDocument();
  });

  it('should show fallback when feature is disabled in HOC', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false);

    const ConditionalTestComponent = withConditionalLoading(
      'weather',
      () => Promise.resolve({ default: TestComponent }),
      {
        fallback: <div data-testid="fallback">Feature disabled</div>,
      }
    );

    render(<ConditionalTestComponent message="HOC Test" />);

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });
});