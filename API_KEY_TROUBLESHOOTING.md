# OpenWeather API Key Troubleshooting

## Current Issue
The API key `2415ea01d3ee53dc04c9ce5e15c4e0f7` is returning a 401 "Invalid API key" error.

## Steps to Fix

### 1. Check Your OpenWeather Account
1. Go to https://home.openweathermap.org/api_keys
2. Log in to your OpenWeather account
3. Verify your API key is listed and shows as "Active"

### 2. Generate a New API Key (if needed)
1. In your OpenWeather dashboard, click "Generate" to create a new API key
2. Copy the new API key
3. **Important**: New API keys can take up to 2 hours to activate

### 3. Update Environment Variables

#### Local Development (.env.local)
```bash
OPENWEATHER_API_KEY=your_new_api_key_here
```

#### Netlify Dashboard
1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Update or add:
   - `OPENWEATHER_API_KEY` = your_new_api_key

### 4. Redeploy
After updating the environment variables in Netlify:
1. Trigger a new deployment
2. Check the function logs for debugging info

## Debugging
The updated weather function now logs:
- Whether environment variables are found
- First 8 characters of the API key being used
- Detailed error messages

## Alternative: Use Mock Data
If you want to test the UI while waiting for the API key to activate, I can create a mock weather service that returns sample data.

## API Key Requirements
- Free tier: 1,000 calls/day, 60 calls/minute
- One Call API 3.0: Requires paid subscription
- The app automatically falls back to free tier if One Call API fails