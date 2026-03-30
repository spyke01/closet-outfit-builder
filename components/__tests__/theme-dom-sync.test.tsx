import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeDomSync } from '../theme-dom-sync';

const mockUseTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
}));

describe('ThemeDomSync', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('sets data-theme to light when the explicit theme is light', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', resolvedTheme: 'light' });

    render(<ThemeDomSync />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('removes data-theme for dark mode so dark stays the baseline', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    mockUseTheme.mockReturnValue({ theme: 'dark', resolvedTheme: 'dark' });

    render(<ThemeDomSync />);

    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('uses the resolved theme when the stored preference is system', () => {
    mockUseTheme.mockReturnValue({ theme: 'system', resolvedTheme: 'light' });

    render(<ThemeDomSync />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
