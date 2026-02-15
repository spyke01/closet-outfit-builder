# Netlify Functions

This directory contains serverless functions for the My AI Outfit app that provide secure API proxying for weather services.

## Functions

### Weather Function (`/api/weather`)

Proxies requests to the OpenWeatherMap One Call API 3.0 to fetch current, hourly, daily, and alert data with comprehensive error handling and rate limiting.

**Endpoint:** `GET /.netlify/functions/weather`  
**Alias:** `GET /api/weather`

**Parameters:**
- `lat` (required): Latitude coordinate (-90 to 90)
- `lon` (required): Longitude coordinate (-180 to 180)

**Forecast coverage:**
- `forecast`: Up to 8 daily entries
- `hourly`: Up to 48 hourly entries

**Example:**
```
GET /api/weather?lat=40.7128&lon=-74.0060
```

**Response:**
```json
{
  "current": {
    "observationTime": "2024-01-01T14:00:00.000Z",
    "temperature": 32,
    "feelsLike": 30,
    "humidity": 75,
    "windSpeed": 9,
    "pressure": 1018,
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
      "precipitationProbability": 0.1
    }
  ],
  "hourly": [
    {
      "time": "2024-01-01T15:00:00.000Z",
      "temperature": 33,
      "feelsLike": 31,
      "condition": "clear sky",
      "icon": "01d",
      "precipitationProbability": 0.0
    }
  ],
  "alerts": []
}
```

## Security Features

### Rate Limiting
- Weather API: 10 requests per minute per IP
- Rate limit headers included in responses
- Proper 429 status codes when limits exceeded

### Input Validation
- Coordinate range validation (-90 to 90 for lat, -180 to 180 for lon)
- Input sanitization for XSS prevention
- Parameter type checking and conversion
- Malformed request handling

### Error Handling
- Comprehensive API failure handling with retry logic
- Proper HTTP status codes (400, 401, 403, 429, 500, 503)
- User-friendly error messages without exposing sensitive information
- Timeout handling (15-second request timeout)
- Service unavailable detection

## Environment Variables

### Required for Production (Netlify Dashboard)
- `OPENWEATHER_API_KEY`: OpenWeatherMap API key

### Required for Local Development (.env.local)
- `OPENWEATHER_API_KEY`: OpenWeatherMap API key

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```bash
OPENWEATHER_API_KEY=your_openweathermap_api_key
```

3. Run Netlify Dev to test functions locally:
```bash
npm run dev:netlify
```

4. Test the functions:
```bash
curl "http://localhost:8888/api/weather?lat=40.7128&lon=-74.0060"

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

### OpenWeatherMap API
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for an account
3. Generate an API key
4. Enable/subscribe to One Call API 3.0 for the key

## Error Codes

- `400`: Bad Request (invalid or missing parameters)
- `401`: Unauthorized (invalid API key)
- `403`: Forbidden (API access denied)
- `405`: Method Not Allowed (non-GET requests)
- `429`: Too Many Requests (rate limit exceeded, includes Retry-After header)
- `500`: Internal Server Error (API failures, network issues)
- `503`: Service Unavailable (OpenWeatherMap service down)
- `504`: Gateway Timeout (request timeout after 15 seconds)
