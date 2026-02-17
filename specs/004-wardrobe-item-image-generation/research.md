# Research: Wardrobe Item Image Generation

**Feature Branch**: `004-wardrobe-item-image-generation`
**Date**: 2026-02-15 (updated 2026-02-17)

## 1. Replicate API Integration Pattern (Existing)

### Decision: Reuse existing Supabase Edge Function pattern for Replicate API calls

**Rationale**: The codebase already has a working Replicate integration in `supabase/functions/process-image/index.ts` for background removal. This Edge Function pattern (Deno runtime, service role Supabase client, REPLICATE_API_TOKEN env var) is proven and can be extended for image generation.

**Alternatives considered**:
- Next.js API route (rejected: Edge Functions keep API keys server-side in Supabase, consistent with existing pattern)
- Netlify Functions (rejected: Replicate calls already use Edge Functions; adding another runtime adds complexity)
- Direct client-side Replicate SDK (rejected: exposes API token to client, violates constitution security principle)

### Existing Pattern Details

```
Client (useImageUpload hook)
  → POST /api/upload-image (Next.js API route)
    → supabase.functions.invoke('process-image')
      → Replicate API (bg removal model)
      → Download result
      → Upload to Supabase Storage ('wardrobe-images' bucket)
      → Return public URL
```

**Key implementation details**:
- Edge Function uses `Deno.env.get('REPLICATE_API_TOKEN')` for auth
- Supabase client created with service role key inside Edge Function
- Storage bucket: `wardrobe-images` for item images
- Image processing is synchronous within the Edge Function (polls Replicate until done)
- Error handling: returns structured JSON with success/error/fallbackUrl fields

## 2. Replicate google/imagen-4 Model

### Decision: Use `google-deepmind/imagen-4` via Replicate HTTP API

**Rationale**: User requirement specifies google/imagen-4 on Replicate. The model is available and supports text-to-image generation with controllable aspect ratios.

**API Interface**:
- **Model ID**: `google-deepmind/imagen-4`
- **Endpoint**: `POST https://api.replicate.com/v1/predictions` (or `POST https://api.replicate.com/v1/models/google-deepmind/imagen-4/predictions`)
- **Input parameters**:
  - `prompt` (string, required): Text description of desired image
  - `aspect_ratio` (string): "1:1", "3:4", "4:3", "9:16", "16:9"
  - `output_format` (string): "png", "jpg", "webp"
  - `safety_filter_level` (string): "block_low_and_above", "block_medium_and_above", "block_only_high"
  - `number_of_images` (integer): 1-4
- **Output**: Array of image URLs (temporary, must download and store)
- **Pricing**: ~$0.04-0.08 per image (varies by resolution)
- **Latency**: Typically 5-15 seconds per image

**Alternatives considered**:
- OpenAI DALL-E / GPT Image (rejected: user specifically chose Replicate/Imagen-4)
- Stability AI (rejected: not requested)

## 3. Storage Architecture

### Decision: Reuse existing `wardrobe-images` Supabase Storage bucket

**Rationale**: AI-generated wardrobe item images serve the same purpose as user-uploaded photos — they become the item's `image_url`. Using the same bucket:
- Avoids unnecessary infrastructure complexity
- Reuses existing RLS policies (user can only access their own `{userId}/` path)
- Keeps all wardrobe item images in one place regardless of source
- Simplifies the codebase (no new bucket setup or policies)

**Path convention**: `{user_id}/generated/{wardrobe_item_id}.webp` (subdirectory distinguishes AI-generated from uploads)

**Alternatives considered**:
- New `outfit-generated-images` bucket (rejected: adds complexity for no benefit since images serve the same purpose)
- New `wardrobe-generated-images` bucket (rejected: same reason — unnecessary separation)

## 4. Database Design

### Decision: No new image table — update `wardrobe_items.image_url` directly + `generation_log` for audit

**Rationale**: Since the generated image simply replaces the wardrobe item's image (no history/gallery needed), there's no need for a separate `generated_outfit_images` table. The existing `image_url` field on `wardrobe_items` is sufficient. Usage tracking uses the existing `usage_counters` table. Only a `generation_log` audit table is added for analytics.

**Alternatives considered**:
- `generated_outfit_images` table with history (rejected: user decided against image history — generated image directly replaces `image_url`)
- `image_generation_usage` table (rejected: existing `usage_counters` table with `metric_key = 'ai_wardrobe_image_generations'` handles this)

## 5. Prompt Construction

### Decision: Build single-item product-style prompt from wardrobe item attributes

**Rationale**: Each wardrobe item has attributes (name, category, color, brand, material, formality_score, season) that can be composed into a detailed prompt for generating a product-style image. The existing `buildPrompt()` function in `scripts/generate-wardrobe-item-images.ts` provides a proven template for single-item prompts.

**Prompt inputs**:
- Category + subcategory (from `category_id` → `categories` table)
- Color
- Brand (if available)
- Material (if available)
- Name (descriptive text)
- Season hints (if available)

**Alternatives considered**:
- Multi-item flat-lay composition prompt (rejected: feature is for individual wardrobe items, not complete outfits)
- LLM-generated prompts (rejected: adds latency, cost, and unpredictability; existing template pattern works well)

## 6. Quota Enforcement Architecture

### Decision: Use existing `usage_counters` table + `entitlements.ts` service

**Rationale**: The billing/membership system already provides `canUseFeature()`, `isUsageExceeded()`, and `incrementUsageCounter()` via the `entitlements.ts` service. Usage is tracked in the `usage_counters` table with a metric key. This is the established pattern used by other AI features.

**Design**:
- Metric key: `ai_wardrobe_image_generations`
- Feature flag: `ai_image_generation` in `plans.features_json`
- Monthly limits: defined in `plans.limits_json.ai_image_generations_monthly`
- Hourly burst: checked via `getAiBurstHourKey()` pattern
- Quota only incremented on successful generation

**Alternatives considered**:
- Custom `image_generation_usage` table (rejected: duplicates existing infrastructure)
- Redis/in-memory rate limiting (rejected: project uses Supabase, not Redis)

## 7. UI Integration Points

### Decision: Integration on wardrobe item create/edit screen + detail view page

**Rationale**: Users need to generate images in two contexts: (1) when creating/editing an item and they don't have a photo, and (2) when viewing an item and wanting to replace an unsatisfactory image.

**UI placement**:
- **Create/Edit screen**: "Generate with AI" option near the photo upload area, alongside "Upload Photo"
- **Detail view page**: "Generate Image" button to replace existing image
- Generation status/progress indicator during generation
- Quota counter near the generate button
- Free tier: locked button with upgrade CTA
- Confirmation dialog when replacing an existing image

**Existing components to leverage**:
- `Button`, `Card`, `Alert`, `Progress` from `components/ui/`
- `ProcessingIndicator` from `components/processing-indicator.tsx` (existing pattern for async operations)

## 8. Async Generation Flow

### Decision: Synchronous Edge Function call with client-side polling UX

**Rationale**: The existing bg removal flow uses a synchronous Edge Function that polls Replicate internally. Image generation (5-15s) fits within Supabase Edge Function timeout limits (60s default). This avoids the complexity of webhooks or background job queues.

**Flow**:
1. Client clicks "Generate" → calls Server Action
2. Server Action validates quota, verifies wardrobe item ownership
3. Server Action invokes Edge Function with item attributes + constructed prompt
4. Edge Function calls Replicate API, polls until complete (5-15s)
5. Edge Function downloads image, uploads to `wardrobe-images` Storage bucket
6. Edge Function returns image URL
7. Server Action updates `wardrobe_items.image_url`, increments quota, logs to `generation_log`
8. Client shows generated image via TanStack Query cache invalidation

**Alternatives considered**:
- Webhook-based async (rejected: adds infrastructure complexity, not needed for <30s operations)
- Background job queue (rejected: YAGNI, synchronous flow works within timeout limits)
