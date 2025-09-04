import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface WeatherRequest {
  lat: number;
  lon: number;
}

interface GoogleWeatherResponse {
  current: {
    temperature: number;
    condition: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    temperature: {
      high: number;
      low: number;
    };
    condition: string;
    icon: string;
    precipitationProbability?: number;
  }>;
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

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

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
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
    // Rate limiting
    const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      };
    }

    // Validate query parameters
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

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Coordinates out of valid range' }),
      };
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_WEATHER_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_WEATHER_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Weather service temporarily unavailable' }),
      };
    }

    // Make request to Google Weather API
    // Note: Google doesn't have a direct Weather API, so we'll use OpenWeatherMap as a proxy
    // In a real implementation, you'd use Google's actual weather service or another provider
    const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial&cnt=24`;
    
    const response = await fetch(weatherUrl);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Invalid API key');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Weather service authentication failed' }),
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

    const weatherData = await response.json() as any;
    
    // Transform the response to match our expected format
    const transformedData = {
      current: {
        temperature: Math.round(weatherData.list[0].main.temp),
        condition: weatherData.list[0].weather[0].description,
        icon: weatherData.list[0].weather[0].icon,
      },
      forecast: weatherData.list.slice(0, 24).reduce((acc: any[], item: any, index: number) => {
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
            precipitationProbability: item.pop ? Math.round(item.pop * 100) : undefined,
          });
        }
        return acc;
      }, []).slice(0, 3), // Only return 3 days
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