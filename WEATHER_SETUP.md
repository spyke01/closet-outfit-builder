# Weather Service Setup

## OpenWeather API Configuration

The weather widget uses OpenWeather API for weather data. The service automatically falls back from One Call API 3.0 to the free tier APIs if needed.

### Environment Variables

Set these environment variables in both your local `.env.local` file and in your Netlify dashboard:

```bash
# OpenWeather API Key
OPENWEATHER_API_KEY=your_api_key_here
```

### Getting an API Key

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key from the dashboard
4. For One Call API 3.0, you may need to subscribe to a paid plan

### API Fallback Strategy

The weather service tries these APIs in order:

1. **One Call API 3.0** (if you have a subscription)
   - `https://api.openweathermap.org/data/3.0/onecall`
   - Provides current weather + 8-day daily forecast
   - Requires paid subscription

2. **Free Tier APIs** (fallback)
   - Current Weather: `https://api.openweathermap.org/data/2.5/weather`
   - 5-Day Forecast: `https://api.openweathermap.org/data/2.5/forecast`
   - Free with API key registration

### Netlify Deployment

Make sure to set the environment variables in your Netlify dashboard:

1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Add `OPENWEATHER_API_KEY` with your API key value

### Testing

The weather widget will show:
- Loading state while fetching data
- Error state if API key is invalid or API is unavailable
- 3-day weather forecast when successful