# Netlify Functions

This directory contains serverless functions for the What to Wear app that provide secure API proxying for weather services.

## Functions

### Weather Function (`/api/weather`)

Proxies requests to the OpenWeatherMap API to fetch weather forecast data.

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

## Security Features

### Rate Limiting
- Weather API: 10 requests per minute per IP

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
2. Sign up for a free account
3. Generate an API key
4. Use the free tier for development (1000 calls/day)

## Error Codes

- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid API key)
- `403`: Forbidden (API access denied)

- `405`: Method Not Allowed (non-GET requests)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error (API failures)