# Edge Function Contract: generate-outfit-image

**Branch**: `003-outfit-image-generation` | **Date**: 2026-02-15

## Overview

New Supabase Edge Function at `supabase/functions/generate-outfit-image/index.ts`. Follows the same Deno runtime pattern as `process-image`.

---

## Endpoint

**Path**: `POST /functions/v1/generate-outfit-image`
**Runtime**: Deno (Supabase Edge Functions)
**Auth**: Bearer token (Supabase auth JWT) via `Authorization` header

---

## Request

**Content-Type**: `application/json`

```typescript
{
  outfit_id: string;           // UUID of the outfit
  image_record_id: string;     // UUID of the generated_outfit_images record (pre-created as pending)
  prompt: string;              // Full prompt text for Replicate
  user_id: string;             // Authenticated user ID (verified by Edge Function)
}
```

---

## Processing Flow

1. **Auth verification**: Extract bearer token, verify via `supabase.auth.getUser()`
2. **Verify user_id matches** authenticated user
3. **Update image record** status to `generating`
4. **Call Replicate API**:
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
5. **Poll/wait for result** (using `Prefer: wait` header for synchronous response)
6. **Download generated image** from Replicate temporary URL
7. **Upload to Supabase Storage**: `outfit-generated-images` bucket at `{user_id}/{outfit_id}/{image_record_id}.webp`
8. **Get public URL** from Storage
9. **Update DB record**: set `status = 'completed'`, `image_url`, `storage_path`, `generation_duration_ms`, `cost_cents`
10. **Increment usage quota**: update `image_generation_usage.monthly_count` and `hourly_timestamps`
11. **Log to generation_log**: insert success entry
12. **Return result**

---

## Response

**Success (200)**:
```typescript
{
  success: true;
  image_url: string;           // Public URL of stored image
  storage_path: string;        // Bucket path
  generation_duration_ms: number;
  cost_cents: number;
}
```

**Error (4xx/5xx)**:
```typescript
{
  success: false;
  error: string;               // Human-readable error message
  error_code: string;          // Machine-readable code: 'AUTH_FAILED' | 'REPLICATE_ERROR' | 'STORAGE_ERROR' | 'TIMEOUT'
}
```

---

## Error Handling

| Error | HTTP Status | Quota Impact | DB Update |
|-------|-------------|--------------|-----------|
| Auth failure | 401 | None | None |
| Replicate API error | 502 | NOT decremented | status → `failed`, error_message set |
| Replicate timeout | 504 | NOT decremented | status → `failed`, error_message set |
| Storage upload error | 500 | NOT decremented | status → `failed`, error_message set |
| Safety filter block | 422 | NOT decremented | status → `failed`, error_message set |

**Critical invariant**: Quota is ONLY incremented on successful completion (after image is stored). Failed generations never consume quota.

---

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `REPLICATE_API_TOKEN` | Supabase secrets | Replicate API authentication |
| `SUPABASE_URL` | Automatic | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Automatic | Service role for DB writes |

---

## CORS

Reuses `../_shared/cors.ts` helpers (`handleCorsPreflightRequest`, `createCorsResponse`) consistent with `process-image`.
