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
 * Maps GeolocationPositionError to our custom LocationError format with enhanced messaging
 * @param error - The GeolocationPositionError from the browser
 * @returns LocationError with user-friendly message and type
 */
const mapGeolocationError = (error: GeolocationPositionError): LocationError => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: error.code,
        message: 'Location access denied. To see weather information, please:\n1. Click the location icon in your browser\'s address bar\n2. Select "Allow" for location access\n3. Refresh the page',
        type: 'permission_denied'
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: error.code,
        message: 'Your location could not be determined. Please check that:\n• Location services are enabled on your device\n• You have a stable internet connection\n• GPS or Wi-Fi positioning is available',
        type: 'position_unavailable'
      };
    case error.TIMEOUT:
      return {
        code: error.code,
        message: 'Location request timed out. This may be due to:\n• Weak GPS signal\n• Slow internet connection\n• Device location services being slow to respond',
        type: 'timeout'
      };
    default:
      return {
        code: error.code,
        message: 'Unable to access your location. Please ensure location services are enabled and try again.',
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

/**
 * Checks if location permission has been explicitly denied by the user
 * @returns Promise resolving to boolean indicating if permission is denied
 */
export const isLocationPermissionDenied = async (): Promise<boolean> => {
  if (!navigator.permissions) {
    // Fallback: assume not denied if we can't check
    return false;
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state === 'denied';
  } catch (error) {
    console.warn('Could not check geolocation permission status:', error);
    return false;
  }
};

/**
 * Gets detailed location error information for user guidance
 * @param error - GeolocationPositionError or generic error
 * @returns Detailed error information with user guidance
 */
export const getLocationErrorGuidance = (error: GeolocationPositionError | Error): {
  title: string;
  message: string;
  actions: string[];
} => {
  if (error instanceof GeolocationPositionError) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          title: 'Location Access Denied',
          message: 'Weather information requires location access to show relevant forecasts.',
          actions: [
            'Click the location icon in your browser\'s address bar',
            'Select "Allow" for location access',
            'Refresh the page to load weather data'
          ]
        };
      case error.POSITION_UNAVAILABLE:
        return {
          title: 'Location Unavailable',
          message: 'Your device location could not be determined.',
          actions: [
            'Check that location services are enabled on your device',
            'Ensure you have a stable internet connection',
            'Try moving to an area with better GPS or Wi-Fi signal'
          ]
        };
      case error.TIMEOUT:
        return {
          title: 'Location Request Timed Out',
          message: 'It took too long to get your location.',
          actions: [
            'Check your internet connection',
            'Move to an area with better GPS signal',
            'Try again in a few moments'
          ]
        };
      default:
        return {
          title: 'Location Error',
          message: 'An unexpected error occurred while getting your location.',
          actions: [
            'Check that location services are enabled',
            'Refresh the page and try again',
            'Contact support if the problem persists'
          ]
        };
    }
  }

  return {
    title: 'Location Service Error',
    message: 'Unable to access location services.',
    actions: [
      'Check that your browser supports location services',
      'Ensure location services are enabled',
      'Try refreshing the page'
    ]
  };
};