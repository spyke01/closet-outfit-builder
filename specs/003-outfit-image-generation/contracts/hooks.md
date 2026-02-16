# Hook Contracts: Outfit Image Generation

**Branch**: `003-outfit-image-generation` | **Date**: 2026-02-15

## Overview

Custom React hooks following existing patterns in `lib/hooks/`. All use TanStack Query for server state.

---

## 1. `useOutfitImages(outfitId: string)`

**File**: `lib/hooks/use-outfit-images.ts`

Fetches generated images for a specific outfit.

```typescript
interface UseOutfitImagesReturn {
  images: GeneratedOutfitImage[];
  isLoading: boolean;
  error: Error | null;
  primaryImage: GeneratedOutfitImage | undefined;
}
```

**Query key**: `['outfit-images', outfitId]`
**Stale time**: 5 minutes (consistent with `useOutfits`)
**Enabled**: only when `outfitId` is defined

---

## 2. `useGenerateOutfitImage()`

**File**: `lib/hooks/use-outfit-images.ts`

Mutation hook for triggering image generation.

```typescript
interface UseGenerateOutfitImageReturn {
  generate: (params: { outfit_id: string; retry_of?: string }) => void;
  isGenerating: boolean;
  error: Error | null;
}
```

**Mutation behavior**:
- Calls `generateOutfitImage` server action
- On success: invalidates `['outfit-images', outfit_id]` and `['image-generation-quota']` queries
- On error: does NOT invalidate (quota unchanged on failure)
- Debounce: 3-second cooldown between calls (FR-018)

---

## 3. `useImageGenerationQuota()`

**File**: `lib/hooks/use-outfit-images.ts`

Fetches current user's quota status.

```typescript
interface UseImageGenerationQuotaReturn {
  tier: AccountTier;
  limits: {
    monthly_limit: number;
    monthly_remaining: number;
    monthly_reset_at: string;
    hourly_limit: number;
    hourly_remaining: number;
  };
  isLoading: boolean;
  canGenerate: boolean; // true if both monthly and hourly quota available AND tier != 'starter'
  isFreeTier: boolean;  // true if tier === 'starter'
}
```

**Query key**: `['image-generation-quota']`
**Stale time**: 1 minute (quota changes frequently during generation sessions)

---

## 4. `useDeleteOutfitImage()`

**File**: `lib/hooks/use-outfit-images.ts`

Mutation hook for deleting a generated image.

```typescript
interface UseDeleteOutfitImageReturn {
  deleteImage: (imageId: string) => void;
  isDeleting: boolean;
}
```

**Mutation behavior**:
- Optimistic update: removes image from query cache immediately
- On error: rolls back cache
- Invalidates `['outfit-images', outfit_id]`

---

## 5. `useSetPrimaryOutfitImage()`

**File**: `lib/hooks/use-outfit-images.ts`

Mutation hook for setting primary thumbnail.

```typescript
interface UseSetPrimaryOutfitImageReturn {
  setPrimary: (params: { image_id: string; outfit_id: string }) => void;
  isUpdating: boolean;
}
```

**Mutation behavior**:
- Optimistic update: updates `is_primary` flags in cache
- Invalidates `['outfit-images', outfit_id]` and `['outfits']` (outfit card may show thumbnail)

---

## Query Key Registry

Add to existing `queryKeys` pattern:

```typescript
export const queryKeys = {
  // ... existing keys
  outfitImages: (outfitId: string) => ['outfit-images', outfitId] as const,
  imageGenerationQuota: () => ['image-generation-quota'] as const,
};
```
