/**
 * Location service for handling browser geolocation functionality
 * Provides location permission handling and error management
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  granted: boolean;
  error?: string;
}

export interface LocationError {
  code: number;
  message: string;
  type: 'permission_denied' | 'position_unavailable' | 'timeout' | 'not_supported';
}

/**
 * Gets the user's current location using the browser's Geolocation API
 * @param options - Geolocation options for accuracy and timeout
 * @returns Promise resolving to LocationData with coordinates or error info
 */
export const getCurrentLocation = async (
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000 // 5 minutes cache
  }
): Promise<LocationData> => {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    return {
      latitude: 0,
      longitude: 0,
      granted: false,
      error: 'Geolocation is not supported by this browser'
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          granted: true
        });
      },
      // Error callback
      (error) => {
        const locationError = mapGeolocationError(error);
        resolve({
          latitude: 0,
          longitude: 0,
          granted: false,
          error: locationError.message
        });
      },
      options
    );
  });
};

/**
 * Requests location permission from the user
 * @returns Promise resolving to permission status
 */
export const requestLocationPermission = async (): Promise<PermissionState> => {
  if (!navigator.permissions) {
    // Fallback: try to get location directly if permissions API not available
    const location = await getCurrentLocation();
    return location.granted ? 'granted' : 'denied';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  } catch (error) {
    console.warn('Could not query geolocation permission:', error);
    return 'prompt';
  }
};

/**
 * Maps GeolocationPositionError to our custom LocationError format
 * @param error - The GeolocationPositionError from the browser
 * @returns LocationError with user-friendly message and type
 */
const mapGeolocationError = (error: GeolocationPositionError): LocationError => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: error.code,
        message: 'Location access denied. Please enable location permissions to see weather information.',
        type: 'permission_denied'
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: error.code,
        message: 'Location information is unavailable. Please check your device settings.',
        type: 'position_unavailable'
      };
    case error.TIMEOUT:
      return {
        code: error.code,
        message: 'Location request timed out. Please try again.',
        type: 'timeout'
      };
    default:
      return {
        code: error.code,
        message: 'An unknown error occurred while getting your location.',
        type: 'not_supported'
      };
  }
};

/**
 * Checks if location services are available and enabled
 * @returns Promise resolving to boolean indicating availability
 */
export const isLocationAvailable = async (): Promise<boolean> => {
  if (!navigator.geolocation) {
    return false;
  }

  const permission = await requestLocationPermission();
  return permission === 'granted' || permission === 'prompt';
};

/**
 * Gets location with fallback handling for denied permissions
 * @returns Promise resolving to LocationData with fallback behavior
 */
export const getLocationWithFallback = async (): Promise<LocationData> => {
  const permission = await requestLocationPermission();
  
  if (permission === 'denied') {
    return {
      latitude: 0,
      longitude: 0,
      granted: false,
      error: 'Location permission denied. Weather information will not be available.'
    };
  }

  return getCurrentLocation();
};