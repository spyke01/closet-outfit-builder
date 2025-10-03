import { renderHook, act } from '@testing-library/react';
import { useEnhancedTheme, useIsDark, useSystemPreference } from './useEnhancedTheme';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
});

describe('useEnhancedTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Default to light mode
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    
    // Reset document classes
    document.documentElement.className = '';
  });

  describe('initialization', () => {
    it('should initialize with system theme when no saved preference', () => {
      const { result } = renderHook(() => useEnhancedTheme());

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(result.current.systemPreference).toBe('light');
    });

    it('should initialize with saved theme preference', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      const { result } = renderHook(() => useEnhancedTheme());

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should detect dark system preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useEnhancedTheme());

      expect(result.current.systemPreference).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });
  });

  describe('theme setting', () => {
    it('should set theme and persist to localStorage', () => {
      const { result } = renderHook(() => useEnhancedTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('enhanced-theme-preference', 'dark');
    });

    it('should apply dark class to document when dark theme is set', () => {
      const { result } = renderHook(() => useEnhancedTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when light theme is set', () => {
      document.documentElement.classList.add('dark');
      const { result } = renderHook(() => useEnhancedTheme());

      act(() => {
        result.current.setTheme('light');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('theme toggling', () => {
    it('should toggle from light to dark', () => {
      mockLocalStorage.getItem.mockReturnValue('light');
      const { result } = renderHook(() => useEnhancedTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should toggle from dark to light', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');
      const { result } = renderHook(() => useEnhancedTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should toggle from system to opposite of system preference', () => {
      // System preference is light (default)
      const { result } = renderHook(() => useEnhancedTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should toggle from system (dark) to light', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useEnhancedTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('system preference changes', () => {
    it('should update system preference when media query changes', () => {
      const mockAddEventListener = vi.fn();
      const mockRemoveEventListener = vi.fn();
      
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const { result } = renderHook(() => useEnhancedTheme());

      // Simulate system preference change to dark
      const changeHandler = mockAddEventListener.mock.calls[0][1];
      act(() => {
        changeHandler({ matches: true });
      });

      expect(result.current.systemPreference).toBe('dark');
      
      // If theme is system, resolved theme should also change
      if (result.current.theme === 'system') {
        expect(result.current.resolvedTheme).toBe('dark');
        expect(result.current.isDark).toBe(true);
      }
    });

    it('should clean up event listener on unmount', () => {
      const mockAddEventListener = vi.fn();
      const mockRemoveEventListener = vi.fn();
      
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const { unmount } = renderHook(() => useEnhancedTheme());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalled();
    });
  });

  describe('resolved theme logic', () => {
    it('should resolve system theme to system preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useEnhancedTheme());

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should resolve explicit theme to itself', () => {
      mockLocalStorage.getItem.mockReturnValue('light');
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark, but user chose light
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useEnhancedTheme());

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });
  });
});

describe('useIsDark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('should return false for light theme', () => {
    mockLocalStorage.getItem.mockReturnValue('light');
    const { result } = renderHook(() => useIsDark());

    expect(result.current).toBe(false);
  });

  it('should return true for dark theme', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');
    const { result } = renderHook(() => useIsDark());

    expect(result.current).toBe(true);
  });
});

describe('useSystemPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return light when system prefers light', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useSystemPreference());

    expect(result.current).toBe('light');
  });

  it('should return dark when system prefers dark', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useSystemPreference());

    expect(result.current).toBe('dark');
  });

  it('should update when system preference changes', () => {
    const mockAddEventListener = vi.fn();
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useSystemPreference());

    expect(result.current).toBe('light');

    // Simulate system preference change
    const changeHandler = mockAddEventListener.mock.calls[0][1];
    act(() => {
      changeHandler({ matches: true });
    });

    expect(result.current).toBe('dark');
  });
});