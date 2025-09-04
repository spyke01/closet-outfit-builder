import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentLocation,
  requestLocationPermission,
  isLocationAvailable,
  getLocationWithFallback,
  type LocationData
} from './locationService';

// Mock the navigator.geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
};

const mockPermissions = {
  query: vi.fn()
};

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    geolocation: mockGeolocation,
    permissions: mockPermissions
  },
  writable: true
});

describe('locationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentLocation', () => {
    it('should return location data when geolocation succeeds', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await getCurrentLocation();

      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        granted: true
      });
    });

    it('should handle permission denied error', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied the request for Geolocation.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const result = await getCurrentLocation();

      expect(result).toEqual({
        latitude: 0,
        longitude: 0,
        granted: false,
        error: 'Location access denied. Please enable location permissions to see weather information.'
      });
    });

    it('should handle position unavailable error', async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const result = await getCurrentLocation();

      expect(result).toEqual({
        latitude: 0,
        longitude: 0,
        granted: false,
        error: 'Location information is unavailable. Please check your device settings.'
      });
    });

    it('should handle timeout error', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        message: 'Timeout.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const result = await getCurrentLocation();

      expect(result).toEqual({
        latitude: 0,
        longitude: 0,
        granted: false,
        error: 'Location request timed out. Please try again.'
      });
    });

    it('should handle unsupported geolocation', async () => {
      // Temporarily remove geolocation support
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      global.navigator.geolocation = undefined;

      const result = await getCurrentLocation();

      expect(result).toEqual({
        latitude: 0,
        longitude: 0,
        granted: false,
        error: 'Geolocation is not supported by this browser'
      });

      // Restore geolocation
      global.navigator.geolocation = originalGeolocation;
    });
  });

  describe('requestLocationPermission', () => {
    it('should return permission state when permissions API is available', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });

      const result = await requestLocationPermission();

      expect(result).toBe('granted');
      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
    });

    it('should fallback to location test when permissions API is not available', async () => {
      // Temporarily remove permissions API
      const originalPermissions = global.navigator.permissions;
      // @ts-ignore
      global.navigator.permissions = undefined;

      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await requestLocationPermission();

      expect(result).toBe('granted');

      // Restore permissions API
      global.navigator.permissions = originalPermissions;
    });
  });

  describe('isLocationAvailable', () => {
    it('should return true when geolocation is supported and permission is granted', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });

      const result = await isLocationAvailable();

      expect(result).toBe(true);
    });

    it('should return true when geolocation is supported and permission is prompt', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'prompt' });

      const result = await isLocationAvailable();

      expect(result).toBe(true);
    });

    it('should return false when geolocation is not supported', async () => {
      // Temporarily remove geolocation support
      const originalGeolocation = global.navigator.geolocation;
      // @ts-ignore
      global.navigator.geolocation = undefined;

      const result = await isLocationAvailable();

      expect(result).toBe(false);

      // Restore geolocation
      global.navigator.geolocation = originalGeolocation;
    });
  });

  describe('getLocationWithFallback', () => {
    it('should return location when permission is granted', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });
      
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await getLocationWithFallback();

      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        granted: true
      });
    });

    it('should return fallback error when permission is denied', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'denied' });

      const result = await getLocationWithFallback();

      expect(result).toEqual({
        latitude: 0,
        longitude: 0,
        granted: false,
        error: 'Location permission denied. Weather information will not be available.'
      });
    });
  });
});