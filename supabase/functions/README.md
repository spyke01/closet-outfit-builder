# Edge Functions CORS Configuration

## Security Update

All Edge Functions now use secure CORS configuration that only allows requests from specific domains instead of using `Access-Control-Allow-Origin: *`.

## Configuration

### Automatic Configuration (Recommended)

The CORS configuration automatically detects allowed origins from environment variables:

- **Production**: `URL` (set by Netlify) or `PRODUCTION_URL` (custom)
- **Deploy Previews**: `DEPLOY_PRIME_URL` (set by Netlify)
- **Development**: `localhost:3000`, `localhost:8888`, and `127.0.0.1` variants

### Manual Configuration

If you need to add additional domains, edit `supabase/functions/_shared/cors.ts`:

```typescript
// Add your domain to the origins array
origins.push('https://your-custom-domain.com');
```

### Environment Variables

Set these in your Supabase project settings (Dashboard > Settings > Environment Variables):

- `PRODUCTION_URL`: Your production domain (e.g., `https://your-app.netlify.app`)
- `NODE_ENV`: Set to `production` for production environment

## Testing

After deployment, verify CORS is working by:

1. Opening browser DevTools Network tab
2. Performing actions that call Edge Functions (e.g., deleting wardrobe items)
3. Checking that requests succeed without CORS errors

## Troubleshooting

If you see CORS errors:

1. **Check allowed origins**: Verify your domain is included in the `getAllowedOrigins()` function
2. **Environment variables**: Ensure `PRODUCTION_URL` or `URL` is set correctly
3. **Browser cache**: Clear browser cache and try again
4. **Deploy status**: Ensure Edge Functions are deployed with the latest changes

## Files Updated

- `supabase/functions/_shared/cors.ts` - Secure CORS utility functions
- All Edge Function `index.ts` files - Updated to use secure CORS
- `lib/hooks/use-wardrobe-items.ts` - Fixed delete action parameter

## Security Benefits

- **Origin validation**: Only allows requests from approved domains
- **Credential support**: Enables `Access-Control-Allow-Credentials` for authenticated requests
- **Cache optimization**: Sets appropriate cache headers for preflight requests
- **Method restrictions**: Only allows necessary HTTP methods (POST, OPTIONS)