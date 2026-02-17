# Quickstart: Wardrobe Item Image Generation

**Branch**: `004-wardrobe-item-image-generation` | **Date**: 2026-02-17

## Prerequisites

1. Supabase project with Edge Functions enabled
2. `REPLICATE_API_TOKEN` set in Supabase Edge Function secrets
3. Existing wardrobe item data with category + color minimum
4. User authenticated via Supabase Auth
5. Existing `wardrobe-images` Storage bucket operational

## Setup Steps

### 1. Run Database Migration

```bash
supabase db push
# Or apply specific migration:
supabase migration up
```

This creates:
- `generation_log` table (audit trail for AI image generation attempts)

### 2. Deploy Edge Function

```bash
supabase functions deploy generate-wardrobe-item-image
```

Set secrets if not already configured:
```bash
supabase secrets set REPLICATE_API_TOKEN=<your-token>
```

### 3. Verify Configuration

```bash
# Check Edge Function is deployed
supabase functions list

# Verify wardrobe-images Storage bucket exists (should already be there from 002)
# Check Supabase Dashboard → Storage → wardrobe-images
```

## Architecture Overview

```
User clicks "Generate Image" on wardrobe item create/edit or detail page
  → useGenerateWardrobeItemImage() hook (client)
    → generateWardrobeItemImage() server action (Next.js)
      → Validates quota via usage_counters + entitlements
      → Validates wardrobe item has category + color
      → Builds prompt from item attributes (name, brand, color, category, material)
      → supabase.functions.invoke('generate-wardrobe-item-image')
        → Replicate API (google-deepmind/imagen-4)
        → Downloads result image
        → Uploads to wardrobe-images bucket at {user_id}/generated/{item_id}.webp
        → Returns image URL
      → Updates wardrobe_items.image_url
      → Increments usage quota
      → Logs to generation_log
    → TanStack Query cache invalidation (wardrobe items)
  → UI shows generated image
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/*_add_wardrobe_item_image_generation.sql` | Database schema (generation_log) |
| `supabase/functions/generate-wardrobe-item-image/index.ts` | Edge Function (Replicate API + Storage) |
| `lib/actions/wardrobe-item-images.ts` | Server Actions |
| `lib/hooks/use-wardrobe-item-image-generation.ts` | React hook (TanStack Query) |
| `lib/utils/wardrobe-item-prompt-builder.ts` | Prompt construction from item attributes |
| `lib/types/database.ts` | TypeScript types (GenerationLogEntry) |
| `lib/schemas/index.ts` | Zod validation schemas |
| `components/wardrobe-item-image-generator.tsx` | Generate button + progress + quota display |

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

# Run specific test files
npx vitest run lib/hooks/__tests__/use-wardrobe-item-image-generation.test.ts
npx vitest run lib/actions/__tests__/wardrobe-item-images.test.ts
npx vitest run lib/utils/__tests__/wardrobe-item-prompt-builder.test.ts
```

## Common Issues

- **"REPLICATE_API_TOKEN not configured"**: Set the secret in Supabase Edge Function settings
- **"Monthly limit reached"**: User has exhausted their tier's monthly allocation; resets on 1st of month
- **"Wardrobe item missing required data"**: Item needs at minimum `category` and `color` to build a meaningful prompt
- **Generation takes >30s**: Replicate cold starts can add latency; the Edge Function has a 60s timeout
