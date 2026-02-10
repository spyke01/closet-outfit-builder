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

    it('should have dark mode background gradient', () => {
      const { container } = render(<HowItWorksPage />);
      
      const darkBg = container.querySelector('.dark\\:from-slate-900');
      expect(darkBg).toBeInTheDocument();
    });

    it('should have proper text styling', () => {
      const { container } = render(<HowItWorksPage />);
      
      const text = screen.getByText(/redirecting to how it works/i);
      expect(text.className).toContain('text-slate-600');
      expect(text.className).toContain('dark:text-slate-400');
    });
  });
});
