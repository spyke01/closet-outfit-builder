// Environment configuration for Google API keys
// Vite automatically loads environment variables with VITE_ prefix

export const config = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  googleWeatherApiKey: import.meta.env.VITE_GOOGLE_WEATHER_API_KEY,
} as const;

// Type-safe environment variable access
export const getGoogleMapsApiKey = (): string => {
  const key = config.googleMapsApiKey;
  if (!key) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY is not configured. Please check your .env.local file.');
  }
  return key;
};

export const getGoogleWeatherApiKey = (): string => {
  const key = config.googleWeatherApiKey;
  if (!key) {
    throw new Error('VITE_GOOGLE_WEATHER_API_KEY is not configured. Please check your .env.local file.');
  }
  return key;
};