// Environment configuration for weather API
// Vite automatically loads environment variables with VITE_ prefix

export const config = {
  openWeatherApiKey: import.meta.env.OPENWEATHER_API_KEY,
} as const;

// Type-safe environment variable access
export const getOpenWeatherApiKey = (): string => {
  const key = config.openWeatherApiKey;
  if (!key) {
    throw new Error('OPENWEATHER_API_KEY is not configured. Please check your .env.local file.');
  }
  return key;
};