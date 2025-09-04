# Netlify Deployment Configuration Guide

This guide covers the complete setup for deploying the Closet Outfit Builder app to Netlify with weather integration and secure API key management.

## Prerequisites

- Netlify account
- Google Cloud Platform account with billing enabled
- OpenWeatherMap API account
- Git repository connected to Netlify

## 1. Netlify Environment Variables Setup

### Required Environment Variables

Set these in your Netlify dashboard under **Site Settings > Environment Variables**:

```bash
# Google Maps API Key (for geocoding location data)
# Get from: https://console.cloud.google.com/
GOOGLE_MAPS_API_KEY=your_production_google_maps_api_key_here

# OpenWeatherMap API Key (for weather data)
# Get from: https://openweathermap.org/api
OPENWEATHER_API_KEY=your_production_openweathermap_api_key_here

# Optional: Node.js version (already configured in netlify.toml)
NODE_VERSION=18
```

### Setting Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site Settings > Environment Variables**
3. Click **Add a variable**
4. Add each variable with its production value
5. Click **Save**

**Important Security Notes:**
- Use different API keys for production vs development
- Never commit API keys to version control
- API keys are accessed server-side via Netlify Functions only
- Configure domain restrictions in Google Cloud Console

## 2. Build Settings Configuration

### Netlify Build Configuration

The `netlify.toml` file is already configured with optimal settings:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/weather"
  to = "/.netlify/functions/weather"
  status = 200

[[redirects]]
  from = "/api/geocoding"
  to = "/.netlify/functions/geocoding"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### Verify Build Settings in Netlify Dashboard

1. Go to **Site Settings > Build & Deploy**
2. Verify these settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
   - **Node.js version**: 18

## 3. Google Cloud Platform Configuration

### API Setup

1. **Create/Select Project:**
   ```bash
   # Using gcloud CLI (optional)
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

2. **Enable Required APIs:**
   ```bash
   # Enable Geocoding API
   gcloud services enable geocoding-backend.googleapis.com
   
   # Or via Console: APIs & Services > Library > Search "Geocoding API"
   ```

3. **Create API Key:**
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > API Key**
   - Copy the generated key

### Domain Restrictions (Critical for Security)

1. **Edit API Key:**
   - Click on your API key in the Credentials page
   - Under **Application restrictions**, select **HTTP referrers**

2. **Add Production Domains:**
   ```
   # Replace with your actual domains
   https://your-app-name.netlify.app/*
   https://your-custom-domain.com/*
   
   # For branch deploys (optional)
   https://deploy-preview-*--your-app-name.netlify.app/*
   https://branch-name--your-app-name.netlify.app/*
   ```

3. **API Restrictions:**
   - Under **API restrictions**, select **Restrict key**
   - Choose **Geocoding API**
   - Save changes

## 4. OpenWeatherMap Configuration

### API Key Setup

1. **Create Account:**
   - Go to [OpenWeatherMap](https://openweathermap.org/api)
   - Sign up for free account

2. **Get API Key:**
   - Go to account dashboard
   - Copy API key from **API keys** tab
   - Free tier: 1,000 calls/day, 60 calls/minute

3. **Optional: Upgrade for One Call API:**
   - For enhanced weather data (8-day forecast)
   - Subscribe to One Call API 3.0
   - App automatically falls back to free tier if unavailable

## 5. Deployment Process

### Initial Deployment

1. **Connect Repository:**
   - Link Git repository to Netlify
   - Configure build settings (should auto-detect from netlify.toml)

2. **Set Environment Variables:**
   - Add production API keys as described in section 1
   - Ensure all variables are saved

3. **Deploy:**
   - Trigger initial deployment
   - Monitor build logs for any errors

### Deployment Verification Checklist

- [ ] Build completes successfully
- [ ] Netlify Functions are deployed
- [ ] Environment variables are accessible
- [ ] API endpoints respond correctly
- [ ] Weather functionality works with real location data
- [ ] Domain restrictions prevent unauthorized access

## 6. Testing Production Deployment

### API Endpoint Testing

Test these endpoints after deployment:

```bash
# Weather API (replace with your domain)
curl "https://your-app.netlify.app/api/weather?lat=40.7128&lon=-74.0060"

# Geocoding API
curl "https://your-app.netlify.app/api/geocoding?address=New York, NY"
```

### Expected Responses

**Weather API Success:**
```json
{
  "current": {
    "temperature": 72,
    "condition": "partly cloudy",
    "icon": "02d"
  },
  "forecast": [
    {
      "date": "2024-01-15",
      "temperature": { "high": 75, "low": 65 },
      "condition": "sunny",
      "icon": "01d",
      "precipitationProbability": 10
    }
  ]
}
```

**Geocoding API Success:**
```json
{
  "results": [
    {
      "geometry": {
        "location": { "lat": 40.7127753, "lng": -74.0059728 }
      },
      "formatted_address": "New York, NY, USA"
    }
  ],
  "status": "OK"
}
```

### Error Response Testing

Test error scenarios to ensure proper handling:

```bash
# Invalid coordinates
curl "https://your-app.netlify.app/api/weather?lat=invalid&lon=invalid"

# Missing parameters
curl "https://your-app.netlify.app/api/weather"

# Rate limiting (make 11+ requests quickly)
for i in {1..12}; do curl "https://your-app.netlify.app/api/weather?lat=40&lon=-74"; done
```

## 7. Domain Restrictions Verification

### Test Domain Security

1. **Valid Domain Test:**
   - Access your app from the configured domain
   - Verify weather functionality works

2. **Invalid Domain Test:**
   - Try accessing API directly from unauthorized domain
   - Should receive 403 Forbidden or similar error

3. **Referrer Header Test:**
   ```bash
   # Should work (from your domain)
   curl -H "Referer: https://your-app.netlify.app/" \
        "https://your-app.netlify.app/api/weather?lat=40&lon=-74"
   
   # Should fail (from unauthorized domain)
   curl -H "Referer: https://unauthorized-domain.com/" \
        "https://your-app.netlify.app/api/weather?lat=40&lon=-74"
   ```

## 8. Monitoring and Maintenance

### Netlify Function Logs

Monitor function performance:
1. Go to **Functions** tab in Netlify dashboard
2. Click on function name to view logs
3. Monitor for errors, rate limiting, or performance issues

### API Usage Monitoring

**Google Cloud Console:**
- Monitor API usage in **APIs & Services > Dashboard**
- Set up billing alerts for cost management
- Review quotas and limits

**OpenWeatherMap:**
- Check usage in account dashboard
- Monitor daily/monthly limits
- Consider upgrading if approaching limits

### Performance Optimization

**Function Cold Starts:**
- Functions may have cold start delays
- Consider implementing warming strategies for high-traffic sites

**Caching:**
- Weather data is cached client-side for 10 minutes
- Consider implementing server-side caching for better performance

**Rate Limiting:**
- Current limits: 10 weather requests/minute, 20 geocoding requests/minute per IP
- Adjust in function code if needed for your traffic patterns

## 9. Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check Node.js version
NODE_VERSION=18 npm run build

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Environment Variable Issues:**
- Verify variables are set in Netlify dashboard
- Check variable names match exactly (case-sensitive)
- Restart deployment after changing variables

**API Key Errors:**
```bash
# Test API keys locally first
export GOOGLE_MAPS_API_KEY="your_key"
export OPENWEATHER_API_KEY="your_key"
npm run dev:netlify
```

**Domain Restriction Errors:**
- Verify domain is added to Google Cloud Console
- Check for typos in domain configuration
- Ensure HTTPS is used for production domains

### Debug Mode

Enable debug logging by adding to Netlify environment variables:
```bash
DEBUG=true
```

This will provide more detailed error messages in function logs.

## 10. Security Best Practices

### API Key Security
- ✅ API keys stored as environment variables
- ✅ Keys accessed server-side only via Netlify Functions
- ✅ Domain restrictions configured in Google Cloud Console
- ✅ Rate limiting implemented in functions
- ✅ Input validation and sanitization

### Additional Security Measures
- Enable HTTPS only (Netlify default)
- Configure CSP headers if needed
- Monitor API usage for unusual patterns
- Rotate API keys periodically
- Use different keys for staging/production

## 11. Deployment Checklist

Before going live:

- [ ] All environment variables set in Netlify
- [ ] Google Cloud APIs enabled and configured
- [ ] Domain restrictions properly configured
- [ ] OpenWeatherMap API key activated
- [ ] Build settings verified in Netlify
- [ ] Functions deployed and accessible
- [ ] Weather functionality tested with real data
- [ ] Error handling tested
- [ ] Rate limiting verified
- [ ] Security measures validated
- [ ] Performance monitoring set up

## Support

For deployment issues:
- Check Netlify build logs
- Review function logs in Netlify dashboard
- Test API endpoints directly
- Verify environment variable configuration
- Check Google Cloud Console for API errors