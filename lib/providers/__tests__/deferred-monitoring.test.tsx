import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { DeferredMonitoring } from '../deferred-monitoring';

vi.mock('@/lib/monitoring', () => ({
  initializeMonitoring: vi.fn(),
}));

describe('DeferredMonitoring', () => {
  const originalRequestIdleCallback = window.requestIdleCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: originalRequestIdleCallback,
    });
    vi.restoreAllMocks();
  });

  it('schedules deferred initialization without crashing', () => {
    const { container } = render(<DeferredMonitoring />);

    expect(container.firstChild).toBeNull();
    expect(window.requestIdleCallback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
  });
});
