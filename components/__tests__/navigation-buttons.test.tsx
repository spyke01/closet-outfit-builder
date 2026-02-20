import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';
import { NavigationButtons } from '../navigation-buttons';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: function MockLink({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
}));

describe('NavigationButtons', () => {
  const mockBackTo = {
    href: '/test-path',
    label: 'Back to Test'
  };

  it('renders navigation button with correct label', () => {
    render(<NavigationButtons backTo={mockBackTo} />);
    
    // Check for the full label on desktop
    expect(screen.getByText('Back to Test')).toBeInTheDocument();
    
    // Check for the short label on mobile
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders with correct href', () => {
    render(<NavigationButtons backTo={mockBackTo} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test-path');
  });

  it('has proper accessibility attributes', () => {
    render(<NavigationButtons backTo={mockBackTo} />);
    
    // Check for navigation landmark
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Page navigation');
    
    // Check for button aria-label
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Navigate Back to Test');
  });

  it('applies custom className', () => {
    render(<NavigationButtons backTo={mockBackTo} className="custom-class" />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });

  it('has responsive design classes', () => {
    render(<NavigationButtons backTo={mockBackTo} />);
    
    // Check for responsive text classes
    const fullLabel = screen.getByText('Back to Test');
    expect(fullLabel).toHaveClass('hidden', 'sm:inline');
    
    const shortLabel = screen.getByText('Back');
    expect(shortLabel).toHaveClass('sm:hidden');
  });
});
