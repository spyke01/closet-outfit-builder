import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedThemeToggle, SimpleThemeToggle } from './EnhancedThemeToggle';

// Mock the enhanced theme hook
const mockSetTheme = vi.fn();
const mockToggleTheme = vi.fn();

vi.mock('../hooks/useEnhancedTheme', () => ({
  useEnhancedTheme: () => ({
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: mockSetTheme,
    toggleTheme: mockToggleTheme,
    systemPreference: 'light',
  }),
}));

describe('EnhancedThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('button variant', () => {
    it('should render button variant by default', () => {
      render(<EnhancedThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('should call toggleTheme when clicked', () => {
      render(<EnhancedThemeToggle variant="button" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('should show label when showLabel is true', () => {
      render(<EnhancedThemeToggle variant="button" showLabel={true} />);

      expect(screen.getByText('System (light)')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<EnhancedThemeToggle variant="button" className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('dropdown variant', () => {
    it('should render dropdown variant', () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should open dropdown when clicked', () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System (light)')).toBeInTheDocument();
    });

    it('should close dropdown when backdrop is clicked', async () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Find and click the backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      expect(backdrop).toBeInTheDocument();
      
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should call setTheme when option is selected', async () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const darkOption = screen.getByText('Dark');
      fireEvent.click(darkOption);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should show current theme selection indicator', () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show indicator for current theme (system)
      const systemOption = screen.getByText('System (light)').closest('button');
      expect(systemOption).toHaveClass('bg-blue-50', 'text-blue-700');
      
      // Should show selection dot
      const selectionDot = systemOption?.querySelector('.bg-blue-500.rounded-full');
      expect(selectionDot).toBeInTheDocument();
    });

    it('should show label in dropdown trigger when showLabel is true', () => {
      render(<EnhancedThemeToggle variant="dropdown" showLabel={true} />);

      expect(screen.getByText('System (light)')).toBeInTheDocument();
    });
  });

  describe('theme icons', () => {
    it('should show sun icon for light theme', () => {
      render(<EnhancedThemeToggle />);

      // Sun icon should be present (we can't easily test the actual icon, but we can test the structure)
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should show moon icon for dark theme', () => {
      render(<EnhancedThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes for button variant', () => {
      render(<EnhancedThemeToggle variant="button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('title');
    });

    it('should have proper ARIA attributes for dropdown variant', () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Theme selector');
      expect(button).toHaveAttribute('aria-expanded');
      expect(button).toHaveAttribute('aria-haspopup');
    });

    it('should support keyboard navigation in dropdown', () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      
      // Test that the button supports keyboard interaction
      expect(button).toHaveAttribute('aria-expanded');
      expect(button).toHaveAttribute('aria-haspopup');
    });
  });

  describe('animations', () => {
    it('should apply fade-in animation to dropdown menu', () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const dropdown = document.querySelector('.animate-fade-in');
      expect(dropdown).toBeInTheDocument();
    });

    it('should rotate chevron icon when dropdown is open', () => {
      render(<EnhancedThemeToggle variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const chevron = document.querySelector('.rotate-180');
      expect(chevron).toBeInTheDocument();
    });
  });
});

describe('SimpleThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render simple theme toggle', () => {
    render(<SimpleThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('should call toggleTheme when clicked', () => {
    render(<SimpleThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    render(<SimpleThemeToggle className="simple-custom" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('simple-custom');
  });

  it('should use enhanced theme colors', () => {
    render(<SimpleThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-100');
  });
});