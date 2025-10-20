# Next.js + Supabase Deployment Guide

This guide covers deploying the migrated Next.js application with Supabase backend to production.

## Overview

The application has been migrated from a React SPA to a Next.js application with:
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: TanStack Query + Immer + Zod
- **Deployment**: Static export optimized for Netlify/Vercel

## Pre-Deployment Checklist

### 1. Supabase Project Setup

- [ ] **Production Supabase Project Created**
  - Create new project for production
  - Note project URL and publishable key
  - Configure custom domain (optional)

- [ ] **Database Schema Deployed**
  ```bash
  # Apply migrations to production
  supabase db push --project-ref your-production-ref
  ```

- [ ] **Row Level Security Configured**
  - Verify RLS policies are active
  - Test with different user roles
  - Ensure data isolation between users

- [ ] **Storage Buckets Created**
  ```sql
  -- Create wardrobe-images bucket
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('wardrobe-images', 'wardrobe-images', true);
  ```

- [ ] **Edge Functions Deployed**
  ```bash
  # Deploy all Edge Functions
  supabase functions deploy --project-ref your-production-ref
  ```

### 2. Environment Configuration

Set these environment variables in your deployment platform:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here

# Production Settings (Required)
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Authentication (Required for auth features)
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-secure-random-secret-here

# Optional Monitoring
SENTRY_DSN=your-sentry-dsn-here
GOOGLE_ANALYTICS_ID=your-ga-id-here
```

## Platform-Specific Deployment

### Netlify Deployment

1. **Connect Repository**
   - Link your Git repository to Netlify
   - Configure build settings (auto-detected from netlify.toml)

2. **Environment Variables**
   ```bash
   # Via Netlify CLI
   netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://your-project-ref.supabase.co"
   netlify env:set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "your-key-here"
   netlify env:set NODE_ENV "production"
   netlify env:set NEXTAUTH_SECRET "your-secret-here"
   ```

3. **Build Configuration**
   - Build command: `cd next && npm run build`
   - Publish directory: `next/out`
   - Functions directory: `netlify/functions`

4. **Deploy**
   ```bash
   # Manual deployment
   netlify deploy --prod
   
   # Or trigger via Git push
   git push origin main
   ```

### Vercel Deployment

1. **Connect Repository**
   - Import project from Git repository
   - Configure as Next.js project

2. **Environment Variables**
   - Add variables in Project Settings > Environment Variables
   - Set for Production, Preview, and Development environments

3. **Build Configuration**
   ```json
   {
     "buildCommand": "cd next && npm run build",
     "outputDirectory": "next/out",
     "installCommand": "cd next && npm install"
   }
   ```

4. **Deploy**
   ```bash
   # Via Vercel CLI
   vercel --prod
   
   # Or automatic via Git push
   git push origin main
   ```

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   COPY next/package*.json ./
   RUN npm ci --only=production
   
   COPY next/ .
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Deploy**
   ```bash
   # Build image
   docker build -t wardrobe-app .
   
   # Run with environment variables
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL="your-url" \
     -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-key" \
     wardrobe-app
   ```

## Post-Deployment Verification

### Automated Testing

Run the deployment verification script:

```bash
# Test production deployment
SITE_URL=https://your-app.netlify.app npm run verify:production

# Test local build
npm run build
npm run verify:local
```

### Manual Testing Checklist

- [ ] **Application Loading**
  - [ ] Site loads without errors
  - [ ] No console errors in browser
  - [ ] All pages accessible

- [ ] **Authentication**
  - [ ] Sign up with email/password works
  - [ ] Google OAuth integration works
  - [ ] Protected routes redirect correctly
  - [ ] User sessions persist

- [ ] **Core Functionality**
  - [ ] Wardrobe items display correctly
  - [ ] Image upload and processing works
  - [ ] Outfit creation and editing works
  - [ ] Real-time scoring functions
  - [ ] Data persistence across sessions

- [ ] **Performance**
  - [ ] Page load times < 3 seconds
  - [ ] Images load efficiently
  - [ ] No memory leaks or performance issues
  - [ ] Mobile responsiveness works

### Health Check Monitoring

Set up monitoring for the health check endpoint:

```bash
# Health check URL
https://your-app.com/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "checks": {
    "database": "ok",
    "environment": "ok"
  }
}
```

## Monitoring and Maintenance

### Error Tracking

The application includes built-in error tracking:

```typescript
// Automatic error logging
import { monitoring } from '@/lib/monitoring';

// Errors are automatically logged to /api/monitoring
// Integrate with external services like Sentry
```

### Performance Monitoring

Monitor Core Web Vitals and performance metrics:

```typescript
// Performance metrics are automatically collected
// View in browser console or integrate with monitoring service
```

### Database Monitoring

Monitor Supabase usage:
- Database connections and queries
- Storage usage and bandwidth
- Edge Function invocations
- Authentication events

### Backup Strategy

1. **Database Backups**
   ```bash
   # Automated daily backups (Supabase Pro)
   # Manual backup
   supabase db dump --project-ref your-ref > backup.sql
   ```

2. **Storage Backups**
   - Configure bucket replication
   - Regular export of user-uploaded images

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check Node.js version
   node --version  # Should be 18+
   
   # Clear cache and rebuild
   rm -rf next/.next next/node_modules
   cd next && npm install && npm run build
   ```

2. **Environment Variable Issues**
   ```bash
   # Verify variables are set
   echo $NEXT_PUBLIC_SUPABASE_URL
   
   # Test locally with production env
   cp .env.production .env.local
   npm run dev
   ```

3. **Supabase Connection Errors**
   ```bash
   # Test connection
   curl -H "apikey: your-key" \
        "https://your-project-ref.supabase.co/rest/v1/categories?select=*"
   ```

4. **Static Export Issues**
   ```bash
   # Check for dynamic imports or server-side code
   npm run build 2>&1 | grep -i error
   
   # Verify output directory
   ls -la next/out/
   ```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
DEBUG=true npm run build
```

### Support Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Netlify Documentation**: https://docs.netlify.com
- **Vercel Documentation**: https://vercel.com/docs

## Security Considerations

### Production Security

1. **Environment Variables**
   - Never commit secrets to version control
   - Use different keys for different environments
   - Rotate secrets regularly

2. **Supabase Security**
   - Enable Row Level Security on all tables
   - Use service role key only server-side
   - Monitor API usage and set quotas

3. **Application Security**
   - Enable HTTPS only
   - Configure CSP headers
   - Validate all user inputs
   - Implement rate limiting

### Security Monitoring

- Monitor authentication events
- Track API usage patterns
- Set up alerts for unusual activity
- Regular security audits

## Performance Optimization

### Build Optimization

```typescript
// next.config.ts optimizations
export default {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
};
```

### Runtime Optimization

- Use React.memo for expensive components
- Implement proper loading states
- Optimize images with Next.js Image component
- Use TanStack Query for efficient data fetching

### Monitoring Performance

- Track Core Web Vitals
- Monitor bundle size
- Analyze runtime performance
- Set up performance budgets

## Rollback Strategy

### Quick Rollback

1. **Netlify/Vercel**
   - Use platform's rollback feature
   - Deploy previous Git commit

2. **Database Rollback**
   ```bash
   # Restore from backup
   supabase db reset --project-ref your-ref
   psql -h your-host -U postgres -d postgres < backup.sql
   ```

3. **Emergency Maintenance**
   - Enable maintenance mode
   - Display user-friendly message
   - Fix issues and redeploy

This deployment guide ensures a smooth transition from development to production with proper monitoring, security, and maintenance procedures.