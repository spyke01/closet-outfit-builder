// Environment configuration for Google API keys
// Vite automatically loads environment variables with VITE_ prefix

export const config = {
  googleMapsApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  openWeatherApiKey: import.meta.env.OPENWEATHER_API_KEY,
} as const;

// Type-safe environment variable access
export const getGoogleMapsApiKey = (): string => {
  const key = config.googleMapsApiKey;
  if (!key) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured. Please check your .env.local file.');
  }
  return key;
};

export const getopenWeatherApiKey = (): string => {
  const key = config.openWeatherApiKey;
  if (!key) {
    throw new Error('OPENWEATHER_API_KEY is not configured. Please check your .env.local file.');
  }
  return key;
};