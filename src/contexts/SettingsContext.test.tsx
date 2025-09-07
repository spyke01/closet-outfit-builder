import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { SettingsProvider, useSettings } from './SettingsContext';

// Test component that uses the settings context
const TestComponent = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  
  return (
    <div>
      <div data-testid="show-brand">{settings.showBrand.toString()}</div>
      <button 
        data-testid="toggle-brand" 
        onClick={() => updateSettings({ showBrand: !settings.showBrand })}
      >
        Toggle Brand
      </button>
      <button 
        data-testid="reset-settings" 
        onClick={resetSettings}
      >
        Reset
      </button>
    </div>
  );
};

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

describe('SettingsContext', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    // Suppress console warnings for tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide default settings', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('show-brand')).toHaveTextContent('false');
  });

  it('should update settings', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    act(() => {
      screen.getByTestId('toggle-brand').click();
    });

    expect(screen.getByTestId('show-brand')).toHaveTextContent('true');
  });

  it('should reset settings to defaults', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    // First toggle to true
    act(() => {
      screen.getByTestId('toggle-brand').click();
    });
    expect(screen.getByTestId('show-brand')).toHaveTextContent('true');

    // Then reset
    act(() => {
      screen.getByTestId('reset-settings').click();
    });
    expect(screen.getByTestId('show-brand')).toHaveTextContent('false');
  });

  it('should persist settings to localStorage', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    act(() => {
      screen.getByTestId('toggle-brand').click();
    });

    const storedSettings = mockLocalStorage.getItem('closet-outfit-builder-settings');
    expect(storedSettings).toBe('{"showBrand":true}');
  });

  it('should load settings from localStorage', () => {
    // Pre-populate localStorage
    mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":true}');

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('show-brand')).toHaveTextContent('true');
  });

  it('should handle invalid localStorage data gracefully', () => {
    // Set invalid JSON in localStorage
    mockLocalStorage.setItem('closet-outfit-builder-settings', 'invalid-json');

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    // Should fall back to default settings
    expect(screen.getByTestId('show-brand')).toHaveTextContent('false');
  });

  it('should validate settings from localStorage', () => {
    // Set settings with invalid showBrand value
    mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":"invalid"}');

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    // Should fall back to default value
    expect(screen.getByTestId('show-brand')).toHaveTextContent('false');
  });

  it('should throw error when useSettings is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSettings must be used within a SettingsProvider');

    consoleSpy.mockRestore();
  });
});