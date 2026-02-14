import { renderHook } from '@testing-library/react'
import { useLatest } from '../use-latest'
import { describe, it, expect, vi } from 'vitest'
import { useEffect, useState } from 'react'

describe('useLatest', () => {
  it('should return a ref with the initial value', () => {
    const { result } = renderHook(() => useLatest(42))
    
    expect(result.current.current).toBe(42)
  })
  
  it('should update ref when value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: 'initial' } }
    )
    
    expect(result.current.current).toBe('initial')
    
    rerender({ value: 'updated' })
    
    expect(result.current.current).toBe('updated')
  })
  
  it('should maintain stable ref identity across renders', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: 1 } }
    )
    
    const firstRef = result.current
    
    rerender({ value: 2 })
    
    const secondRef = result.current
    
    // Ref object itself should be the same
    expect(firstRef).toBe(secondRef)
    // But the value should be updated
    expect(secondRef.current).toBe(2)
  })
  
  it('should prevent stale closures in callbacks', () => {
    const callback = vi.fn()
    
    const { rerender } = renderHook(
      ({ onCallback }) => {
        const callbackRef = useLatest(onCallback)
        
        useEffect(() => {
          const timeout = setTimeout(() => {
            callbackRef.current('test')
          }, 100)
          return () => clearTimeout(timeout)
        }, [callbackRef])
        
        return callbackRef
      },
      { initialProps: { onCallback: callback } }
    )
    
    const newCallback = vi.fn()
    rerender({ onCallback: newCallback })
    
    // Wait for timeout
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Should call the NEW callback, not the old one
        expect(newCallback).toHaveBeenCalledWith('test')
        expect(callback).not.toHaveBeenCalled()
        resolve()
      }, 150)
    })
  })
  
  it('should work with debounced search example', () => {
    const onSearch = vi.fn()
    
    const { result, rerender } = renderHook(
      ({ searchFn }) => {
        const [query, setQuery] = useState('')
        const onSearchRef = useLatest(searchFn)
        
        useEffect(() => {
          const timeout = setTimeout(() => {
            if (query) {
              onSearchRef.current(query)
            }
          }, 300)
          return () => clearTimeout(timeout)
        }, [query, onSearchRef])
        
        return { setQuery, onSearchRef }
      },
      { initialProps: { searchFn: onSearch } }
    )
    
    // Update query
    result.current.setQuery('test query')
    
    // Update search function before timeout fires
    const newOnSearch = vi.fn()
    rerender({ searchFn: newOnSearch })
    
    // Wait for debounce
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Should call the NEW search function
        expect(newOnSearch).toHaveBeenCalledWith('test query')
        expect(onSearch).not.toHaveBeenCalled()
        resolve()
      }, 350)
    })
  })
  
  it('should handle object values', () => {
    const obj1 = { id: 1, name: 'first' }
    const obj2 = { id: 2, name: 'second' }
    
    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: obj1 } }
    )
    
    expect(result.current.current).toBe(obj1)
    
    rerender({ value: obj2 })
    
    expect(result.current.current).toBe(obj2)
  })
  
  it('should handle function values', () => {
    const fn1 = () => 'first'
    const fn2 = () => 'second'
    
    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: fn1 } }
    )
    
    expect(result.current.current()).toBe('first')
    
    rerender({ value: fn2 })
    
    expect(result.current.current()).toBe('second')
  })
  
  it('should work with event handlers in subscriptions', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    
    const { rerender } = renderHook(
      ({ handler }) => {
        const handlerRef = useLatest(handler)
        
        useEffect(() => {
          const listener = (e: Event) => {
            handlerRef.current(e)
          }
          
          window.addEventListener('custom-event', listener)
          return () => window.removeEventListener('custom-event', listener)
        }, [handlerRef])
        
        return handlerRef
      },
      { initialProps: { handler: handler1 } }
    )
    
    // Update handler
    rerender({ handler: handler2 })
    
    // Dispatch event
    const event = new Event('custom-event')
    window.dispatchEvent(event)
    
    // Should call the NEW handler
    expect(handler2).toHaveBeenCalledWith(event)
    expect(handler1).not.toHaveBeenCalled()
  })
})
