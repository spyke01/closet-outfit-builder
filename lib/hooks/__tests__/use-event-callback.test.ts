import { renderHook, act } from '@testing-library/react'
import { useEventCallback, useStableCallback } from '../use-event-callback'
import { describe, it, expect, vi } from 'vitest'
import { useEffect, useState } from 'react'

describe('useEventCallback', () => {
  it('should return a stable callback reference', () => {
    const fn = vi.fn()
    
    const { result, rerender } = renderHook(
      ({ callback }) => useEventCallback(callback),
      { initialProps: { callback: fn } }
    )
    
    const firstCallback = result.current
    
    rerender({ callback: fn })
    
    const secondCallback = result.current
    
    // Callback reference should be stable
    expect(firstCallback).toBe(secondCallback)
  })
  
  it('should call the latest version of the function', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    
    const { result, rerender } = renderHook(
      ({ callback }) => useEventCallback(callback),
      { initialProps: { callback: fn1 } }
    )
    
    const stableCallback = result.current
    
    // Update to new function
    rerender({ callback: fn2 })
    
    // Call the stable callback
    stableCallback('test')
    
    // Should call the NEW function, not the old one
    expect(fn2).toHaveBeenCalledWith('test')
    expect(fn1).not.toHaveBeenCalled()
  })
  
  it('should work with event subscriptions', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    
    const { rerender } = renderHook(
      ({ handler }) => {
        const stableHandler = useEventCallback(handler)
        
        useEffect(() => {
          const listener = (e: Event) => {
            stableHandler(e)
          }
          
          window.addEventListener('test-event', listener)
          return () => window.removeEventListener('test-event', listener)
        }, [stableHandler])
        
        return stableHandler
      },
      { initialProps: { handler: handler1 } }
    )
    
    // Update handler
    rerender({ handler: handler2 })
    
    // Dispatch event
    const event = new Event('test-event')
    window.dispatchEvent(event)
    
    // Should call the NEW handler
    expect(handler2).toHaveBeenCalledWith(event)
    expect(handler1).not.toHaveBeenCalled()
  })
  
  it('should handle multiple arguments', () => {
    const fn = vi.fn()
    
    const { result } = renderHook(() => useEventCallback(fn))
    
    result.current('arg1', 42, { key: 'value' })
    
    expect(fn).toHaveBeenCalledWith('arg1', 42, { key: 'value' })
  })
  
  it('should preserve return values', () => {
    const fn = vi.fn((x: number) => x * 2)
    
    const { result } = renderHook(() => useEventCallback(fn))
    
    const returnValue = result.current(5)
    
    expect(returnValue).toBe(10)
  })
  
  it('should work with async functions', async () => {
    const asyncFn = vi.fn(async (value: string) => {
      return `processed: ${value}`
    })
    
    const { result } = renderHook(() => useEventCallback(asyncFn))
    
    const promise = result.current('test')
    
    expect(promise).toBeInstanceOf(Promise)
    
    const returnValue = await promise
    
    expect(returnValue).toBe('processed: test')
    expect(asyncFn).toHaveBeenCalledWith('test')
  })
  
  it('should prevent effect re-runs when handler changes', () => {
    const effectCleanup = vi.fn()
    const effectSetup = vi.fn(() => effectCleanup)
    
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    
    const { rerender } = renderHook(
      ({ handler }) => {
        const stableHandler = useEventCallback(handler)
        
        useEffect(() => {
          effectSetup()
          return effectCleanup
        }, [stableHandler]) // Depends on stableHandler
        
        return stableHandler
      },
      { initialProps: { handler: handler1 } }
    )
    
    // Effect should run once on mount
    expect(effectSetup).toHaveBeenCalledTimes(1)
    expect(effectCleanup).toHaveBeenCalledTimes(0)
    
    // Update handler
    rerender({ handler: handler2 })
    
    // Effect should NOT re-run because stableHandler is stable
    expect(effectSetup).toHaveBeenCalledTimes(1)
    expect(effectCleanup).toHaveBeenCalledTimes(0)
  })
  
  it('should work with state updates', () => {
    const { result } = renderHook(() => {
      const [count, setCount] = useState(0)
      const [lastValue, setLastValue] = useState<number | null>(null)
      
      const handleClick = useEventCallback((value: number) => {
        setLastValue(value)
        setCount(c => c + 1)
      })
      
      return { handleClick, count, lastValue }
    })
    
    act(() => {
      result.current.handleClick(42)
    })
    
    expect(result.current.count).toBe(1)
    expect(result.current.lastValue).toBe(42)
    
    act(() => {
      result.current.handleClick(100)
    })
    
    expect(result.current.count).toBe(2)
    expect(result.current.lastValue).toBe(100)
  })
  
  it('should work with keyboard event handlers', () => {
    const onKeyPress = vi.fn()
    
    const { rerender } = renderHook(
      ({ handler }) => {
        const stableHandler = useEventCallback(handler)
        
        useEffect(() => {
          const listener = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              stableHandler(e)
            }
          }
          
          window.addEventListener('keydown', listener)
          return () => window.removeEventListener('keydown', listener)
        }, [stableHandler])
        
        return stableHandler
      },
      { initialProps: { handler: onKeyPress } }
    )
    
    const newHandler = vi.fn()
    rerender({ handler: newHandler })
    
    // Simulate Enter key press
    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    window.dispatchEvent(event)
    
    expect(newHandler).toHaveBeenCalled()
    expect(onKeyPress).not.toHaveBeenCalled()
  })
  
  it('should work with scroll handlers', () => {
    const onScroll = vi.fn()
    
    const { rerender } = renderHook(
      ({ handler }) => {
        const stableHandler = useEventCallback(handler)
        
        useEffect(() => {
          const listener = () => {
            stableHandler(window.scrollY)
          }
          
          window.addEventListener('scroll', listener, { passive: true })
          return () => window.removeEventListener('scroll', listener)
        }, [stableHandler])
        
        return stableHandler
      },
      { initialProps: { handler: onScroll } }
    )
    
    const newHandler = vi.fn()
    rerender({ handler: newHandler })
    
    // Simulate scroll
    window.dispatchEvent(new Event('scroll'))
    
    expect(newHandler).toHaveBeenCalled()
    expect(onScroll).not.toHaveBeenCalled()
  })
})

describe('useStableCallback', () => {
  it('should be an alias for useEventCallback', () => {
    expect(useStableCallback).toBe(useEventCallback)
  })
  
  it('should work the same as useEventCallback', () => {
    const fn = vi.fn()
    
    const { result } = renderHook(() => useStableCallback(fn))
    
    result.current('test')
    
    expect(fn).toHaveBeenCalledWith('test')
  })
})
