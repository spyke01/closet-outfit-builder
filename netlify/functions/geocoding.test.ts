import { handler } from './geocoding';
import { HandlerEvent, HandlerContext } from '@netlify/functions';

// Mock fetch globally
global.fetch = jest.fn();

describe('Geocoding Function', () => {
  const mockEvent: Partial<HandlerEvent> = {
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: null,
  };

  const mockContext: HandlerContext = {} as HandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
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
      error: 'Missing required parameter: either "address" or "latlng"' 
    });
  });

  it('should return 400 for invalid latlng format', async () => {
    const event = { 
      ...mockEvent, 
      queryStringParameters: { latlng: 'invalid-format' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Invalid latlng format. Expected: "lat,lng"' 
    });
  });

  it('should return 400 for invalid coordinates in latlng', async () => {
    const event = { 
      ...mockEvent, 
      queryStringParameters: { latlng: 'invalid,123' } 
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
      queryStringParameters: { latlng: '91,181' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Coordinates out of valid range' 
    });
  });

  it('should return 500 when API key is missing', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    
    const event = { 
      ...mockEvent, 
      queryStringParameters: { address: 'New York, NY' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Geocoding service temporarily unavailable' 
    });
  });

  it('should handle successful geocoding response for address', async () => {
    const mockGeocodingResponse = {
      results: [
        {
          geometry: {
            location: { lat: 40.7128, lng: -74.0060 }
          },
          formatted_address: 'New York, NY, USA',
          place_id: 'ChIJOwg_06VPwokRYv534QaPC8g',
          types: ['locality', 'political']
        }
      ],
      status: 'OK'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeocodingResponse)
    });

    const event = { 
      ...mockEvent, 
      queryStringParameters: { address: 'New York, NY' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(200);
    const responseData = JSON.parse(result.body);
    expect(responseData.results).toHaveLength(1);
    expect(responseData.results[0].geometry.location.lat).toBe(40.7128);
    expect(responseData.results[0].formatted_address).toBe('New York, NY, USA');
  });

  it('should handle successful reverse geocoding response', async () => {
    const mockGeocodingResponse = {
      results: [
        {
          geometry: {
            location: { lat: 40.7128, lng: -74.0060 }
          },
          formatted_address: 'New York, NY, USA',
          place_id: 'ChIJOwg_06VPwokRYv534QaPC8g',
          types: ['locality', 'political']
        }
      ],
      status: 'OK'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeocodingResponse)
    });

    const event = { 
      ...mockEvent, 
      queryStringParameters: { latlng: '40.7128,-74.0060' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(200);
    const responseData = JSON.parse(result.body);
    expect(responseData.results).toHaveLength(1);
    expect(responseData.results[0].formatted_address).toBe('New York, NY, USA');
  });

  it('should handle ZERO_RESULTS status', async () => {
    const mockGeocodingResponse = {
      results: [],
      status: 'ZERO_RESULTS'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeocodingResponse)
    });

    const event = { 
      ...mockEvent, 
      queryStringParameters: { address: 'NonexistentPlace12345' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'No results found for the provided location' 
    });
  });

  it('should handle OVER_QUERY_LIMIT status', async () => {
    const mockGeocodingResponse = {
      results: [],
      status: 'OVER_QUERY_LIMIT'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeocodingResponse)
    });

    const event = { 
      ...mockEvent, 
      queryStringParameters: { address: 'New York, NY' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(429);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Geocoding service quota exceeded' 
    });
  });

  it('should handle REQUEST_DENIED status', async () => {
    const mockGeocodingResponse = {
      results: [],
      status: 'REQUEST_DENIED'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeocodingResponse)
    });

    const event = { 
      ...mockEvent, 
      queryStringParameters: { address: 'New York, NY' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Geocoding service request denied' 
    });
  });

  it('should sanitize input addresses', async () => {
    const mockGeocodingResponse = {
      results: [],
      status: 'ZERO_RESULTS'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeocodingResponse)
    });

    const event = { 
      ...mockEvent, 
      queryStringParameters: { address: 'New York<script>alert("xss")</script>' } 
    };
    const result = await handler(event as HandlerEvent, mockContext);

    // Should not return 400 for sanitized input, but rather process it
    expect(result.statusCode).toBe(404); // ZERO_RESULTS
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('New%20Yorkalert(%22xss%22)'), // Sanitized input
      undefined
    );
  });

  it('should handle rate limiting', async () => {
    const event = { 
      ...mockEvent, 
      queryStringParameters: { address: 'New York, NY' },
      headers: { 'x-forwarded-for': '192.168.1.1' }
    };

    // Make multiple requests to trigger rate limiting
    for (let i = 0; i < 21; i++) {
      await handler(event as HandlerEvent, mockContext);
    }

    const result = await handler(event as HandlerEvent, mockContext);
    expect(result.statusCode).toBe(429);
    expect(JSON.parse(result.body)).toEqual({ 
      error: 'Rate limit exceeded. Please try again later.' 
    });
  });
});