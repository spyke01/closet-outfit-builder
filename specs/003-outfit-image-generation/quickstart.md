# Quickstart: Outfit Image Generation

**Branch**: `003-outfit-image-generation` | **Date**: 2026-02-15

## Prerequisites

1. Supabase project with Edge Functions enabled
2. `REPLICATE_API_TOKEN` set in Supabase Edge Function secrets
3. Existing outfit data with wardrobe items (category + color minimum)
4. User authenticated via Supabase Auth

## Setup Steps

### 1. Run Database Migration

```bash
supabase db push
# Or apply specific migration:
supabase migration up
```

This creates:
- `generated_outfit_images` table
- `image_generation_usage` table
- `generation_log` table
- `outfit-generated-images` Storage bucket
- RLS policies and helper functions

### 2. Deploy Edge Function

```bash
supabase functions deploy generate-outfit-image
```

Set secrets if not already configured:
```bash
supabase secrets set REPLICATE_API_TOKEN=<your-token>
```

### 3. Verify Configuration

```bash
# Check Edge Function is deployed
supabase functions list

# Verify Storage bucket exists
# Check Supabase Dashboard → Storage → outfit-generated-images
```

## Architecture Overview

```
User clicks "Generate Image" on outfit detail page
  → useGenerateOutfitImage() hook (client)
    → generateOutfitImage() server action (Next.js)
      → Validates quota via image_generation_usage table
      → Creates pending record in generated_outfit_images
      → Builds prompt from outfit items
      → supabase.functions.invoke('generate-outfit-image')
        → Replicate API (google-deepmind/imagen-4)
        → Downloads result image
        → Uploads to outfit-generated-images bucket
        → Updates DB record to completed
        → Increments usage quota
      → Returns image URL + updated quota
    → TanStack Query cache invalidation
  → UI shows generated image
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/*_add_outfit_image_generation.sql` | Database schema |
| `supabase/functions/generate-outfit-image/index.ts` | Edge Function (Replicate API + Storage) |
| `lib/actions/outfit-images.ts` | Server Actions |
| `lib/hooks/use-outfit-images.ts` | React hooks (TanStack Query) |
| `lib/types/database.ts` | TypeScript types (GeneratedOutfitImage, etc.) |
| `lib/schemas/index.ts` | Zod validation schemas |
| `app/outfits/[id]/outfit-detail-client.tsx` | UI integration point |
| `components/outfit-image-generator.tsx` | Generate button + progress + gallery |

## Quota Tiers

| Tier | Monthly Limit | Hourly Burst | Price |
|------|--------------|--------------|-------|
| Closet Starter (Free) | 0 (locked) | N/A | $0 |
| Closet Plus | 30 | 5 | $4.99/mo |
| Closet Pro | 100 | 5 | $9.99/mo |

## Testing

```bash
# Run all tests
npm run test:run

# Run specific test file
npx vitest run lib/hooks/__tests__/use-outfit-images.test.ts
npx vitest run lib/actions/__tests__/outfit-images.test.ts
```

## Common Issues

- **"REPLICATE_API_TOKEN not configured"**: Set the secret in Supabase Edge Function settings
- **"Monthly limit reached"**: User has exhausted their tier's monthly allocation; resets on 1st of month
- **"Outfit items missing required data"**: Each item needs at minimum `category` and `color` to build a meaningful prompt
- **Generation takes >30s**: Replicate cold starts can add latency; the Edge Function has a 60s timeout
