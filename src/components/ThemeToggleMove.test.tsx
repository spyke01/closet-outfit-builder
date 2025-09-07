import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { TopBar } from './TopBar';
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

describe('Theme Toggle Location', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('should NOT have theme toggle in TopBar', () => {
    render(
      <ThemeProvider>
        <TopBar 
          onTitleClick={vi.fn()} 
          onSettingsClick={vi.fn()}
          weatherForecast={[]}
          weatherLoading={false}
          weatherError={null}
          onWeatherRetry={vi.fn()}
        />
      </ThemeProvider>
    );

    // Should not find theme toggle elements (Sun/Moon icons or theme-related buttons)
    expect(screen.queryByLabelText(/Switch to .* mode/)).not.toBeInTheDocument();
    
    // Should still have settings button
    expect(screen.getByLabelText('Open settings')).toBeInTheDocument();
  });

  it('should have theme toggle in SettingsPage', () => {
    render(
      <ThemeProvider>
        <SettingsProvider>
          <SettingsPage onBack={vi.fn()} />
        </SettingsProvider>
      </ThemeProvider>
    );

    // Should find theme toggle elements
    expect(screen.getByRole('switch', { name: /Switch to .* mode/ })).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('should have both brand toggle and theme toggle in SettingsPage', () => {
    render(
      <ThemeProvider>
        <SettingsProvider>
          <SettingsPage onBack={vi.fn()} />
        </SettingsProvider>
      </ThemeProvider>
    );

    // Should have both toggles
    expect(screen.getByRole('switch', { name: 'Toggle brand display' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Switch to .* mode/ })).toBeInTheDocument();
    
    // Should have both section titles
    expect(screen.getByText('Show Brand Names')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });
});