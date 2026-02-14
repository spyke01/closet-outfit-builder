/**
 * Unit tests for How It Works Page (Redirect)
 * Validates: page redirects to homepage section
 * Requirements: 3.1, 3.2, 3.3
 * 
 * Note: The How It Works page now redirects to /#how-it-works on the homepage
 * to avoid content duplication. The actual content is tested in the homepage
 * How It Works section tests.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorksPage from '../page';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('HowItWorksPage - Redirect Tests', () => {
  describe('Redirect Behavior', () => {
    it('should render redirect message', () => {
      render(<HowItWorksPage />);
      
      expect(screen.getByText(/redirecting to how it works/i)).toBeInTheDocument();
    });

    it('should call router.push with correct hash anchor', () => {
      render(<HowItWorksPage />);
      
      expect(mockPush).toHaveBeenCalledWith('/#how-it-works');
    });

    it('should have semantic background gradient classes', () => {
      const { container } = render(<HowItWorksPage />);
      
      const gradientContainer = container.querySelector('.bg-gradient-to-br');
      expect(gradientContainer).toBeInTheDocument();
      expect(gradientContainer).toHaveClass('from-background');
      expect(gradientContainer).toHaveClass('via-card');
      expect(gradientContainer).toHaveClass('to-background');
    });

    it('should have proper text styling', () => {
      render(<HowItWorksPage />);
      
      const text = screen.getByText(/redirecting to how it works/i);
      expect(text.className).toContain('text-muted-foreground');
      expect(text.className).toContain('text-muted-foreground');
    });
  });
});
