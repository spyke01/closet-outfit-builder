import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { SettingsProvider } from '../contexts/SettingsContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock matchMedia for ThemeContext
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('Toggle Green Styling', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('should apply green background when brand toggle is enabled', () => {
    render(
      <ThemeProvider>
        <SettingsProvider>
          <SettingsPage onBack={vi.fn()} />
        </SettingsProvider>
      </ThemeProvider>
    );

    const brandToggle = screen.getByRole('switch', { name: 'Toggle brand display' });
    
    // Initially should not have green background (disabled state)
    expect(brandToggle).toHaveClass('bg-stone-200');
    expect(brandToggle).not.toHaveClass('bg-green-600');
    
    // Click to enable
    fireEvent.click(brandToggle);
    
    // Should now have green background (enabled state)
    expect(brandToggle).toHaveClass('bg-green-600');
    expect(brandToggle).not.toHaveClass('bg-stone-200');
  });

  it('should apply green background when theme toggle is enabled (dark mode)', () => {
    render(
      <ThemeProvider>
        <SettingsProvider>
          <SettingsPage onBack={vi.fn()} />
        </SettingsProvider>
      </ThemeProvider>
    );

    const themeToggle = screen.getByRole('switch', { name: /Switch to .* mode/ });
    
    // Initially should not have green background (light mode)
    expect(themeToggle).toHaveClass('bg-stone-200');
    expect(themeToggle).not.toHaveClass('bg-green-600');
    
    // Click to enable dark mode
    fireEvent.click(themeToggle);
    
    // Should now have green background (dark mode enabled)
    expect(themeToggle).toHaveClass('bg-green-600');
    expect(themeToggle).not.toHaveClass('bg-stone-200');
  });

  it('should have green focus ring for both toggles', () => {
    render(
      <ThemeProvider>
        <SettingsProvider>
          <SettingsPage onBack={vi.fn()} />
        </SettingsProvider>
      </ThemeProvider>
    );

    const brandToggle = screen.getByRole('switch', { name: 'Toggle brand display' });
    const themeToggle = screen.getByRole('switch', { name: /Switch to .* mode/ });
    
    // Both toggles should have green focus ring
    expect(brandToggle).toHaveClass('focus:ring-green-500');
    expect(themeToggle).toHaveClass('focus:ring-green-500');
  });

  it('should toggle between gray and green backgrounds correctly', () => {
    render(
      <ThemeProvider>
        <SettingsProvider>
          <SettingsPage onBack={vi.fn()} />
        </SettingsProvider>
      </ThemeProvider>
    );

    const brandToggle = screen.getByRole('switch', { name: 'Toggle brand display' });
    
    // Start with gray background
    expect(brandToggle).toHaveClass('bg-stone-200');
    
    // Toggle to green
    fireEvent.click(brandToggle);
    expect(brandToggle).toHaveClass('bg-green-600');
    
    // Toggle back to gray
    fireEvent.click(brandToggle);
    expect(brandToggle).toHaveClass('bg-stone-200');
    expect(brandToggle).not.toHaveClass('bg-green-600');
  });
});