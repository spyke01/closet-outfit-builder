# Production Deployment Checklist

Use this checklist to ensure your Next.js + Supabase deployment is properly configured and secure.

## Pre-Deployment Setup

### 1. Supabase Configuration

- [ ] **Production Supabase Project**
  - [ ] New project created for production
  - [ ] Database schema migrated
  - [ ] Row Level Security policies applied
  - [ ] Storage buckets configured
  - [ ] Edge Functions deployed

- [ ] **Environment Variables**
  - [ ] NEXT_PUBLIC_SUPABASE_URL configured
  - [ ] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY configured
  - [ ] NEXTAUTH_SECRET generated and set
  - [ ] NODE_ENV set to production

### 2. Deployment Platform Environment Variables

Set these in your deployment platform (Netlify/Vercel):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Production publishable key
- [ ] `NODE_ENV` - Set to "production"
- [ ] `NEXTAUTH_SECRET` - Secure random string for authentication
- [ ] `NEXTAUTH_URL` - Production domain URL

**Security Notes:**
- [ ] Different Supabase projects for development vs production
- [ ] Secrets never committed to version control
- [ ] Row Level Security properly configured

### 3. Build Configuration

- [ ] `netlify.toml` or `vercel.json` file present and configured
- [ ] Build command: `cd next && npm run build`
- [ ] Publish directory: `next/out`
- [ ] Functions directory: `netlify/functions` (if using Netlify)
- [ ] Node.js version: 18
- [ ] Static export configuration in `next.config.ts`

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
- [ ] DNS propagation complete

## Post-Deployment Verification

### 6. Functionality Testing

Run the verification script:
```bash
# Test production deployment
SITE_URL=https://your-app.netlify.app npm run verify:production

# Test local build
npm run verify:local
```

Manual testing checklist:

- [ ] **Main Application**
  - [ ] Site loads without errors
  - [ ] Authentication flows work correctly
  - [ ] Protected routes redirect properly
  - [ ] Mobile responsiveness works
  - [ ] No console errors

- [ ] **Supabase Integration**
  - [ ] User registration and login work
  - [ ] Database queries execute successfully
  - [ ] Image upload and storage work
  - [ ] Real-time features function properly
  - [ ] Row Level Security enforced

- [ ] **API Endpoints**
  - [ ] `/api/health` responds correctly
  - [ ] `/api/monitoring` accepts data
  - [ ] Error responses are user-friendly
  - [ ] Rate limiting prevents abuse

### 7. Security Verification

- [ ] **API Key Security**
  - [ ] API keys not visible in client-side code
  - [ ] Domain restrictions prevent unauthorized access
  - [ ] Functions handle authentication errors gracefully

- [ ] **Rate Limiting**
  - [ ] Weather API: 10 requests/minute per IP
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

**Weather Not Loading:**
- Test API endpoints directly
- Check browser console for errors
- Verify location permissions

**Domain Restriction Errors:**
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
   - Verify OpenWeatherMap service status
   - Enable fallback modes if available

### Contact Information

- **Netlify Support**: [Netlify Support](https://www.netlify.com/support/)
- **OpenWeatherMap Support**: [OpenWeatherMap Support](https://openweathermap.org/support)