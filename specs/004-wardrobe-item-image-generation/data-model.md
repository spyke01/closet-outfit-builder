# Data Model: Wardrobe Item Image Generation

**Branch**: `004-wardrobe-item-image-generation` | **Date**: 2026-02-17

## Overview

This feature generates AI images for individual wardrobe items. The generated image directly replaces the wardrobe item's `image_url` field - no separate image table is needed. Usage tracking uses the existing `usage_counters` table. A `generation_log` table provides an audit trail.

## Existing Entities (Modified)

### `wardrobe_items` (existing table - no schema changes)

The `image_url` field is already present and nullable. AI-generated images are stored in the existing `wardrobe-images` bucket and the URL is written to this field, same as user-uploaded photos.

| Column | Type | Notes |
|--------|------|-------|
| `image_url` | `text` | Nullable. Set by upload, onboarding premade match, or AI generation. No change needed. |

### `usage_counters` (existing table - no schema changes)

Usage is tracked with `metric_key = 'ai_wardrobe_image_generations'` via the existing `entitlements.ts` service (`canUseFeature()`, `isUsageExceeded()`, `incrementUsageCounter()`).

## New Entities

### 1. `generation_log`

Audit trail for all wardrobe item image generation attempts (analytics and debugging).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Log entry ID |
| `user_id` | `uuid` | FK → `auth.users.id` ON DELETE SET NULL | User who triggered generation |
| `wardrobe_item_id` | `uuid` | FK → `wardrobe_items.id` ON DELETE SET NULL | Target wardrobe item |
| `model_used` | `text` | NOT NULL | Model identifier (e.g., `google-deepmind/imagen-4`) |
| `prompt_text` | `text` | | Full prompt sent to Replicate |
| `prompt_hash` | `text` | | SHA-256 hash of prompt for analytics |
| `status` | `text` | NOT NULL, CHECK IN ('success', 'failed', 'cancelled') | Outcome |
| `error_message` | `text` | | Error details if failed |
| `api_response_time_ms` | `integer` | | Replicate API response time |
| `cost_cents` | `integer` | | Cost of this generation |
| `is_retry` | `boolean` | NOT NULL, DEFAULT false | Whether this was a free retry (within 5-min window) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | When the attempt occurred |

**Indexes**:
- `idx_generation_log_user_id` ON `user_id`
- `idx_generation_log_wardrobe_item_id` ON `wardrobe_item_id`

**RLS Policies**:
- SELECT: `auth.uid() = user_id` (users can view their own logs)
- INSERT: service role only
- No UPDATE or DELETE (append-only audit log)

## Removed Entities (from previous spec version)

The following tables from the original "outfit image generation" spec are **no longer needed**:

- ~~`generated_outfit_images`~~ — Generated images directly replace `wardrobe_items.image_url`; no separate image records needed
- ~~`image_generation_usage`~~ — Replaced by existing `usage_counters` table with `metric_key = 'ai_wardrobe_image_generations'`

## Storage

### Existing Bucket: `wardrobe-images` (no changes)

AI-generated images are stored alongside user-uploaded photos in the existing `wardrobe-images` bucket.

**Path convention for AI-generated images**: `{user_id}/generated/{wardrobe_item_id}.webp`

The `/generated/` subdirectory distinguishes AI-generated images from user uploads, but they share the same bucket, RLS policies, and public URL patterns.

**No new bucket needed** — the ~~`outfit-generated-images`~~ bucket from the previous spec version is removed.

## TypeScript Interfaces

```typescript
// New types to add to lib/types/database.ts

export type GenerationLogStatus = 'success' | 'failed' | 'cancelled';

export interface GenerationLogEntry {
  id: string;
  user_id: string;
  wardrobe_item_id: string;
  model_used: string;
  prompt_text?: string;
  prompt_hash?: string;
  status: GenerationLogStatus;
  error_message?: string;
  api_response_time_ms?: number;
  cost_cents?: number;
  is_retry: boolean;
  created_at: string;
}
```

## Zod Schemas

```typescript
// New schemas to add to lib/schemas/index.ts

export const GenerationLogStatusSchema = z.enum([
  'success', 'failed', 'cancelled'
]);

export const GenerateWardrobeItemImageRequestSchema = z.object({
  wardrobe_item_id: UUIDSchema,
  is_retry: z.boolean().optional().default(false),
});

export const GenerateWardrobeItemImageResponseSchema = z.object({
  success: z.boolean(),
  image_url: z.string().optional(),
  error: z.string().optional(),
  quota_remaining: z.object({
    monthly: z.number().int().min(0),
    hourly: z.number().int().min(0),
  }).optional(),
});
```

## Migration Summary

Single migration file: `supabase/migrations/YYYYMMDD_add_wardrobe_item_image_generation.sql`

1. Create `generation_log` table with indexes and RLS
2. Create `updated_at` trigger function for the table

**Note**: No storage bucket creation needed (reusing existing `wardrobe-images`). No `generated_outfit_images` or `image_generation_usage` tables needed.
