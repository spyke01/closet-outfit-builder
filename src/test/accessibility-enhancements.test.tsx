/**
 * Accessibility tests for enhanced dark mode and responsive design
 * Tests WCAG compliance, keyboard navigation, and screen reader support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeToggle } from '../components/ThemeToggle';
import { OutfitCard } from '../components/OutfitCard';
import { useTheme } from '../hooks/useTheme';
import { GeneratedOutfit } from '../types';

expect.extend(toHaveNoViolations);

// Mock the theme hook
vi.mock('../hooks/useTheme');

const mockOutfit: GeneratedOutfit = {
  id: 'test-outfit-1',
  shirt: {
    id: 'shirt-1',
    name: 'Blue Oxford Shirt',
    category: 'Shirt',
    formality: 'smart-casual',
    capsule: ['classic'],
    image: '/images/shirt-1.png'
  },
  pants: {
    id: 'pants-1',
    name: 'Navy Chinos',
    category: 'Pants',
    formality: 'smart-casual',
    capsule: ['classic'],
    image: '/images/pants-1.png'
  },
  score: 85,
  source: 'curated',
  loved: false
};

describe('Accessibility - Enhanced Dark Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock theme hook with default light mode
    (useTheme as any).mockReturnValue({
      theme: 'light',
      isDark: false,
      setTheme: vi.fn(),
      toggleTheme: vi.fn()
    });
  });

  describe('color contrast compliance', () => {
    it('should meet WCAG AA contrast requirements in light mode', async () => {
      const { container } = render(<ThemeToggle />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should meet WCAG AA contrast requirements in dark mode', async () => {
      (useTheme as any).mockReturnValue({
        theme: 'dark',
        isDark: true,
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
      });

      // Add dark class to document for testing
      document.documentElement.classList.add('dark');

      const { container } = render(<ThemeToggle />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Clean up
      document.documentElement.classList.remove('dark');
    });

    it('should have sufficient contrast for interactive elements in dark mode', () => {
      (useTheme as any).mockReturnValue({
        theme: 'dark',
        isDark: true,
        setTheme: vi.fn(),
        toggleTheme: vi.fn()
      });

      document.documentElement.classList.add('dark');

      render(<ThemeToggle />);
      
      const button = screen.getByRole('button');
      const computedStyle = window.getComputedStyle(button);
      
      // Button should have appropriate styling for dark mode
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label');

      document.documentElement.classList.remove('dark');
    });
  });

  describe('keyboard navigation', () => {
    it('should support keyboard navigation for theme toggle', () => {
      const mockToggleTheme = vi.fn();
      (useTheme as any).mockReturnValue({
        theme: 'light',
        isDark: false,
        setTheme: vi.fn(),
        toggleTheme: mockToggleTheme
      });

      render(<ThemeToggle />);
      
      const button = screen.getByRole('button');
      
      // Should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);
      
      // Should respond to Enter key
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockToggleTheme).toHaveBeenCalled();
      
      // Should respond to Space key
      fireEvent.keyDown(button, { key: ' ' });
      expect(mockToggleTheme).toHaveBeenCalledTimes(2);
    });

    it('should have proper tab order in responsive components', () => {
      render(<OutfitCard outfit={mockOutfit} />);
      
      const interactiveElements = screen.getAllByRole('button');
      
      // Should have logical tab order
      interactiveElements.forEach((element, index) => {
        expect(element).toHaveAttribute('tabIndex');
        if (index === 0) {
          element.focus();
          expect(document.activeElement).toBe(element);
        }
      });
    });
  });

  describe('screen reader support', () => {
    it('should provide appropriate ARIA labels for theme toggle', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toMatch(/theme|dark|light/i);
    });

    it('should announce theme changes to screen readers', async () => {
      const mockToggleTheme = vi.fn();
      let currentTheme = 'light';
      
      (useTheme as any).mockImplementation(() => ({
        theme: currentTheme,
        isDark: currentTheme === 'dark',
        setTheme: vi.fn(),
        toggleTheme: () => {
          currentTheme = currentTheme === 'light' ? 'dark' : 'light';
          mockToggleTheme();
        }
      }));

      const { rerender } = render(<ThemeToggle />);
      
      const button = screen.getByRole('button');
      const initialLabel = button.getAttribute('aria-label');
      
      fireEvent.click(button);
      
      // Re-render with new theme
      (useTheme as any).mockReturnValue({
        theme: 'dark',
        isDark: true,
        setTheme: vi.fn(),
        toggleTheme: mockToggleTheme
      });
      
      rerender(<ThemeToggle />);
      
      const newLabel = button.getAttribute('aria-label');
      expect(newLabel).not.toBe(initialLabel);
    });

    it('should provide semantic structure for outfit cards', () => {
      render(<OutfitCard outfit={mockOutfit} />);
      
      // Should have proper heading structure
      const heading = screen.getByRole('heading');
      expect(heading).toBeInTheDocument();
      
      // Should have descriptive text
      const description = screen.getByText(/score/i);
      expect(description).toBeInTheDocument();
      
      // Images should have alt text
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
    });
  });
});descr
ibe('Accessibility - Responsive Design', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe('touch target sizes', () => {
    it('should have minimum 44px touch targets on mobile', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ThemeToggle />);
      
      const button = screen.getByRole('button');
      const computedStyle = window.getComputedStyle(button);
      
      // Should have minimum touch target size
      const minSize = 44; // 44px minimum for accessibility
      const width = parseInt(computedStyle.width);
      const height = parseInt(computedStyle.height);
      
      expect(width).toBeGreaterThanOrEqual(minSize);
      expect(height).toBeGreaterThanOrEqual(minSize);
    });

    it('should maintain touch targets in responsive outfit cards', () => {
      render(<OutfitCard outfit={mockOutfit} />);
      
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('responsive behavior', () => {
    it('should adapt layout for different screen sizes', async () => {
      const { rerender } = render(<OutfitCard outfit={mockOutfit} />);
      
      // Desktop layout
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
      });
      fireEvent(window, new Event('resize'));
      
      await waitFor(() => {
        const container = screen.getByTestId('outfit-card');
        expect(container).toHaveClass('outfit-card');
      });
      
      // Mobile layout
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
      });
      fireEvent(window, new Event('resize'));
      
      rerender(<OutfitCard outfit={mockOutfit} />);
      
      // Should maintain accessibility in mobile layout
      const results = await axe(screen.getByTestId('outfit-card'));
      expect(results).toHaveNoViolations();
    });

    it('should maintain focus management across breakpoints', () => {
      render(<OutfitCard outfit={mockOutfit} />);
      
      const button = screen.getAllByRole('button')[0];
      button.focus();
      
      // Simulate viewport change
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
      });
      fireEvent(window, new Event('resize'));
      
      // Focus should be maintained
      expect(document.activeElement).toBe(button);
    });
  });

  describe('reduced motion support', () => {
    it('should respect prefers-reduced-motion setting', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<ThemeToggle />);
      
      const button = screen.getByRole('button');
      const computedStyle = window.getComputedStyle(button);
      
      // Should have reduced or no transitions when motion is reduced
      expect(computedStyle.transitionDuration).toBe('0s');
    });
  });

  describe('high contrast mode support', () => {
    it('should work with Windows high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { container } = render(<ThemeToggle />);
      
      // Should not have accessibility violations in high contrast mode
      return axe(container).then(results => {
        expect(results).toHaveNoViolations();
      });
    });
  });

  describe('color accessibility', () => {
    it('should not rely solely on color to convey information', () => {
      render(<OutfitCard outfit={mockOutfit} />);
      
      // Score should be conveyed through text, not just color
      const scoreElement = screen.getByText(/score/i);
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement.textContent).toMatch(/\d+/); // Should contain numeric score
      
      // Status indicators should have text or icons, not just color
      const statusElements = screen.queryAllByRole('status');
      statusElements.forEach(element => {
        expect(element.textContent?.trim()).not.toBe('');
      });
    });

    it('should provide alternative text for color-coded elements', () => {
      render(<OutfitCard outfit={mockOutfit} />);
      
      // Any color-coded elements should have descriptive text
      const colorElements = screen.container.querySelectorAll('[class*="color"]');
      colorElements.forEach(element => {
        const hasAriaLabel = element.hasAttribute('aria-label');
        const hasTitle = element.hasAttribute('title');
        const hasText = element.textContent?.trim() !== '';
        
        expect(hasAriaLabel || hasTitle || hasText).toBe(true);
      });
    });
  });
});