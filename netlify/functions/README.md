# Netlify Functions

This directory contains serverless functions for the What to Wear app that provide secure API proxying for Google APIs.

## Functions

### Weather Function (`/api/weather`)

Proxies requests to the OpenWeatherMap API (used as a substitute for Google Weather API) to fetch weather forecast data.

**Endpoint:** `GET /.netlify/functions/weather`  
**Alias:** `GET /api/weather`

**Parameters:**
- `lat` (required): Latitude coordinate (-90 to 90)
- `lon` (required): Longitude coordinate (-180 to 180)

**Example:**
```
GET /api/weather?lat=40.7128&lon=-74.0060
```

**Response:**
```json
{
  "current": {
    "temperature": 32,
    "condition": "clear sky",
    "icon": "01d"
  },
  "forecast": [
    {
      "date": "2024-01-01",
      "temperature": {
        "high": 35,
        "low": 28
      },
      "condition": "clear sky",
      "icon": "01d",
      "precipitationProbability": 10
    }
  ]
}
```

### Geocoding Function (`/api/geocoding`)

Proxies requests to the Google Maps Geocoding API for location resolution.

**Endpoint:** `GET /.netlify/functions/geocoding`  
**Alias:** `GET /api/geocoding`

**Parameters:**
- `address` (optional): Address to geocode
- `latlng` (optional): Coordinates to reverse geocode (format: "lat,lng")

**Examples:**
```
GET /api/geocoding?address=New York, NY
GET /api/geocoding?latlng=40.7128,-74.0060
```

**Response:**
```json
{
  "results": [
    {
      "geometry": {
        "location": {
          "lat": 40.7128,
          "lng": -74.0060
        }
      },
      "formatted_address": "New York, NY, USA",
      "place_id": "ChIJOwg_06VPwokRYv534QaPC8g",
      "types": ["locality", "political"]
    }
  ],
  "status": "OK"
}
```

## Security Features

### Rate Limiting
- Weather API: 10 requests per minute per IP
- Geocoding API: 20 requests per minute per IP

### Input Validation
- Coordinate range validation
- Input sanitization for XSS prevention
- Parameter type checking

### Error Handling
- Graceful API failure handling
- Proper HTTP status codes
- User-friendly error messages

## Environment Variables

### Required for Production (Netlify Dashboard)
- `GOOGLE_MAPS_API_KEY`: Google Maps Geocoding API key
- `OPENWEATHER_API_KEY`: OpenWeatherMap API key

### Required for Local Development (.env.local)
- `GOOGLE_MAPS_API_KEY`: Google Maps Geocoding API key
- `OPENWEATHER_API_KEY`: OpenWeatherMap API key

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENWEATHER_API_KEY=your_openweathermap_api_key
```

3. Run Netlify Dev to test functions locally:
```bash
npm run dev:netlify
```

4. Test the functions:
```bash
curl "http://localhost:8888/api/weather?lat=40.7128&lon=-74.0060"
curl "http://localhost:8888/api/geocoding?address=New York, NY"
```

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Deployment

Functions are automatically deployed when pushing to the main branch. Ensure environment variables are configured in the Netlify dashboard under Site Settings > Environment Variables.

## API Key Setup

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Geocoding API
4. Create credentials (API Key)
5. Configure domain restrictions for security

### OpenWeatherMap API
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Generate an API key
4. Use the free tier for development (1000 calls/day)

## Error Codes

- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid API key)
- `403`: Forbidden (API access denied)
- `404`: Not Found (no geocoding results)
- `405`: Method Not Allowed (non-GET requests)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error (API failures)