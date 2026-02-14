import { Handler, HandlerEvent } from '@netlify/functions';

interface OpenWeatherOneCallResponse {
  current: {
    temp: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  };
  daily: Array<{
    dt: number;
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
}

interface OpenWeatherCurrentResponse {
  main: {
    temp: number;
    temp_max: number;
    temp_min: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
}

interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      temp_max: number;
      temp_min: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    pop: number;
  }>;
}

interface ForecastItem {
  dt: number;
  main: {
    temp: number;
    temp_max: number;
    temp_min: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  pop: number;
}

interface WeatherForecast {
  date: string;
  temperature: {
    high: number;
    low: number;
  };
  condition: string;
  icon: string;
  precipitationProbability?: number;
}

interface WeatherResponse {
  current: {
    temperature: number;
    condition: string;
    icon: string;
  };
  forecast: WeatherForecast[];
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

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: allowedOrigin ? 200 : 403,
      headers,
      body: '',
    };
  }

  if (!allowedOrigin) {
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

    // Try One Call API 3.0 first, fall back to free tier if needed
    const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial&exclude=minutely,hourly,alerts`;
    
    const response = await fetch(weatherUrl);
    
    // If One Call API fails with 401/403, try the free tier APIs
    if (!response.ok && (response.status === 401 || response.status === 403)) {
      
      // Use current weather + 5-day forecast (free tier)
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial&cnt=24`;
      
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(currentWeatherUrl),
        fetch(forecastUrl)
      ]);
      
      if (!currentResponse.ok || !forecastResponse.ok) {
        if (currentResponse.status === 401 || forecastResponse.status === 401) {
          console.error('Invalid API key for OpenWeather API. Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined');
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Weather service authentication failed - API key is invalid or not activated. Please check your OpenWeather API key.',
              details: 'Visit https://home.openweathermap.org/api_keys to verify your API key'
            }),
          };
        }
        
        if (currentResponse.status === 429 || forecastResponse.status === 429) {
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({ error: 'Weather service rate limit exceeded' }),
          };
        }
        
        throw new Error(`Weather API responded with status: ${currentResponse.status}/${forecastResponse.status}`);
      }
      
      const [currentData, forecastData] = await Promise.all([
        currentResponse.json() as Promise<OpenWeatherCurrentResponse>,
        forecastResponse.json() as Promise<OpenWeatherForecastResponse>
      ]);
      
      // Transform free tier response to our format
      const transformedData: WeatherResponse = {
        current: {
          temperature: Math.round(currentData.main.temp),
          condition: currentData.weather[0].description,
          icon: currentData.weather[0].icon,
        },
        forecast: forecastData.list.slice(0, 24).reduce((acc: WeatherForecast[], item: ForecastItem, index: number) => {
          // Group by day (every 8 items = 1 day with 3-hour intervals)
          if (index % 8 === 0) {
            const date = new Date(item.dt * 1000);
            acc.push({
              date: date.toISOString().split('T')[0],
              temperature: {
                high: Math.round(item.main.temp_max),
                low: Math.round(item.main.temp_min),
              },
              condition: item.weather[0].description,
              icon: item.weather[0].icon,
              precipitationProbability: item.pop,
            });
          }
          return acc;
        }, []).slice(0, 3),
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transformedData),
      };
    }
    
    if (!response.ok) {
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
        temperature: Math.round(weatherData.current.temp),
        condition: weatherData.current.weather[0].description,
        icon: weatherData.current.weather[0].icon,
      },
      forecast: weatherData.daily.slice(0, 3).map(day => {
        const date = new Date(day.dt * 1000);
        return {
          date: date.toISOString().split('T')[0],
          temperature: {
            high: Math.round(day.temp.max),
            low: Math.round(day.temp.min),
          },
          condition: day.weather[0].description,
          icon: day.weather[0].icon,
          precipitationProbability: day.pop,
        };
      }),
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
