import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScrollToTop } from './ScrollToTop';

// Mock window.scrollTo
const mockScrollTo = vi.fn();
Object.defineProperty(window, 'scrollTo', {
  value: mockScrollTo,
  writable: true
});

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset scroll position
    Object.defineProperty(window, 'pageYOffset', {
      value: 0,
      writable: true
    });
  });

  afterEach(() => {
    // Clean up event listeners
    window.removeEventListener('scroll', vi.fn());
  });

  it('does not render when page is not scrolled', () => {
    render(<ScrollToTop />);
    
    const button = screen.queryByRole('button', { name: /scroll to top/i });
    expect(button).not.toBeInTheDocument();
  });

  it('renders when page is scrolled down more than 300px', () => {
    render(<ScrollToTop />);
    
    // Simulate scroll down
    Object.defineProperty(window, 'pageYOffset', {
      value: 400,
      writable: true
    });
    
    // Trigger scroll event
    fireEvent.scroll(window);
    
    const button = screen.getByRole('button', { name: /scroll to top/i });
    expect(button).toBeInTheDocument();
  });

  it('calls window.scrollTo when clicked', () => {
    render(<ScrollToTop />);
    
    // Simulate scroll down to make button visible
    Object.defineProperty(window, 'pageYOffset', {
      value: 400,
      writable: true
    });
    fireEvent.scroll(window);
    
    const button = screen.getByRole('button', { name: /scroll to top/i });
    fireEvent.click(button);
    
    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth'
    });
  });

  it('hides when scrolled back to top', () => {
    render(<ScrollToTop />);
    
    // First scroll down to show button
    Object.defineProperty(window, 'pageYOffset', {
      value: 400,
      writable: true
    });
    fireEvent.scroll(window);
    
    let button = screen.getByRole('button', { name: /scroll to top/i });
    expect(button).toBeInTheDocument();
    
    // Then scroll back to top
    Object.defineProperty(window, 'pageYOffset', {
      value: 0,
      writable: true
    });
    fireEvent.scroll(window);
    
    button = screen.queryByRole('button', { name: /scroll to top/i });
    expect(button).not.toBeInTheDocument();
  });

  it('has proper styling classes', () => {
    render(<ScrollToTop />);
    
    // Simulate scroll down to make button visible
    Object.defineProperty(window, 'pageYOffset', {
      value: 400,
      writable: true
    });
    fireEvent.scroll(window);
    
    const button = screen.getByRole('button', { name: /scroll to top/i });
    expect(button).toHaveClass(
      'fixed',
      'bottom-6',
      'right-6',
      'z-50',
      'p-3',
      'bg-slate-800',
      'text-white',
      'rounded-full',
      'shadow-lg',
      'hover:bg-slate-700',
      'transition-all',
      'duration-300',
      'hover:scale-110'
    );
  });
});