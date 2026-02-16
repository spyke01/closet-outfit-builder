# Server Action Contracts: Outfit Image Generation

**Branch**: `003-outfit-image-generation` | **Date**: 2026-02-15

## Overview

All server actions follow the validate-authenticate-authorize-execute pattern per constitution. Actions are defined in `lib/actions/outfit-images.ts`.

---

## 1. `generateOutfitImage`

Initiates AI image generation for an outfit.

**Input**:
```typescript
{
  outfit_id: string;     // UUID of the outfit to generate image for
  retry_of?: string;     // UUID of previous generation (free retry within 5 min)
}
```

**Validation (Zod)**:
- `outfit_id`: valid UUID format
- `retry_of`: valid UUID format if provided

**Flow**:
1. Validate input with `GenerateOutfitImageRequestSchema`
2. Authenticate session via `getUser()`
3. Authorize: verify outfit belongs to authenticated user
4. Check account tier: reject if `starter` (free tier)
5. If `retry_of` provided: verify original exists, belongs to user, and `retry_expires_at > now()`
6. Check quota: call `checkGenerationQuota(user_id, tier)`
7. Validate outfit has sufficient item data (each item needs category + color)
8. Build prompt from outfit items
9. Create `generated_outfit_images` record with status `pending`
10. Invoke `generate-outfit-image` Edge Function
11. Return result with updated quota

**Success Response**:
```typescript
{
  success: true;
  image: GeneratedOutfitImage; // completed record with image_url
  quota_remaining: { monthly: number; hourly: number };
}
```

**Error Responses**:
- `401`: Not authenticated
- `403`: Outfit not owned by user / free tier user
- `422`: Outfit items missing required data (category, color)
- `429`: Monthly or hourly quota exceeded (includes reset time)
- `500`: Edge Function or Replicate API failure

---

## 2. `getOutfitImages`

Fetches all generated images for a specific outfit.

**Input**:
```typescript
{
  outfit_id: string; // UUID
}
```

**Flow**:
1. Validate `outfit_id` as UUID
2. Authenticate session
3. Query `generated_outfit_images` WHERE `outfit_id` AND `user_id = auth.uid()` AND `status = 'completed'`
4. Order by `created_at DESC`

**Success Response**:
```typescript
{
  success: true;
  images: GeneratedOutfitImage[];
}
```

---

## 3. `deleteOutfitImage`

Deletes a generated image and its storage file.

**Input**:
```typescript
{
  image_id: string; // UUID
}
```

**Flow**:
1. Validate `image_id` as UUID
2. Authenticate session
3. Fetch image record, verify `user_id = auth.uid()`
4. Delete file from `outfit-generated-images` bucket using `storage_path`
5. Delete database record
6. If deleted image was `is_primary`, clear primary status

**Success Response**:
```typescript
{
  success: true;
}
```

---

## 4. `setPrimaryOutfitImage`

Sets a generated image as the outfit's primary thumbnail.

**Input**:
```typescript
{
  image_id: string; // UUID
  outfit_id: string; // UUID
}
```

**Flow**:
1. Validate UUIDs
2. Authenticate session
3. Verify both records belong to user
4. Unset any existing `is_primary = true` for this outfit
5. Set `is_primary = true` on target image

**Success Response**:
```typescript
{
  success: true;
  image: GeneratedOutfitImage;
}
```

---

## 5. `getImageGenerationQuota`

Returns current quota usage and limits for the authenticated user.

**Input**: None (uses session)

**Flow**:
1. Authenticate session
2. Determine account tier from user profile/subscription
3. Fetch or create `image_generation_usage` record
4. Calculate remaining monthly and hourly quota
5. Auto-reset monthly count if `monthly_reset_at < now()`

**Success Response**:
```typescript
{
  success: true;
  tier: AccountTier;
  limits: {
    monthly_limit: number;
    monthly_remaining: number;
    monthly_reset_at: string; // ISO timestamp
    hourly_limit: number;
    hourly_remaining: number;
  };
}
```

---

## 6. `cancelOutfitImageGeneration`

Cancels a pending (not yet processing) generation.

**Input**:
```typescript
{
  image_id: string; // UUID
}
```

**Flow**:
1. Validate UUID
2. Authenticate session
3. Fetch image record, verify ownership
4. Only cancel if status is `pending` (cannot cancel `generating`)
5. Update status to `cancelled`
6. Do NOT decrement quota (pending images haven't incremented quota yet)

**Success Response**:
```typescript
{
  success: true;
}
```
