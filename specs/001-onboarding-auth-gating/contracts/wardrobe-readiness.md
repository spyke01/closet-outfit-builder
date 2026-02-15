# Contract: Wardrobe Readiness

**Date**: 2026-02-13
**Feature**: 001-onboarding-auth-gating

## `hasActiveWardrobeItems`

**Purpose**: Determine if an authenticated user has at least one active
wardrobe item.

**Signature**:
```typescript
async function hasActiveWardrobeItems(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean>
```

**Behavior**:
- Queries `wardrobe_items` table filtered by `user_id` and `active = true`
- Returns `true` if at least one row exists
- Returns `false` if zero rows match
- On query error, returns `true` (fail-open: user proceeds to default
  destination rather than being blocked)

**Performance**: Single indexed query with `LIMIT 1`. Expected < 10ms.

## `getPostAuthRoute`

**Purpose**: Centralize the post-authentication routing decision.

**Signature**:
```typescript
function getPostAuthRoute(params: {
  hasItems: boolean
  requestedNext?: string | null
}): string
```

**Behavior**:
- If `hasItems` is `false`, returns `/onboarding`
- If `hasItems` is `true`, returns sanitized `requestedNext` or `/today`
- The `requestedNext` parameter MUST be sanitized to prevent open
  redirects (internal paths only, no absolute URLs)

**Routing matrix**:

| hasItems | requestedNext | Result |
|----------|--------------|--------|
| false    | any          | `/onboarding` |
| true     | `/wardrobe`  | `/wardrobe` |
| true     | null         | `/today` |
| true     | `https://...`| `/today` (rejected) |

## Onboarding Persister Insert Payload

**Current payload** (broken):
```typescript
{
  category_id: string
  name: string
  color: string
  formality_score: number
  season: string[]
  image_url: string
  capsule_tags: string[]
}
```

**Required payload** (fixed):
```typescript
{
  user_id: string          // <-- ADDED: required by RLS INSERT policy
  category_id: string
  name: string
  color: string
  formality_score: number
  season: string[]
  image_url: string
  capsule_tags: string[]
  active: boolean          // <-- ADDED: explicitly set to true
}
```

## Page Gating Contract

**Gated pages** (redirect to `/onboarding` when wardrobe empty):
- `/today`
- `/wardrobe`
- `/outfits`
- `/anchor` (and `/anchor/[category]`)

**Exempt pages** (no wardrobe check):
- `/settings`
- `/onboarding`
- `/auth/*`
- Public pages (landing, pricing, etc.)

**Gating behavior**:
```
if (!authenticated) → redirect to /auth/login  (existing middleware)
if (authenticated && !hasActiveWardrobeItems) → redirect to /onboarding
if (authenticated && hasActiveWardrobeItems) → render page normally
```
