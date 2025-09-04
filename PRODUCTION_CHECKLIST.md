# Production Deployment Checklist

Use this checklist to ensure your Netlify deployment is properly configured and secure.

## Pre-Deployment Setup

### 1. API Keys Configuration

- [ ] **Google Cloud Platform Setup**
  - [ ] Project created with billing enabled
  - [ ] Geocoding API enabled
  - [ ] API key created with proper restrictions
  - [ ] Domain restrictions configured for production URL
  - [ ] API quotas and billing alerts set up

- [ ] **OpenWeatherMap Setup**
  - [ ] Account created and API key obtained
  - [ ] API key tested and activated
  - [ ] Usage limits understood (1,000 calls/day for free tier)
  - [ ] Optional: One Call API 3.0 subscription for enhanced features

### 2. Netlify Environment Variables

Set these in **Site Settings > Environment Variables**:

- [ ] `GOOGLE_MAPS_API_KEY` - Production Google Maps API key
- [ ] `OPENWEATHER_API_KEY` - Production OpenWeatherMap API key

**Security Notes:**
- [ ] Different API keys used for production vs development
- [ ] API keys never committed to version control
- [ ] Domain restrictions properly configured

### 3. Build Configuration

- [ ] `netlify.toml` file present and configured
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Functions directory: `netlify/functions`
- [ ] Node.js version: 18

## Deployment Process

### 4. Initial Deployment

- [ ] Repository connected to Netlify
- [ ] Environment variables set in Netlify dashboard
- [ ] Initial build triggered and successful
- [ ] Functions deployed without errors
- [ ] Site accessible at Netlify URL

### 5. Domain Configuration

- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Domain restrictions updated in Google Cloud Console
- [ ] DNS propagation complete

## Post-Deployment Verification

### 6. Functionality Testing

Run the verification script:
```bash
# Update the URL in package.json first
npm run verify:production
```

Manual testing checklist:

- [ ] **Main Application**
  - [ ] Site loads without errors
  - [ ] All outfits display by default
  - [ ] Mobile responsiveness works
  - [ ] No console errors

- [ ] **Weather Integration**
  - [ ] Location permission request appears
  - [ ] Weather widget displays 3-day forecast
  - [ ] Temperature and conditions show correctly
  - [ ] Weather icons load properly
  - [ ] Error handling works when location denied

- [ ] **API Endpoints**
  - [ ] `/api/weather` responds correctly
  - [ ] `/api/geocoding` responds correctly
  - [ ] Rate limiting prevents abuse
  - [ ] Error responses are user-friendly

### 7. Security Verification

- [ ] **API Key Security**
  - [ ] API keys not visible in client-side code
  - [ ] Domain restrictions prevent unauthorized access
  - [ ] Functions handle authentication errors gracefully

- [ ] **Rate Limiting**
  - [ ] Weather API: 10 requests/minute per IP
  - [ ] Geocoding API: 20 requests/minute per IP
  - [ ] Rate limit responses return 429 status

- [ ] **Input Validation**
  - [ ] Invalid coordinates rejected
  - [ ] Malicious input sanitized
  - [ ] Proper error messages returned

### 8. Performance Testing

- [ ] **Load Times**
  - [ ] Initial page load < 3 seconds
  - [ ] Weather data loads within 5 seconds
  - [ ] No unnecessary API calls

- [ ] **Mobile Performance**
  - [ ] Touch targets minimum 44px
  - [ ] No horizontal scrolling issues
  - [ ] Responsive design works on actual devices

### 9. Error Handling

Test these scenarios:

- [ ] **Network Errors**
  - [ ] Offline functionality (PWA features)
  - [ ] API timeout handling
  - [ ] Retry mechanisms work

- [ ] **API Failures**
  - [ ] Invalid API key handling
  - [ ] Quota exceeded scenarios
  - [ ] Service unavailable responses

- [ ] **User Experience**
  - [ ] Graceful degradation when weather unavailable
  - [ ] Clear error messages for users
  - [ ] App remains functional without weather data

## Monitoring Setup

### 10. Ongoing Monitoring

- [ ] **Netlify Dashboard**
  - [ ] Function logs monitored
  - [ ] Build notifications configured
  - [ ] Usage analytics reviewed

- [ ] **API Usage Monitoring**
  - [ ] Google Cloud Console usage tracking
  - [ ] OpenWeatherMap usage monitoring
  - [ ] Billing alerts configured

- [ ] **Performance Monitoring**
  - [ ] Core Web Vitals tracking
  - [ ] Error rate monitoring
  - [ ] User feedback collection

## Maintenance Tasks

### 11. Regular Maintenance

- [ ] **Weekly**
  - [ ] Review function logs for errors
  - [ ] Check API usage against quotas
  - [ ] Monitor site performance

- [ ] **Monthly**
  - [ ] Review and rotate API keys if needed
  - [ ] Update dependencies
  - [ ] Review security configurations

- [ ] **Quarterly**
  - [ ] Audit API usage and costs
  - [ ] Review and update domain restrictions
  - [ ] Performance optimization review

## Troubleshooting

### Common Issues and Solutions

**Build Failures:**
- Check Node.js version (should be 18)
- Verify all dependencies are installed
- Review build logs for specific errors

**API Key Errors:**
- Verify keys are set in Netlify environment variables
- Check Google Cloud Console for API restrictions
- Ensure billing is enabled for Google Cloud

**Weather Not Loading:**
- Test API endpoints directly
- Check browser console for errors
- Verify location permissions

**Domain Restriction Errors:**
- Update Google Cloud Console with correct domains
- Include both www and non-www versions
- Add Netlify preview URLs if needed

## Emergency Procedures

### If Site Goes Down

1. **Check Netlify Status**
   - Visit Netlify status page
   - Check for service outages

2. **Review Recent Changes**
   - Check recent deployments
   - Rollback if necessary

3. **API Service Issues**
   - Check Google Cloud Console status
   - Verify OpenWeatherMap service status
   - Enable fallback modes if available

### Contact Information

- **Netlify Support**: [Netlify Support](https://www.netlify.com/support/)
- **Google Cloud Support**: [Google Cloud Support](https://cloud.google.com/support)
- **OpenWeatherMap Support**: [OpenWeatherMap Support](https://openweathermap.org/support)