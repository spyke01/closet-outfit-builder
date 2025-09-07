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
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const renderSettingsPage = (onBack = vi.fn()) => {
  return render(
    <ThemeProvider>
      <SettingsProvider>
        <SettingsPage onBack={onBack} />
      </SettingsProvider>
    </ThemeProvider>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('should render settings page with correct title', () => {
    renderSettingsPage();
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Display Settings')).toBeInTheDocument();
    expect(screen.getByText('Show Brand Names')).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', () => {
    const onBack = vi.fn();
    renderSettingsPage(onBack);
    
    const backButton = screen.getByLabelText('Go back');
    fireEvent.click(backButton);
    
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should toggle brand display setting', () => {
    renderSettingsPage();
    
    const toggle = screen.getByRole('switch', { name: 'Toggle brand display' });
    
    // Initially should be false (unchecked)
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    // Click to toggle
    fireEvent.click(toggle);
    
    // Should now be true (checked)
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('should persist toggle state', () => {
    renderSettingsPage();
    
    const toggle = screen.getByRole('switch', { name: 'Toggle brand display' });
    
    // Toggle on
    fireEvent.click(toggle);
    
    // Check localStorage was updated
    const storedSettings = mockLocalStorage.getItem('closet-outfit-builder-settings');
    expect(storedSettings).toBe('{"showBrand":true}');
  });

  it('should reset settings when reset button is clicked', () => {
    // Pre-set some settings
    mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":true}');
    
    renderSettingsPage();
    
    const toggle = screen.getByRole('switch', { name: 'Toggle brand display' });
    const resetButton = screen.getByText('Reset all settings to defaults');
    
    // Should start as true from localStorage
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    
    // Click reset
    fireEvent.click(resetButton);
    
    // Should now be false (default)
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    // Check localStorage was updated
    const storedSettings = mockLocalStorage.getItem('closet-outfit-builder-settings');
    expect(storedSettings).toBe('{"showBrand":false}');
  });

  it('should display correct description text', () => {
    renderSettingsPage();
    
    expect(screen.getByText(/Display brand information in item names when available/)).toBeInTheDocument();
    expect(screen.getByText(/A smart wardrobe management and outfit generation application/)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    renderSettingsPage();
    
    const brandToggle = screen.getByRole('switch', { name: 'Toggle brand display' });
    const themeToggle = screen.getByRole('switch', { name: /Switch to .* mode/ });
    const backButton = screen.getByLabelText('Go back');
    
    expect(brandToggle).toHaveAttribute('role', 'switch');
    expect(brandToggle).toHaveAttribute('aria-checked');
    expect(themeToggle).toHaveAttribute('role', 'switch');
    expect(themeToggle).toHaveAttribute('aria-checked');
    expect(backButton).toHaveAttribute('aria-label', 'Go back');
  });

  it('should render theme toggle with correct labels', () => {
    renderSettingsPage();
    
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    expect(screen.getByText('Switch between light and dark theme for better viewing experience')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('should toggle theme when theme toggle is clicked', () => {
    renderSettingsPage();
    
    const themeToggle = screen.getByRole('switch', { name: /Switch to .* mode/ });
    
    // Initially should be light mode (unchecked)
    expect(themeToggle).toHaveAttribute('aria-checked', 'false');
    
    // Click to toggle to dark mode
    fireEvent.click(themeToggle);
    
    // Should now be dark mode (checked)
    expect(themeToggle).toHaveAttribute('aria-checked', 'true');
  });
});