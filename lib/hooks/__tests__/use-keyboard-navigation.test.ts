import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardNavigation } from '../use-keyboard-navigation';

describe('useKeyboardNavigation', () => {
  it('should call onEnter when Enter key is pressed', () => {
    const onEnter = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onEnter })
    );

    const event = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.onKeyDown(event);

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should call onSpace when Space key is pressed', () => {
    const onSpace = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onSpace })
    );

    const event = {
      key: ' ',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.onKeyDown(event);

    expect(onSpace).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should call onEscape when Escape key is pressed', () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onEscape })
    );

    const event = {
      key: 'Escape',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.onKeyDown(event);

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should call onArrowDown when ArrowDown key is pressed', () => {
    const onArrowDown = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onArrowDown })
    );

    const event = {
      key: 'ArrowDown',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.onKeyDown(event);

    expect(onArrowDown).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should call onArrowUp when ArrowUp key is pressed', () => {
    const onArrowUp = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onArrowUp })
    );

    const event = {
      key: 'ArrowUp',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.onKeyDown(event);

    expect(onArrowUp).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should not call handlers for unregistered keys', () => {
    const onEnter = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onEnter })
    );

    const event = {
      key: 'a',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.onKeyDown(event);

    expect(onEnter).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should not prevent default when preventDefault is false', () => {
    const onEnter = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onEnter, preventDefault: false })
    );

    const event = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.onKeyDown(event);

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should call onTab with shiftKey state', () => {
    const onTab = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onTab })
    );

    const event = {
      key: 'Tab',
      shiftKey: true,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.onKeyDown(event);

    expect(onTab).toHaveBeenCalledWith(true);
  });
});
