import { handler } from './weather';
import { HandlerEvent, HandlerContext } from '@netlify/functions';

// Mock fetch globally
global.fetch = jest.fn();

describe('Weather Function', () => {
  const mockEvent: Partial<HandlerEvent> = {
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: null,
  };

  const mockContext: HandlerContext = {} as HandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_WEATHER_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_WEATHER_API_KEY;
  });

  it('should handle OPTIONS requests for CORS', async () => {
    const event = { ...mockEvent, httpMethod: 'OPTIONS' };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
  });

  it('should return 405 for non-GET requests', async () => {
    const event = { ...mockEvent, httpMethod: 'POST' };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toEqual({ error: 'Method not allowed' });
  });

  it('should return 400 for missing parameters', async () => {
    const event = { ...mockEvent, queryStringParameters: {} };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Missing required parameters: lat, lon' 
    });
  });

  it('should return 400 for invalid coordinates', async () => {
    const event = { 
      ...mockEvent, 
      queryStringParameters: { lat: 'invalid', lon: '123' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Invalid latitude or longitude values' 
    });
  });

  it('should return 400 for coordinates out of range', async () => {
    const event = { 
      ...mockEvent, 
      queryStringParameters: { lat: '91', lon: '181' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Coordinates out of valid range' 
    });
  });

  it('should return 500 when API key is missing', async () => {
    delete process.env.GOOGLE_WEATHER_API_KEY;
    
    const event = { 
      ...mockEvent, 
      queryStringParameters: { lat: '40.7128', lon: '-74.0060' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Weather service temporarily unavailable' 
    });
  });

  it('should handle successful weather API response', async () => {
    const mockWeatherResponse = {
      list: [
        {
          dt: 1640995200,
          main: { temp: 32, temp_max: 35, temp_min: 28 },
          weather: [{ description: 'clear sky', icon: '01d' }],
          pop: 0.1
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherResponse)
    });

    const event = { 
      ...mockEvent, 
      queryStringParameters: { lat: '40.7128', lon: '-74.0060' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(200);
    const responseData = JSON.parse(result.body);
    expect(responseData).toHaveProperty('current');
    expect(responseData).toHaveProperty('forecast');
    expect(responseData.current.temperature).toBe(32);
  });

  it('should handle API authentication errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    const event = { 
      ...mockEvent, 
      queryStringParameters: { lat: '40.7128', lon: '-74.0060' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Weather service authentication failed' 
    });
  });

  it('should handle rate limiting', async () => {
    const event = { 
      ...mockEvent, 
      queryStringParameters: { lat: '40.7128', lon: '-74.0060' },
      headers: { 'x-forwarded-for': '192.168.1.1' }
    };

    // Make multiple requests to trigger rate limiting
    for (let i = 0; i < 11; i++) {
      await handler(event as HandlerEvent, mockContext);
    }

    const result = await handler(event as HandlerEvent, mockContext);
    expect(result.statusCode).toBe(429);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Rate limit exceeded. Please try again later.' 
    });
  });
});