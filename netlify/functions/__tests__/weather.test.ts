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

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json',
      },
      body: '',
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
        temp: 75,
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      },
      daily: [
        {
          dt: 1640995200,
          temp: { max: 80, min: 65 },
          weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
          pop: 0.1,
        },
      ],
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
    expect(body.current.temperature).toBe(75);
    expect(body.current.condition).toBe('clear sky');
  });

  it('should handle API authentication errors', async () => {
    process.env.OPENWEATHER_API_KEY = 'invalid-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    // Mock the fallback API calls to also fail with 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
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

  it('should handle fallback to free tier API', async () => {
    process.env.OPENWEATHER_API_KEY = 'test-api-key';

    // Mock One Call API failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    // Mock successful free tier responses
    const currentWeatherResponse = {
      main: { temp: 75, temp_max: 80, temp_min: 65 },
      weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
    };

    const forecastResponse = {
      list: [
        {
          dt: 1640995200,
          main: { temp: 75, temp_max: 80, temp_min: 65 },
          weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
          pop: 0.1,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(currentWeatherResponse),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(forecastResponse),
    });

    // Use a different IP to avoid rate limiting from previous tests
    const event = createMockEvent('GET', { lat: '40.7128', lon: '-74.0060' }, { 'x-forwarded-for': '192.168.1.100' });
    const result = await handler(event, mockContext, vi.fn());

    expect(result?.statusCode).toBe(200);
    const body = JSON.parse(result?.body || '{}');
    expect(body).toHaveProperty('current');
    expect(body).toHaveProperty('forecast');
  });
});