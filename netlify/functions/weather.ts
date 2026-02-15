import { Handler, HandlerEvent } from '@netlify/functions';

interface OpenWeatherOneCallResponse {
  timezone?: string;
  timezone_offset?: number;
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    wind_speed: number;
    visibility?: number;
    uvi?: number;
    sunrise?: number;
    sunset?: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  };
  hourly?: Array<{
    dt: number;
    temp: number;
    feels_like: number;
    pop?: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  }>;
  daily: Array<{
    dt: number;
    sunrise?: number;
    sunset?: number;
    temp: {
      max: number;
      min: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    pop: number; // Probability of precipitation
  }>;
  alerts?: Array<{
    sender_name?: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags?: string[];
  }>;
}

interface WeatherForecast {
  date: string;
  temperature: {
    high: number;
    low: number;
  };
  condition: string;
  icon: string;
  sunrise?: string;
  sunset?: string;
  precipitationProbability?: number;
}

interface WeatherHourly {
  time: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  icon: string;
  precipitationProbability?: number;
}

interface WeatherAlert {
  senderName?: string;
  event: string;
  start: string;
  end: string;
  description: string;
  tags?: string[];
}

interface WeatherResponse {
  current: {
    observationTime: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    pressure: number;
    visibility?: number;
    uvIndex?: number;
    sunrise?: string;
    sunset?: string;
    condition: string;
    icon: string;
  };
  forecast: WeatherForecast[];
  hourly: WeatherHourly[];
  alerts: WeatherAlert[];
  timezone?: string;
  timezoneOffset?: number;
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function getAllowedOrigins(): string[] {
  const platformOrigins = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NETLIFY_URL ? `https://${process.env.NETLIFY_URL}` : undefined,
  ].filter((origin): origin is string => Boolean(origin));

  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const defaults = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8888', 'http://127.0.0.1:8888'];

  return Array.from(new Set([...platformOrigins, ...envOrigins, ...defaults]));
}

function resolveAllowedOrigin(originHeader?: string): string | null {
  if (!originHeader) {
    return null;
  }
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(originHeader) ? originHeader : null;
}

function buildCorsHeaders(originHeader?: string): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(originHeader);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    return headers;
  }

  return headers;
}

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientIP);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  clientData.count++;
  return true;
}

export const handler: Handler = async (event: HandlerEvent) => {
  const requestOrigin = event.headers.origin;
  const headers = buildCorsHeaders(requestOrigin);
  const allowedOrigin = resolveAllowedOrigin(requestOrigin);
  const hasOriginHeader = Boolean(requestOrigin);

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: !hasOriginHeader || allowedOrigin ? 200 : 403,
      headers,
      body: '',
    };
  }

  if (hasOriginHeader && !allowedOrigin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Origin not allowed' }),
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Rate limiting - early return if exceeded
    const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      };
    }

    // Validate query parameters - early return if invalid
    const { lat, lon } = event.queryStringParameters || {};
    
    if (!lat || !lon) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters: lat, lon' }),
      };
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid latitude or longitude values' }),
      };
    }

    // Validate coordinate ranges - early return if out of range
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Coordinates out of valid range' }),
      };
    }

    // Get API key from environment - early return if missing
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      console.error('No API key found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Weather service configuration error - API key not found',
          details: 'Please set OPENWEATHER_API_KEY in Netlify environment variables'
        }),
      };
    }

    // One Call API 3.0 provides current + hourly + daily + alerts in a single request
    const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial&exclude=minutely`;
    
    const response = await fetch(weatherUrl);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error('Invalid API key or One Call API 3.0 not enabled. Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Weather service authentication failed - API key is invalid or One Call API 3.0 is not enabled for this key.',
            details: 'Visit https://home.openweathermap.org/subscriptions to verify your One Call API 3.0 plan and key activation',
          }),
        };
      }

      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ error: 'Weather service rate limit exceeded' }),
        };
      }
      
      throw new Error(`Weather API responded with status: ${response.status}`);
    }

    const weatherData = await response.json() as OpenWeatherOneCallResponse;
    
    // Transform the response to match our expected format
    const transformedData: WeatherResponse = {
      current: {
        observationTime: new Date(weatherData.current.dt * 1000).toISOString(),
        temperature: Math.round(weatherData.current.temp),
        feelsLike: Math.round(weatherData.current.feels_like),
        humidity: weatherData.current.humidity,
        windSpeed: Math.round(weatherData.current.wind_speed),
        pressure: weatherData.current.pressure,
        visibility: weatherData.current.visibility,
        uvIndex: weatherData.current.uvi,
        sunrise: weatherData.current.sunrise ? new Date(weatherData.current.sunrise * 1000).toISOString() : undefined,
        sunset: weatherData.current.sunset ? new Date(weatherData.current.sunset * 1000).toISOString() : undefined,
        condition: weatherData.current.weather[0].description,
        icon: weatherData.current.weather[0].icon,
      },
      // One Call 3.0 provides up to 8 daily forecast points and 48 hourly points.
      forecast: weatherData.daily.slice(0, 8).map(day => {
        const date = new Date(day.dt * 1000);
        return {
          date: date.toISOString().split('T')[0],
          temperature: {
            high: Math.round(day.temp.max),
            low: Math.round(day.temp.min),
          },
          condition: day.weather[0].description,
          icon: day.weather[0].icon,
          sunrise: day.sunrise ? new Date(day.sunrise * 1000).toISOString() : undefined,
          sunset: day.sunset ? new Date(day.sunset * 1000).toISOString() : undefined,
          precipitationProbability: day.pop,
        };
      }),
      hourly: (weatherData.hourly ?? []).slice(0, 48).map(hour => ({
        time: new Date(hour.dt * 1000).toISOString(),
        temperature: Math.round(hour.temp),
        feelsLike: Math.round(hour.feels_like),
        condition: hour.weather[0].description,
        icon: hour.weather[0].icon,
        precipitationProbability: hour.pop,
      })),
      alerts: (weatherData.alerts ?? []).map(alert => ({
        senderName: alert.sender_name,
        event: alert.event,
        start: new Date(alert.start * 1000).toISOString(),
        end: new Date(alert.end * 1000).toISOString(),
        description: alert.description,
        tags: alert.tags,
      })),
      timezone: weatherData.timezone,
      timezoneOffset: weatherData.timezone_offset,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(transformedData),
    };

  } catch (error) {
    console.error('Weather API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch weather data. Please try again later.' 
      }),
    };
  }
};
