# Edge Function Contract: generate-wardrobe-item-image

**Branch**: `004-wardrobe-item-image-generation` | **Date**: 2026-02-17

## Overview

New Supabase Edge Function at `supabase/functions/generate-wardrobe-item-image/index.ts`. Follows the same Deno runtime pattern as `process-image`.

---

## Endpoint

**Path**: `POST /functions/v1/generate-wardrobe-item-image`
**Runtime**: Deno (Supabase Edge Functions)
**Auth**: Bearer token (Supabase auth JWT) via `Authorization` header

---

## Request

**Content-Type**: `application/json`

```typescript
{
  wardrobe_item_id: string;  // UUID of the wardrobe item
  user_id: string;           // Authenticated user ID (verified by Edge Function)
  prompt: string;            // Full prompt text for Replicate (constructed by server action)
}
```

---

## Processing Flow

1. **Auth verification**: Extract bearer token, verify via `supabase.auth.getUser()`
2. **Verify user_id matches** authenticated user
3. **Call Replicate API**:
   - `POST https://api.replicate.com/v1/models/google-deepmind/imagen-4/predictions`
   - Headers: `Authorization: Bearer ${REPLICATE_API_TOKEN}`, `Prefer: wait`
   - Body:
     ```json
     {
       "input": {
         "prompt": "<constructed prompt>",
         "aspect_ratio": "1:1",
         "output_format": "webp",
         "safety_filter_level": "block_medium_and_above",
         "number_of_images": 1
       }
     }
     ```
   - Timeout: 60s via `AbortSignal.timeout(60000)`
4. **Download generated image** from Replicate temporary URL
5. **Upload to Supabase Storage**: `wardrobe-images` bucket at `{user_id}/generated/{wardrobe_item_id}.webp`
6. **Get public URL** from Storage
7. **Return result** (server action handles DB updates)

---

## Response

**Success (200)**:
```typescript
{
  success: true;
  image_url: string;              // Public URL of stored image
  storage_path: string;           // Bucket path
  generation_duration_ms: number;
  cost_cents: number;
}
```

**Error (4xx/5xx)**:
```typescript
{
  success: false;
  error: string;       // Human-readable error message
  error_code: string;  // Machine-readable code: 'AUTH_FAILED' | 'REPLICATE_ERROR' | 'STORAGE_ERROR' | 'TIMEOUT'
}
```

---

## Error Handling

| Error | HTTP Status | Quota Impact | Notes |
|-------|-------------|--------------|-------|
| Auth failure | 401 | None | Invalid or expired JWT |
| Replicate API error | 502 | NOT decremented | Replicate service issue |
| Replicate timeout | 504 | NOT decremented | Exceeded 60s timeout |
| Storage upload error | 500 | NOT decremented | Supabase Storage issue |
| Safety filter block | 422 | NOT decremented | Prompt triggered safety filter |

**Critical invariant**: The Edge Function does NOT manage quota. The calling server action is responsible for incrementing quota only after receiving a successful response.

---

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `REPLICATE_API_TOKEN` | Supabase secrets | Replicate API authentication |
| `SUPABASE_URL` | Automatic | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Automatic | Service role for Storage writes |

---

## CORS

Reuses `../_shared/cors.ts` helpers (`handleCorsPreflightRequest`, `createCorsResponse`) consistent with `process-image`.

---

## Key Differences from Previous Spec

- No `generated_outfit_images` DB record management (server action handles `wardrobe_items.image_url` update)
- No quota increment (server action handles this)
- No `generation_log` insert (server action handles this)
- Edge Function is focused purely on: call Replicate → download image → upload to Storage → return URL
