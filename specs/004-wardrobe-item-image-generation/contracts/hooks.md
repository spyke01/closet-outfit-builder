# Hook Contracts: Wardrobe Item Image Generation

**Branch**: `004-wardrobe-item-image-generation` | **Date**: 2026-02-17

## Overview

Custom React hooks following existing patterns in `lib/hooks/`. Uses TanStack Query for server state.

---

## 1. `useGenerateWardrobeItemImage()`

**File**: `lib/hooks/use-wardrobe-item-image-generation.ts`

Mutation hook for triggering AI image generation for a wardrobe item.

```typescript
interface UseGenerateWardrobeItemImageReturn {
  generate: (params: { wardrobe_item_id: string; is_retry?: boolean }) => void;
  isGenerating: boolean;
  error: Error | null;
}
```

**Mutation behavior**:
- Calls `generateWardrobeItemImage` server action
- On success: invalidates `['wardrobe-items']` and `['wardrobe-item', wardrobe_item_id]` queries (so the updated `image_url` is fetched)
- On error: does NOT invalidate (quota unchanged on failure)
- Debounce: 3-second cooldown between calls (FR-014)

---

## 2. `useImageGenerationQuota()`

**File**: `lib/hooks/use-wardrobe-item-image-generation.ts`

Fetches current user's quota status. Can also be sourced from `useBillingEntitlements()` if available.

```typescript
interface UseImageGenerationQuotaReturn {
  tier: string; // 'free' | 'plus' | 'pro'
  limits: {
    monthly_limit: number;
    monthly_remaining: number;
    monthly_reset_at: string;
    hourly_limit: number;
    hourly_remaining: number;
  };
  isLoading: boolean;
  canGenerate: boolean; // true if both monthly and hourly quota available AND tier != 'free'
  isFreeTier: boolean;  // true if tier === 'free'
}
```

**Query key**: `['image-generation-quota']`
**Stale time**: 1 minute (quota changes frequently during generation sessions)

---

## Query Key Registry

Add to existing `queryKeys` pattern:

```typescript
export const queryKeys = {
  // ... existing keys
  imageGenerationQuota: () => ['image-generation-quota'] as const,
};
```

**Note**: Wardrobe item data is already cached under existing `['wardrobe-items']` and `['wardrobe-item', id]` query keys. No new query keys needed for item data — the mutation simply invalidates these existing keys to refetch the updated `image_url`.

---

## Removed Hooks (from previous spec)

The following hooks from the original "outfit image generation" spec are **no longer needed**:

- ~~`useOutfitImages(outfitId)`~~ — No separate image records; `image_url` is on the wardrobe item
- ~~`useDeleteOutfitImage()`~~ — No image gallery/history to delete from
- ~~`useSetPrimaryOutfitImage()`~~ — No primary image concept; only one image per item
