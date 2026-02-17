# Server Action Contracts: Wardrobe Item Image Generation

**Branch**: `004-wardrobe-item-image-generation` | **Date**: 2026-02-17

## Overview

All server actions follow the validate-authenticate-authorize-execute pattern per constitution. Actions are defined in `lib/actions/wardrobe-item-images.ts`.

---

## 1. `generateWardrobeItemImage`

Initiates AI image generation for a wardrobe item based on its attributes.

**Input**:
```typescript
{
  wardrobe_item_id: string;  // UUID of the wardrobe item to generate image for
  is_retry?: boolean;        // True if retrying within 5-min free window
}
```

**Validation (Zod)**:
- `wardrobe_item_id`: valid UUID format
- `is_retry`: optional boolean

**Flow**:
1. Validate input with `GenerateWardrobeItemImageRequestSchema`
2. Authenticate session via `getUser()`
3. Authorize: verify wardrobe item belongs to authenticated user
4. Check for in-progress generation: query `generation_log` for this `wardrobe_item_id` with status indicating in-progress; reject with "Generation already in progress" if found (FR-020)
5. Check account tier: reject if `starter` (free tier) via `canUseFeature(entitlements, 'ai_image_generation')`
6. If `is_retry`: verify last generation for this item was within 5 minutes
7. If not retry: check quota via `isUsageExceeded(entitlements, 'ai_wardrobe_image_generations')` + hourly burst check via `getAiBurstHourKey()`
8. Validate wardrobe item has sufficient data (category + color minimum)
9. Build prompt from wardrobe item attributes via `buildWardrobeItemPrompt()`
10. Invoke `generate-wardrobe-item-image` Edge Function
11. On success: update `wardrobe_items.image_url` with returned URL (overwrites at deterministic path `{user_id}/generated/{item_id}.webp`)
12. Increment usage via `incrementUsageCounter()` (skip if retry)
13. Log to `generation_log`
14. Return result with updated quota

**Success Response**:
```typescript
{
  success: true;
  image_url: string;  // New image URL set on the wardrobe item
  quota_remaining: { monthly: number; hourly: number };
}
```

**Error Responses**:
- `401`: Not authenticated
- `403`: Wardrobe item not owned by user / free tier user
- `409`: Generation already in progress for this wardrobe item
- `422`: Wardrobe item missing required data (category, color)
- `429`: Monthly or hourly quota exceeded (includes reset time)
- `500`: Edge Function or Replicate API failure

---

## 2. `getImageGenerationQuota`

Returns current quota usage and limits for the authenticated user.

**Input**: None (uses session)

**Flow**:
1. Authenticate session
2. Resolve entitlements via `resolveUserEntitlements()`
3. Calculate remaining monthly and hourly quota from `usage_counters`
4. Auto-reset monthly count if past reset date

**Success Response**:
```typescript
{
  success: true;
  tier: string; // 'free' | 'plus' | 'pro'
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

## 3. `cancelWardrobeItemImageGeneration`

Cancels a pending (not yet processing) generation. This is a lightweight action since we don't have a separate image records table — it simply signals the Edge Function to abort if possible.

**Input**:
```typescript
{
  wardrobe_item_id: string; // UUID
}
```

**Flow**:
1. Validate UUID
2. Authenticate session
3. Verify wardrobe item ownership
4. If generation is in progress, attempt to cancel (best-effort)
5. Quota is NOT decremented (only incremented on success)

**Success Response**:
```typescript
{
  success: true;
}
```
