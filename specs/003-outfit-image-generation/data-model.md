# Data Model: Outfit Image Generation

**Branch**: `003-outfit-image-generation` | **Date**: 2026-02-15

## New Entities

### 1. `generated_outfit_images`

Stores AI-generated outfit images linked to an outfit record.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique image ID |
| `outfit_id` | `uuid` | FK → `outfits.id` ON DELETE CASCADE, NOT NULL | Outfit this image was generated for |
| `user_id` | `uuid` | FK → `auth.users.id` ON DELETE CASCADE, NOT NULL | Owner (denormalized for RLS) |
| `image_url` | `text` | NOT NULL | Supabase Storage public URL |
| `storage_path` | `text` | NOT NULL | Storage bucket path (`{user_id}/{outfit_id}/{image_id}.webp`) |
| `status` | `text` | NOT NULL, CHECK IN ('pending', 'generating', 'completed', 'failed', 'cancelled') | Generation lifecycle state |
| `is_primary` | `boolean` | NOT NULL, DEFAULT false | Whether this is the outfit's primary thumbnail |
| `prompt_text` | `text` | | Full prompt sent to Replicate |
| `prompt_hash` | `text` | | SHA-256 hash of prompt for dedup tracking |
| `model_version` | `text` | NOT NULL, DEFAULT 'google-deepmind/imagen-4' | Replicate model identifier |
| `generation_duration_ms` | `integer` | | Time from API call to completion |
| `cost_cents` | `integer` | | Estimated cost in cents for analytics |
| `error_message` | `text` | | Error details if generation failed |
| `retry_of` | `uuid` | FK → `generated_outfit_images.id`, NULLABLE | Links to the original image if this is a free retry |
| `retry_expires_at` | `timestamptz` | | When the free retry window expires (5 min after original) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_generated_outfit_images_outfit_id` ON `outfit_id`
- `idx_generated_outfit_images_user_id` ON `user_id`
- `idx_generated_outfit_images_status` ON `status` WHERE `status = 'pending'`
- Unique partial index: only one `is_primary = true` per outfit

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id` (status, is_primary, image_url, storage_path, error_message, generation_duration_ms, cost_cents only)
- DELETE: `auth.uid() = user_id`

### 2. `image_generation_usage`

Tracks per-user generation quota consumption for rate limiting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Row ID |
| `user_id` | `uuid` | FK → `auth.users.id` ON DELETE CASCADE, UNIQUE, NOT NULL | One row per user |
| `monthly_count` | `integer` | NOT NULL, DEFAULT 0 | Images generated this billing month |
| `monthly_reset_at` | `timestamptz` | NOT NULL | When the monthly counter resets (1st of next month) |
| `hourly_timestamps` | `jsonb` | NOT NULL, DEFAULT '[]' | Array of ISO timestamps for burst protection (last 5) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Row creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update |

**Indexes**:
- Unique index on `user_id`

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT: service role only (Edge Function creates rows)
- UPDATE: service role only (Edge Function increments counters)

### 3. `generation_log`

Audit trail for all generation attempts (analytics and debugging).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Log entry ID |
| `user_id` | `uuid` | FK → `auth.users.id` ON DELETE SET NULL | User who triggered generation |
| `outfit_id` | `uuid` | FK → `outfits.id` ON DELETE SET NULL | Target outfit |
| `generated_image_id` | `uuid` | FK → `generated_outfit_images.id` ON DELETE SET NULL, NULLABLE | Resulting image (null if failed before creation) |
| `model_used` | `text` | NOT NULL | Model identifier |
| `prompt_hash` | `text` | | Prompt hash for analytics |
| `status` | `text` | NOT NULL, CHECK IN ('success', 'failed', 'cancelled') | Outcome |
| `error_message` | `text` | | Error details if failed |
| `api_response_time_ms` | `integer` | | Replicate API response time |
| `cost_cents` | `integer` | | Cost of this generation |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | When the attempt occurred |

**RLS Policies**:
- SELECT: `auth.uid() = user_id` (users can view their own logs)
- INSERT: service role only
- No UPDATE or DELETE (append-only audit log)

## State Transitions

### Generated Outfit Image Lifecycle

```
pending → generating → completed
                    → failed
pending → cancelled
```

- **pending**: Record created, quota checked, awaiting Edge Function processing
- **generating**: Edge Function has started the Replicate API call
- **completed**: Image downloaded, stored in Supabase Storage, URL updated
- **failed**: Replicate API error or storage error; quota NOT decremented
- **cancelled**: User cancelled before processing began; quota NOT decremented

## Relationships

```
outfits (1) ──────< (N) generated_outfit_images
auth.users (1) ───< (N) generated_outfit_images
auth.users (1) ───< (1) image_generation_usage
auth.users (1) ───< (N) generation_log
outfits (1) ──────< (N) generation_log
generated_outfit_images (1) ──< (1) generation_log
generated_outfit_images (1) ──< (N) generated_outfit_images (retry_of self-ref)
```

## TypeScript Interfaces

```typescript
// New types to add to lib/types/database.ts

export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled';
export type GenerationLogStatus = 'success' | 'failed' | 'cancelled';

export interface GeneratedOutfitImage {
  id: string;
  outfit_id: string;
  user_id: string;
  image_url: string;
  storage_path: string;
  status: GenerationStatus;
  is_primary: boolean;
  prompt_text?: string;
  prompt_hash?: string;
  model_version: string;
  generation_duration_ms?: number;
  cost_cents?: number;
  error_message?: string;
  retry_of?: string | null;
  retry_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImageGenerationUsage {
  id: string;
  user_id: string;
  monthly_count: number;
  monthly_reset_at: string;
  hourly_timestamps: string[]; // ISO timestamp strings
  created_at: string;
  updated_at: string;
}

export interface GenerationLogEntry {
  id: string;
  user_id: string;
  outfit_id: string;
  generated_image_id?: string | null;
  model_used: string;
  prompt_hash?: string;
  status: GenerationLogStatus;
  error_message?: string;
  api_response_time_ms?: number;
  cost_cents?: number;
  created_at: string;
}

// Tier definitions for quota enforcement
export type AccountTier = 'starter' | 'plus' | 'pro';

export interface ImageGenerationLimits {
  monthly_limit: number; // 0 for starter, 30 for plus, 100 for pro
  hourly_limit: number;  // 5 for all tiers
}

export const IMAGE_GENERATION_LIMITS: Record<AccountTier, ImageGenerationLimits> = {
  starter: { monthly_limit: 0, hourly_limit: 5 },
  plus: { monthly_limit: 30, hourly_limit: 5 },
  pro: { monthly_limit: 100, hourly_limit: 5 },
};
```

## Zod Schemas

```typescript
// New schemas to add to lib/schemas/index.ts

export const GenerationStatusSchema = z.enum([
  'pending', 'generating', 'completed', 'failed', 'cancelled'
]);

export const GenerationLogStatusSchema = z.enum([
  'success', 'failed', 'cancelled'
]);

export const AccountTierSchema = z.enum(['starter', 'plus', 'pro']);

export const GeneratedOutfitImageSchema = z.object({
  id: UUIDSchema.optional(),
  outfit_id: UUIDSchema,
  user_id: UUIDSchema.optional(),
  image_url: z.string(),
  storage_path: z.string(),
  status: GenerationStatusSchema,
  is_primary: z.boolean().default(false),
  prompt_text: z.string().optional(),
  prompt_hash: z.string().optional(),
  model_version: z.string().default('google-deepmind/imagen-4'),
  generation_duration_ms: z.number().int().positive().optional(),
  cost_cents: z.number().int().min(0).optional(),
  error_message: z.string().optional(),
  retry_of: UUIDSchema.nullable().optional(),
  retry_expires_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const ImageGenerationUsageSchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema,
  monthly_count: z.number().int().min(0).default(0),
  monthly_reset_at: z.string(),
  hourly_timestamps: z.array(z.string()).default([]),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const GenerateOutfitImageRequestSchema = z.object({
  outfit_id: UUIDSchema,
  retry_of: UUIDSchema.optional(), // If retrying a failed/unsatisfactory generation
});

export const GenerateOutfitImageResponseSchema = z.object({
  success: z.boolean(),
  image: GeneratedOutfitImageSchema.optional(),
  error: z.string().optional(),
  quota_remaining: z.object({
    monthly: z.number().int().min(0),
    hourly: z.number().int().min(0),
  }).optional(),
});
```

## Storage Bucket

**Bucket name**: `outfit-generated-images`

**Path convention**: `{user_id}/{outfit_id}/{image_id}.webp`

**Bucket policies**:
- Public read access (images served via public URLs)
- Insert: authenticated users, path must start with `auth.uid()`
- Delete: authenticated users, path must start with `auth.uid()`

**Configuration**:
- Max file size: 10MB
- Allowed MIME types: `image/webp`, `image/png`, `image/jpeg`

## Migration Summary

Single migration file: `supabase/migrations/YYYYMMDD_add_outfit_image_generation.sql`

1. Create `generated_outfit_images` table with indexes and RLS
2. Create `image_generation_usage` table with unique user constraint and RLS
3. Create `generation_log` table with RLS
4. Create Storage bucket `outfit-generated-images` with policies
5. Create `updated_at` trigger functions for new tables
6. Create helper function `check_and_increment_quota(user_id, tier)` returning boolean
