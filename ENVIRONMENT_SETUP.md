# Environment Variables Setup Guide

This guide covers setting up environment variables for different deployment platforms.

## Required Environment Variables

### Supabase Configuration (Required)

```bash
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase Publishable/Anonymous Key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
```

### Production Settings (Required)

```bash
# Environment
NODE_ENV=production

# Disable Next.js telemetry in production
NEXT_TELEMETRY_DISABLED=1

# Production domain for authentication
NEXTAUTH_URL=https://your-production-domain.com

# Secret for authentication (generate a secure random string)
NEXTAUTH_SECRET=your-secure-random-secret-here
```

### Optional Monitoring & Analytics

```bash
# Error tracking (optional)
SENTRY_DSN=your-sentry-dsn-here

# Analytics (optional)
GOOGLE_ANALYTICS_ID=your-ga-id-here

# Performance monitoring (optional)
VERCEL_ANALYTICS_ID=your-vercel-analytics-id
```

## Platform-Specific Setup

### Netlify Deployment

1. **Via Netlify Dashboard:**
   - Go to Site Settings > Environment Variables
   - Add each variable with its production value
   - Deploy to apply changes

2. **Via Netlify CLI:**
   ```bash
   # Set environment variables
   netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://your-project-ref.supabase.co"
   netlify env:set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "your-key-here"
   netlify env:set NODE_ENV "production"
   netlify env:set NEXT_TELEMETRY_DISABLED "1"
   netlify env:set NEXTAUTH_URL "https://your-domain.com"
   netlify env:set NEXTAUTH_SECRET "your-secret-here"
   ```

3. **Build Configuration (netlify.toml):**
   ```toml
   [build]
     publish = "next/out"
     command = "cd next && npm run build"

   [build.environment]
     NODE_VERSION = "18"
     NPM_FLAGS = "--production=false"
   ```

### Vercel Deployment

1. **Via Vercel Dashboard:**
   - Go to Project Settings > Environment Variables
   - Add variables for Production, Preview, and Development environments
   - Redeploy to apply changes

2. **Via Vercel CLI:**
   ```bash
   # Set production environment variables
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
   vercel env add NEXTAUTH_SECRET production
   ```

### Docker Deployment

1. **Environment File (.env.production):**
   ```bash
   # Copy .env.example to .env.production
   cp .env.example .env.production
   # Edit with production values
   ```

2. **Docker Compose:**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       env_file:
         - .env.production
       ports:
         - "3000:3000"
   ```

## Security Best Practices

### Environment Variable Security

1. **Never commit secrets to version control:**
   ```bash
   # Add to .gitignore
   .env.local
   .env.production
   .env.*.local
   ```

2. **Use different keys for different environments:**
   - Development: Use development Supabase project
   - Staging: Use staging Supabase project  
   - Production: Use production Supabase project

3. **Rotate secrets regularly:**
   - Generate new NEXTAUTH_SECRET periodically
   - Rotate Supabase keys if compromised
   - Update API keys on schedule

### Supabase Security

1. **Row Level Security (RLS):**
   - Ensure RLS is enabled on all tables
   - Test policies with different user roles
   - Audit access patterns regularly

2. **API Key Management:**
   - Use service role key only for server-side operations
   - Restrict publishable key permissions
   - Monitor API usage and quotas

## Environment Validation

### Runtime Validation

Add environment validation to your Next.js app:

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
});

export const env = envSchema.parse(process.env);
```

### Build-time Validation

Add validation to your build process:

```json
{
  "scripts": {
    "build": "npm run validate:env && next build",
    "validate:env": "node scripts/validate-env.js"
  }
}
```

## Troubleshooting

### Common Issues

1. **Environment variables not loading:**
   - Check variable names (case-sensitive)
   - Ensure no trailing spaces
   - Verify deployment platform configuration

2. **Supabase connection errors:**
   - Verify URL format (https://project-ref.supabase.co)
   - Check key permissions and expiration
   - Test connection with Supabase client

3. **Build failures:**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify environment-specific configurations

### Debug Commands

```bash
# Check environment variables (development)
npm run dev -- --debug

# Validate environment configuration
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Test Supabase connection
node scripts/test-supabase-connection.js
```

## Migration from Development

### Steps to Production

1. **Create production Supabase project:**
   - Set up new project for production
   - Apply database migrations
   - Configure RLS policies
   - Set up storage buckets

2. **Update environment variables:**
   - Replace development URLs with production
   - Generate new secrets for production
   - Configure domain-specific settings

3. **Test deployment:**
   - Run build locally with production env
   - Deploy to staging environment first
   - Validate all functionality works
   - Monitor for errors and performance

4. **Go live:**
   - Deploy to production
   - Update DNS if using custom domain
   - Monitor deployment and user feedback
   - Set up monitoring and alerts