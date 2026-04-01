/**
 * Unit tests for How It Works Page (Redirect)
 * Validates: page redirects to homepage section
 * Requirements: 3.1, 3.2, 3.3
 * 
 * Note: The How It Works page now redirects to /#how-it-works on the homepage
 * to avoid content duplication. The actual content is tested in the homepage
 * How It Works section tests.
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';

const mockRedirect = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import HowItWorksPage from '../page';

describe('HowItWorksPage - Redirect Tests', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it('should redirect to the homepage anchor', () => {
    HowItWorksPage();

    expect(mockRedirect).toHaveBeenCalledWith('/#how-it-works');
  });

  it('should not render local page content', () => {
    const result = HowItWorksPage();

    expect(result).toBeUndefined();
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it('should continue using the homepage section as the canonical destination', () => {
    HowItWorksPage();

    expect(mockRedirect).not.toHaveBeenCalledWith('/how-it-works');
    expect(mockRedirect).toHaveBeenCalledWith('/#how-it-works');
  });

  describe('Redirect Behavior', () => {
    it('should call redirect with correct hash anchor', () => {
      HowItWorksPage();

      expect(mockRedirect).toHaveBeenCalledWith('/#how-it-works');
    });
  });
});
