import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFeatureFlags,
  isFeatureEnabled,
  conditionalImport,
  setFeatureFlags,
  resetFeatureFlags,
} from '../feature-flags';

// Mock window and localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Feature Flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    vi.stubEnv('NODE_ENV', 'development');
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  describe('getFeatureFlags', () => {
    it('should return default flags based on environment', () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockLocalStorage.getItem.mockReturnValue(null);

      const flags = getFeatureFlags();

      expect(flags).toEqual({
        weather: true,
        imageProcessing: true,
        monitoring: true,
        analytics: true,
        devTools: false,
        sizeManagement: true,
      });
    });

    it('should return development flags', () => {
      vi.stubEnv('NODE_ENV', 'development');
      mockLocalStorage.getItem.mockReturnValue(null);

      const flags = getFeatureFlags();

      expect(flags).toEqual({
        weather: true,
        imageProcessing: true,
        monitoring: false,
        analytics: false,
        devTools: true,
        sizeManagement: true,
      });
    });

    it('should override flags from URL parameters', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?disable-weather=true&disable-monitoring=true',
        },
        writable: true,
      });

      mockLocalStorage.getItem.mockReturnValue(null);

      const flags = getFeatureFlags();

      expect(flags.weather).toBe(false);
      expect(flags.monitoring).toBe(false);
    });

    it('should load flags from localStorage', () => {
      const storedFlags = {
        weather: false,
        monitoring: true,
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedFlags));

      const flags = getFeatureFlags();

      expect(flags.weather).toBe(false);
      expect(flags.monitoring).toBe(true);
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const flags = getFeatureFlags();

      expect(flags).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read feature flags from localStorage:')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled features', () => {
      vi.stubEnv('NODE_ENV', 'development');
      mockLocalStorage.getItem.mockReturnValue(null);

      expect(isFeatureEnabled('devTools')).toBe(true);
      expect(isFeatureEnabled('weather')).toBe(true);
    });

    it('should return false for disabled features', () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockLocalStorage.getItem.mockReturnValue(null);

      expect(isFeatureEnabled('devTools')).toBe(false);
    });
  });

  describe('conditionalImport', () => {
    it('should import module when feature is enabled', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      mockLocalStorage.getItem.mockReturnValue(null);

      const mockModule = { default: 'test-module' };
      const importFn = vi.fn().mockResolvedValue(mockModule);

      const result = await conditionalImport('devTools', importFn);

      expect(importFn).toHaveBeenCalled();
      expect(result).toBe(mockModule);
    });

    it('should return null when feature is disabled', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockLocalStorage.getItem.mockReturnValue(null);

      const importFn = vi.fn();

      const result = await conditionalImport('devTools', importFn);

      expect(importFn).not.toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('should return null in SSR environment', async () => {
      // Mock SSR environment safely
      vi.stubGlobal('window', undefined);

      const importFn = vi.fn();

      const result = await conditionalImport('weather', importFn);

      expect(importFn).not.toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('should handle import errors gracefully', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      mockLocalStorage.getItem.mockReturnValue(null);

      const importFn = vi.fn().mockRejectedValue(new Error('Import failed'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await conditionalImport('devTools', importFn);

      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load module for feature devTools:')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('setFeatureFlags', () => {
    it('should save flags to localStorage', () => {
      // Mock existing flags
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        weather: true,
        imageProcessing: true,
        monitoring: false,
        analytics: false,
        devTools: true,
        sizeManagement: true,
      }));

      const newFlags = { weather: false, monitoring: true };

      setFeatureFlags(newFlags);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'feature-flags',
        JSON.stringify({
          weather: false,
          imageProcessing: true,
          monitoring: true,
          analytics: false,
          devTools: true,
          sizeManagement: true,
        })
      );
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      setFeatureFlags({ weather: false });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save feature flags to localStorage:')
      );

      consoleSpy.mockRestore();
    });

    it('should not run in SSR environment', () => {
      // Mock SSR environment safely
      vi.stubGlobal('window', undefined);

      setFeatureFlags({ weather: false });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('resetFeatureFlags', () => {
    it('should remove flags from localStorage', () => {
      resetFeatureFlags();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('feature-flags');
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      resetFeatureFlags();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to reset feature flags:')
      );

      consoleSpy.mockRestore();
    });
  });
});
