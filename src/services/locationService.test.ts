/**
 * Comprehensive tests for location service error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getCurrentLocation, 
  requestLocationPermission, 
  isLocationAvailable,
  getLocationWithFallback,
  isLocationPermissionDenied,
  getLocationErrorGuidance
} from './locationService';

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
};

// Mock navigator.permissions
const mockPermissions = {
  query: vi.fn()
};

// Mock GeolocationPositionError class for testing
class MockGeolocationPositionError extends Error implements GeolocationPositionError {
  readonly PERMISSION_DENIED = 1;
  readonly POSITION_UNAVAILABLE = 2;
  readonly TIMEOUT = 3;
  
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'GeolocationPositionError';
  }
}

// Make it available globally for the tests
(global as any).GeolocationPositionError = MockGeolocationPositionError;

describe('Location Service Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup navigator mocks
    Object.defineProperty((global as any).navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true
    });
    
    Object.defineProperty((global as any).navigator, 'permissions', {
      value: mockPermissions,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentLocation Error Handling', () => {
    it('should handle permission denied error', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError;

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const result = await getCurrentLocation();
      
      expect(result.granted).toBe(false);
      expect(result.error).toContain('Location access denied');
      expect(result.error).toContain('Click the location icon');
    });

    it('should handle position unavailable error', async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError;

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const result = await getCurrentLocation();
      
      expect(result.granted).toBe(false);
      expect(result.error).toContain('Your location could not be determined');
      expect(result.error).toContain('Location services are enabled on your device');
    });

    it('should handle timeout error', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError;

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const result = await getCurrentLocation();
      
      expect(result.granted).toBe(false);
      expect(result.error).toContain('Location request timed out');
      expect(result.error).toContain('Weak GPS signal');
    });

    it('should handle unknown error', async () => {
      const mockError = {
        code: 999, // Unknown error code
        message: 'Unknown error',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError;

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const result = await getCurrentLocation();
      
      expect(result.granted).toBe(false);
      expect(result.error).toContain('Unable to access your location');
    });

    it('should handle successful location retrieval', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 100,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await getCurrentLocation();
      
      expect(result.granted).toBe(true);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.error).toBeUndefined();
    });

    it('should handle missing geolocation support', async () => {
      // Remove geolocation support
      Object.defineProperty((global as any).navigator, 'geolocation', {
        value: undefined,
        writable: true
      });

      const result = await getCurrentLocation();
      
      expect(result.granted).toBe(false);
      expect(result.error).toBe('Geolocation is not supported by this browser');
    });
  });

  describe('Permission Handling', () => {
    it('should check permission status when permissions API is available', async () => {
      mockPermissions.query.mockResolvedValueOnce({ state: 'granted' });

      const permission = await requestLocationPermission();
      
      expect(permission).toBe('granted');
      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
    });

    it('should handle permission denied status', async () => {
      mockPermissions.query.mockResolvedValueOnce({ state: 'denied' });

      const isDenied = await isLocationPermissionDenied();
      
      expect(isDenied).toBe(true);
    });

    it('should fallback when permissions API is not available', async () => {
      Object.defineProperty((global as any).navigator, 'permissions', {
        value: undefined,
        writable: true
      });

      const mockPosition = {
        coords: { latitude: 40.7128, longitude: -74.0060 }
      } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const permission = await requestLocationPermission();
      
      expect(permission).toBe('granted');
    });

    it('should handle permissions API query failure', async () => {
      mockPermissions.query.mockRejectedValueOnce(new Error('Permission query failed'));

      const permission = await requestLocationPermission();
      
      expect(permission).toBe('prompt');
    });
  });

  describe('Location Availability Check', () => {
    it('should return false when geolocation is not supported', async () => {
      Object.defineProperty((global as any).navigator, 'geolocation', {
        value: undefined,
        writable: true
      });

      const available = await isLocationAvailable();
      
      expect(available).toBe(false);
    });

    it('should return true when permission is granted', async () => {
      mockPermissions.query.mockResolvedValueOnce({ state: 'granted' });

      const available = await isLocationAvailable();
      
      expect(available).toBe(true);
    });

    it('should return true when permission is prompt', async () => {
      mockPermissions.query.mockResolvedValueOnce({ state: 'prompt' });

      const available = await isLocationAvailable();
      
      expect(available).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      mockPermissions.query.mockResolvedValueOnce({ state: 'denied' });

      const available = await isLocationAvailable();
      
      expect(available).toBe(false);
    });
  });

  describe('Fallback Handling', () => {
    it('should return error when permission is denied', async () => {
      mockPermissions.query.mockResolvedValueOnce({ state: 'denied' });

      const result = await getLocationWithFallback();
      
      expect(result.granted).toBe(false);
      expect(result.error).toContain('Location permission denied');
    });

    it('should attempt to get location when permission is not denied', async () => {
      mockPermissions.query.mockResolvedValueOnce({ state: 'granted' });
      
      const mockPosition = {
        coords: { latitude: 40.7128, longitude: -74.0060 }
      } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await getLocationWithFallback();
      
      expect(result.granted).toBe(true);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });
  });

  describe('Error Guidance', () => {
    it('should provide guidance for permission denied error', () => {
      const mockError = new MockGeolocationPositionError(1, 'Permission denied');

      const guidance = getLocationErrorGuidance(mockError);
      
      expect(guidance.title).toBe('Location Access Denied');
      expect(guidance.message).toContain('Weather information requires location access');
      expect(guidance.actions).toContain('Click the location icon in your browser\'s address bar');
    });

    it('should provide guidance for position unavailable error', () => {
      const mockError = new MockGeolocationPositionError(2, 'Position unavailable');

      const guidance = getLocationErrorGuidance(mockError);
      
      expect(guidance.title).toBe('Location Unavailable');
      expect(guidance.message).toContain('Your device location could not be determined');
      expect(guidance.actions).toContain('Check that location services are enabled on your device');
    });

    it('should provide guidance for timeout error', () => {
      const mockError = new MockGeolocationPositionError(3, 'Timeout');

      const guidance = getLocationErrorGuidance(mockError);
      
      expect(guidance.title).toBe('Location Request Timed Out');
      expect(guidance.message).toContain('It took too long to get your location');
      expect(guidance.actions).toContain('Check your internet connection');
    });

    it('should provide guidance for unknown GeolocationPositionError', () => {
      const unknownError = new MockGeolocationPositionError(999, 'Unknown error');

      const guidance = getLocationErrorGuidance(unknownError);
      
      expect(guidance.title).toBe('Location Error');
      expect(guidance.message).toContain('An unexpected error occurred while getting your location');
      expect(guidance.actions).toContain('Check that location services are enabled');
    });

    it('should provide guidance for generic errors', () => {
      const genericError = new Error('Generic error');

      const guidance = getLocationErrorGuidance(genericError);
      
      expect(guidance.title).toBe('Location Service Error');
      expect(guidance.message).toContain('Unable to access location services');
      expect(guidance.actions).toContain('Check that your browser supports location services');
    });
  });

  describe('Custom Options Handling', () => {
    it('should use custom options for getCurrentLocation', async () => {
      const mockPosition = {
        coords: { latitude: 40.7128, longitude: -74.0060 }
      } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const customOptions = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 600000
      };

      const result = await getCurrentLocation(customOptions);
      
      expect(result.granted).toBe(true);
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        customOptions
      );
    });

    it('should use default options when none provided', async () => {
      const mockPosition = {
        coords: { latitude: 40.7128, longitude: -74.0060 }
      } as GeolocationPosition;

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      await getCurrentLocation();
      
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle permission check failure gracefully', async () => {
      mockPermissions.query.mockRejectedValueOnce(new Error('Permission API error'));

      const isDenied = await isLocationPermissionDenied();
      
      expect(isDenied).toBe(false); // Should default to false on error
    });

    it('should handle missing permissions API in isLocationPermissionDenied', async () => {
      Object.defineProperty((global as any).navigator, 'permissions', {
        value: undefined,
        writable: true
      });

      const isDenied = await isLocationPermissionDenied();
      
      expect(isDenied).toBe(false);
    });

    it('should handle permission denied in fallback scenario', async () => {
      mockPermissions.query.mockResolvedValueOnce({ state: 'denied' });

      const result = await getLocationWithFallback();
      
      expect(result.granted).toBe(false);
      expect(result.error).toContain('Location permission denied');
      expect(result.latitude).toBe(0);
      expect(result.longitude).toBe(0);
    });
  });
});