import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../weather';
import type { HandlerEvent, HandlerContext } from '@netlify/functions';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = process.env;

describe('Weather Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockEvent = (
    httpMethod: string = 'GET',
    queryStringParameters: Record<string, string> | null = null,
    headers: Record<string, string> = {}
  ): HandlerEvent => ({
    httpMethod,
    queryStringParameters,
    headers: {
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
    body: null,
    path: '/.netlify/functions/weather',
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    pathParameters: {},
    requestContext: {} as unknown,
    resource: '',
    stageVariables: {},
  });

  const mockContext: HandlerContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'weather',
    functionVersion: '1',
    invokedFunctionArn: '',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '',
    logStreamName: '',
    getRemainingTimeInMillis: () => 30000,
    done: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  };

  it('should handle OPTIONS request (CORS preflight)', async () => {
    const event = createMockEvent('OPTIONS');
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(200);
    expect(result?.body).toBe('');
    expect(result?.headers).toMatchObject({
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
      Vary: 'Origin',
    });
  });

  it('should reject non-GET requests', async () => {
    const event = createMockEvent('POST');
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(405);
    expect(JSON.parse(result?.body || '{}')).toEqual({
      error: 'Method not allowed',
    });
  });

  it('should require lat and lon parameters', async () => {
    const event = createMockEvent('GET', {});
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(400);
    expect(JSON.parse(result?.body || '{}')).toEqual({
      error: 'Missing required parameters: lat, lon',
    });
  });

  it('should validate coordinate ranges', async () => {
    const event = createMockEvent('GET', { lat: '91', lon: '181' });
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(400);
    expect(JSON.parse(result?.body || '{}')).toEqual({
      error: 'Coordinates out of valid range',
    });
  });

  it('should handle missing API key', async () => {
    delete process.env.OPENWEATHER_API_KEY;
    
    const event = createMockEvent('GET', { lat: '40.7128', lon: '-74.0060' });
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(500);
    const body = JSON.parse(result?.body || '{}');
    expect(body.error).toBe('Weather service configuration error - API key not found');
  });

  it('should handle successful weather API response', async () => {
    process.env.OPENWEATHER_API_KEY = 'test-api-key';

    const mockWeatherResponse = {
      current: {
        dt: 1640995200,
        temp: 75,
        feels_like: 73,
        pressure: 1012,
        humidity: 52,
        wind_speed: 8.9,
        visibility: 10000,
        uvi: 3.2,
        sunrise: 1640970000,
        sunset: 1641006000,
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      },
      hourly: Array.from({ length: 50 }, (_, i) => ({
        dt: 1640998800 + i * 3600,
        temp: 76 + (i % 3),
        feels_like: 74 + (i % 3),
        pop: 0.2,
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      })),
      daily: Array.from({ length: 10 }, (_, i) => ({
        dt: 1640995200 + i * 86400,
        sunrise: 1640970000 + i * 86400,
        sunset: 1641006000 + i * 86400,
        temp: { max: 80 + i, min: 65 + i },
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
        pop: 0.1,
      })),
      alerts: [
        {
          sender_name: 'NWS',
          event: 'Heat Advisory',
          start: 1640995200,
          end: 1641024000,
          description: 'Hot temperatures expected.',
          tags: ['Extreme temperature value'],
        },
      ],
      timezone: 'America/New_York',
      timezone_offset: -18000,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherResponse),
    });

    const event = createMockEvent('GET', { lat: '40.7128', lon: '-74.0060' });
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(200);
    const body = JSON.parse(result?.body || '{}');
    
    expect(body).toHaveProperty('current');
    expect(body).toHaveProperty('forecast');
    expect(body).toHaveProperty('hourly');
    expect(body).toHaveProperty('alerts');
    expect(body.current.temperature).toBe(75);
    expect(body.current.feelsLike).toBe(73);
    expect(body.current.condition).toBe('clear sky');
    expect(body.forecast[0].temperature.high).toBe(80);
    expect(body.forecast).toHaveLength(8);
    expect(body.hourly[0].temperature).toBe(76);
    expect(body.hourly).toHaveLength(48);
    expect(body.alerts[0].event).toBe('Heat Advisory');
  });

  it('should handle API authentication errors', async () => {
    process.env.OPENWEATHER_API_KEY = 'invalid-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const event = createMockEvent('GET', { lat: '40.7128', lon: '-74.0060' });
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(500);
    const body = JSON.parse(result?.body || '{}');
    expect(body.error).toContain('authentication failed');
  });

  it('should handle rate limiting', async () => {
    process.env.OPENWEATHER_API_KEY = 'test-api-key';

    // Make multiple requests quickly to trigger rate limiting
    const event = createMockEvent('GET', { lat: '40.7128', lon: '-74.0060' });
    
    // First 10 requests should work (mocked)
    for (let i = 0; i < 10; i++) {
      await handler(event, mockContext, vi.fn());
    }

    // 11th request should be rate limited
    const result = await handler(event, mockContext, vi.fn());
    expect(result?.statusCode).toBe(429);
    const body = JSON.parse(result?.body || '{}');
    expect(body.error).toContain('Rate limit exceeded');
  });

  it('should map One Call response without alerts/hourly', async () => {
    process.env.OPENWEATHER_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        current: {
          dt: 1640995200,
          temp: 72,
          feels_like: 71,
          pressure: 1009,
          humidity: 60,
          wind_speed: 6,
          weather: [{ main: 'Clouds', description: 'few clouds', icon: '02d' }],
        },
        daily: [
          {
            dt: 1640995200,
            temp: { max: 78, min: 66 },
            weather: [{ main: 'Clouds', description: 'few clouds', icon: '02d' }],
            pop: 0,
          },
        ],
      }),
    });

    // Use a different IP to avoid rate limiting from previous tests
    const event = createMockEvent('GET', { lat: '40.7128', lon: '-74.0060' }, { 'x-forwarded-for': '192.168.1.100' });
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(200);
    const body = JSON.parse(result?.body || '{}');
    expect(body).toHaveProperty('current');
    expect(body).toHaveProperty('forecast');
    expect(body.hourly).toEqual([]);
    expect(body.alerts).toEqual([]);
  });
});
