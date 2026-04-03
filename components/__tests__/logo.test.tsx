import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Logo } from '../logo';

const mockUseTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
}));

describe('Logo', () => {
  it('uses the light logo when the active theme is light', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', resolvedTheme: 'light' });

    render(<Logo className="h-12 w-auto" title="My AI Outfit" />);

    expect(screen.getByAltText('My AI Outfit')).toHaveAttribute('src', '/my-ai-outfit-logo-light-bg.png');
  });

  it('uses the dark logo when the active theme is dark', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', resolvedTheme: 'dark' });

    render(<Logo className="h-12 w-auto" title="My AI Outfit" />);

    expect(screen.getByAltText('My AI Outfit')).toHaveAttribute('src', '/my-ai-outfit-logo-dark-bg.png');
  });

  it('uses the resolved theme when the stored preference is system', () => {
    mockUseTheme.mockReturnValue({ theme: 'system', resolvedTheme: 'light' });

    render(<Logo className="h-12 w-auto" title="My AI Outfit" />);

    expect(screen.getByAltText('My AI Outfit')).toHaveAttribute('src', '/my-ai-outfit-logo-light-bg.png');
  });
});
