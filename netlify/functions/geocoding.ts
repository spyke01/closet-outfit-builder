import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface GoogleGeocodingResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
    place_id: string;
    types: string[];
  }>;
  status: string;
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20;

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

function sanitizeInput(input: string): string {
  // Remove potentially harmful characters and limit length
  return input.replace(/[<>\"'&]/g, '').substring(0, 200);
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
    const { address, latlng } = event.queryStringParameters || {};
    
    if (!address && !latlng) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameter: either "address" or "latlng"' 
        }),
      };
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Geocoding service temporarily unavailable' }),
      };
    }

    let geocodingUrl: string;
    
    if (address) {
      // Forward geocoding (address to coordinates)
      const sanitizedAddress = sanitizeInput(address);
      if (!sanitizedAddress.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid address provided' }),
        };
      }
      
      geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(sanitizedAddress)}&key=${apiKey}`;
    } else {
      // Reverse geocoding (coordinates to address)
      const sanitizedLatLng = sanitizeInput(latlng!);
      
      // Validate latlng format (should be "lat,lng")
      const coords = sanitizedLatLng.split(',');
      if (coords.length !== 2) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid latlng format. Expected: "lat,lng"' }),
        };
      }
      
      const lat = parseFloat(coords[0].trim());
      const lng = parseFloat(coords[1].trim());
      
      if (isNaN(lat) || isNaN(lng)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid latitude or longitude values' }),
        };
      }
      
      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Coordinates out of valid range' }),
        };
      }
      
      geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    }

    // Make request to Google Geocoding API
    const response = await fetch(geocodingUrl);
    
    if (!response.ok) {
      if (response.status === 403) {
        console.error('Google Maps API access forbidden - check API key and billing');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Geocoding service access denied' }),
        };
      }
      
      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ error: 'Geocoding service rate limit exceeded' }),
        };
      }
      
      throw new Error(`Geocoding API responded with status: ${response.status}`);
    }

    const geocodingData = await response.json() as GoogleGeocodingResponse;
    
    // Check Google API response status
    if (geocodingData.status === 'ZERO_RESULTS') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No results found for the provided location' }),
      };
    }
    
    if (geocodingData.status === 'OVER_QUERY_LIMIT') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Geocoding service quota exceeded' }),
      };
    }
    
    if (geocodingData.status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied - check API key configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Geocoding service request denied' }),
      };
    }
    
    if (geocodingData.status !== 'OK') {
      console.error('Google Maps API error:', geocodingData.status);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Geocoding service error' }),
      };
    }

    // Transform and return the response
    const transformedData = {
      results: geocodingData.results.map(result => ({
        geometry: {
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          },
        },
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        types: result.types,
      })),
      status: geocodingData.status,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(transformedData),
    };

  } catch (error) {
    console.error('Geocoding API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process geocoding request. Please try again later.' 
      }),
    };
  }
};