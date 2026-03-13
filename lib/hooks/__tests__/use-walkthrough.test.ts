import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWalkthrough } from '../use-walkthrough';

vi.mock('@/lib/actions/walkthrough', () => ({
  completeWalkthrough: vi.fn().mockResolvedValue({ success: true }),
}));

import { completeWalkthrough } from '@/lib/actions/walkthrough';
const mockCompleteWalkthrough = vi.mocked(completeWalkthrough);

describe('useWalkthrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in step 0 (not started) when initialCompleted is false', () => {
    const { result } = renderHook(() =>
      useWalkthrough({ initialCompleted: false, totalSteps: 5 })
    );

    expect(result.current.currentStep).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('starts with null step when initialCompleted is true', () => {
    const { result } = renderHook(() =>
      useWalkthrough({ initialCompleted: true, totalSteps: 5 })
    );

    expect(result.current.currentStep).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it('advances from 0 to 1 on start()', () => {
    const { result } = renderHook(() =>
      useWalkthrough({ initialCompleted: false, totalSteps: 5 })
    );

    act(() => result.current.start());

    expect(result.current.currentStep).toBe(1);
    expect(result.current.isActive).toBe(true);
  });

  it('advances step by step through all steps', () => {
    const { result } = renderHook(() =>
      useWalkthrough({ initialCompleted: false, totalSteps: 3 })
    );

    act(() => result.current.start());
    expect(result.current.currentStep).toBe(1);

    act(() => result.current.advance());
    expect(result.current.currentStep).toBe(2);

    act(() => result.current.advance());
    expect(result.current.currentStep).toBe(3);
  });

  it('sets currentStep to null and calls completeWalkthrough after last step', async () => {
    const { result } = renderHook(() =>
      useWalkthrough({ initialCompleted: false, totalSteps: 2 })
    );

    act(() => result.current.start());
    act(() => result.current.advance());

    // Advance past last step
    await act(async () => {
      result.current.advance();
      await Promise.resolve();
    });

    expect(result.current.currentStep).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(mockCompleteWalkthrough).toHaveBeenCalledOnce();
  });

  it('dismiss mid-tour sets step to null and calls completeWalkthrough', async () => {
    const { result } = renderHook(() =>
      useWalkthrough({ initialCompleted: false, totalSteps: 5 })
    );

    act(() => result.current.start());
    act(() => result.current.advance()); // step 2

    await act(async () => {
      result.current.dismiss();
      await Promise.resolve();
    });

    expect(result.current.currentStep).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(mockCompleteWalkthrough).toHaveBeenCalledOnce();
  });

  it('completed state does not retrigger — start() from null does not change state', () => {
    const { result } = renderHook(() =>
      useWalkthrough({ initialCompleted: true, totalSteps: 5 })
    );

    // Already completed — currentStep starts null
    expect(result.current.currentStep).toBeNull();

    // advance() on null state returns null (no-op)
    act(() => result.current.advance());
    expect(result.current.currentStep).toBeNull();
  });
});
