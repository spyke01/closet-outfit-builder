# Research: Outfit Image Generation

**Feature Branch**: `003-outfit-image-generation`
**Date**: 2026-02-15

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

### Decision: Create new `outfit-generated-images` Supabase Storage bucket

**Rationale**: Generated outfit images are a different category from wardrobe item photos. Separate bucket enables:
- Independent RLS policies (user can only access their own generated images)
- Independent storage quotas if needed
- Clear separation of user-uploaded vs AI-generated content
- Easier cost tracking and cleanup

**Path convention**: `{user_id}/{outfit_id}/{image_id}.{format}`

**Alternatives considered**:
- Reuse `wardrobe-images` bucket (rejected: mixes user uploads with AI-generated content, harder to manage/track)
- External CDN (rejected: Supabase Storage is already in use and sufficient)

## 4. Database Design

### Decision: New `generated_outfit_images` table + `image_generation_usage` table

**Rationale**: The outfits table has no image field. Rather than adding a single image_url column, a dedicated table supports multiple generated images per outfit (history), status tracking, and cost auditing. Usage tracking needs its own table for quota enforcement.

**Alternatives considered**:
- Add `generated_image_url` column to outfits table (rejected: doesn't support history, cost tracking, or multiple images per outfit)
- Store usage counts in user_preferences (rejected: not atomic, race condition risk for quota enforcement)

## 5. Prompt Construction

### Decision: Adapt existing wardrobe item prompt builder for multi-item flat-lay composition

**Rationale**: The existing `buildPrompt()` function in `scripts/generate-wardrobe-item-images.ts` produces high-quality structured prompts with sections for garment requirements, background, style, brand handling, and output specs. This structure can be adapted for multi-item compositions.

**Key adaptations needed**:
- Accept array of items instead of single item
- Describe spatial arrangement (flat-lay, bird's-eye view)
- Include all item colors, materials, and categories
- Add outfit context (formality level, tuck style, season)
- Maintain transparent/clean background requirement

**Alternatives considered**:
- Simple concatenation of item descriptions (rejected: produces poor AI output without structured prompts)
- LLM-generated prompts (rejected: adds latency, cost, and unpredictability; existing template pattern works well)

## 6. Quota Enforcement Architecture

### Decision: Database-level quota tracking with Edge Function enforcement

**Rationale**: Quota checks must be atomic and server-authoritative. Using a database table with Supabase RLS + Edge Function enforcement prevents client-side manipulation.

**Design**:
- `image_generation_usage` table tracks: user_id, monthly_count, monthly_reset_at, hourly_timestamps (JSONB array)
- Edge Function checks quota BEFORE calling Replicate API
- Quota decremented atomically using database functions
- Failed generations: quota not decremented (check happens before API call; if API fails, counter is rolled back)
- Hourly burst: store last 5 generation timestamps, reject if any are within the last hour

**Alternatives considered**:
- Redis/in-memory rate limiting (rejected: project uses Supabase, not Redis; adds dependency)
- Client-side tracking with server validation (rejected: client state can be manipulated)

## 7. UI Integration Points

### Decision: Primary integration on outfit detail page (`app/outfits/[id]/`)

**Rationale**: Per spec assumption A-008, users will primarily generate images from the outfit detail page. The existing detail page has view/edit modes and shows all outfit items.

**UI placement**:
- "Generate Image" button in the view mode header actions (alongside Edit, Delete, Love)
- Generation status/progress indicator below the button
- Generated images gallery section below outfit items display
- Quota counter near the generate button
- Free tier: locked button with upgrade CTA

**Existing components to leverage**:
- `Button`, `Card`, `Alert`, `Progress` from `components/ui/`
- `ProcessingIndicator` from `components/processing-indicator.tsx` (existing pattern for async operations)

## 8. Async Generation Flow

### Decision: Synchronous Edge Function call with client-side polling UX

**Rationale**: The existing bg removal flow uses a synchronous Edge Function that polls Replicate internally. Image generation (5-15s) fits within Supabase Edge Function timeout limits (60s default). This avoids the complexity of webhooks or background job queues.

**Flow**:
1. Client clicks "Generate" → calls Server Action
2. Server Action validates quota, creates `pending` record in DB
3. Server Action invokes Edge Function
4. Edge Function calls Replicate API, polls until complete (5-15s)
5. Edge Function downloads image, uploads to Storage
6. Edge Function updates DB record to `completed`
7. Server Action returns result to client
8. Client shows generated image via TanStack Query cache invalidation

**Alternatives considered**:
- Webhook-based async (rejected: adds infrastructure complexity, not needed for <30s operations)
- Background job queue (rejected: YAGNI, synchronous flow works within timeout limits)
