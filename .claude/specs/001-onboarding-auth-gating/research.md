# Research: Onboarding Gating & Auth Flow Wiring

**Date**: 2026-02-13
**Feature**: 001-onboarding-auth-gating

## Current Auth Flow Architecture

### Decision: Use server-side wardrobe readiness check, not client-side
**Rationale**: The auth callback and confirm routes already run server-side
and perform redirects. Adding a wardrobe item count query here is a
single additional DB call with minimal latency. This avoids a client-side
flash-of-wrong-page and keeps routing logic centralized.
**Alternatives considered**:
- Client-side check in a layout wrapper: Rejected because it would cause
  a visible redirect after the page partially renders.
- Middleware-level check: Rejected because middleware runs on the edge and
  cannot perform Supabase queries with user context reliably.

### Decision: Remove seed-user Edge Function calls from auth routes
**Rationale**: The spec assumes new users start with empty wardrobes.
The current `seed-user` calls in `callback/route.ts` (line 85-96) and
`confirm/route.ts` (line 46) create demo data that conflicts with the
onboarding-first flow. Removing them ensures new users always enter
onboarding.
**Alternatives considered**:
- Keep seed but check after: Rejected because seed is async and may
  complete after the redirect check, causing race conditions.

## Wardrobe Readiness Check Strategy

### Decision: Server-side query with `.select('id').eq('active', true).limit(1)`
**Rationale**: Minimal data transfer. Only needs to know if at least one
active row exists. Using `limit(1)` ensures constant-time performance
regardless of wardrobe size.
**Alternatives considered**:
- Full count query: Rejected as unnecessarily expensive.
- Cached flag on user profile: Rejected as over-engineering for v1.
  Would require a new column, migration, and sync logic.

## Page Gating Strategy

### Decision: Server-side redirect in each page's Server Component
**Rationale**: Pages that need gating (`/today`, `/wardrobe`, `/outfits`,
`/anchor`) already have server-side auth checks. Adding the wardrobe
readiness check alongside the auth check is minimal code and uses
Next.js `redirect()` which prevents any client-side rendering.
**Alternatives considered**:
- Shared layout with redirect: Rejected because these pages don't share
  a single layout that excludes settings.
- Middleware check: Rejected because Supabase middleware cannot reliably
  query user-specific data at the edge layer.

## Onboarding Persister RLS Fix

### Decision: Add `user_id` to the insert payload explicitly
**Rationale**: The current `mapGeneratedItemToInput()` omits `user_id`,
relying on RLS to enforce ownership. However, the RLS INSERT policy
requires `user_id = auth.uid()` in the row data — it doesn't auto-fill
it. The insert fails silently because the row lacks the required field.
Adding `user_id` to `CreateWardrobeItemInput` and the mapper function
fixes the policy check.
**Alternatives considered**:
- Database trigger to auto-fill user_id: Rejected as it would bypass
  RLS validation and reduce security visibility.
- Change RLS policy to not require user_id on insert: Rejected as it
  weakens security guarantees.

## Post-Onboarding Redirect

### Decision: Redirect to `/wardrobe` after successful onboarding
**Rationale**: Per clarification session — users want to see their
newly added items immediately. The wardrobe page is the natural
destination after adding items.
**Alternatives considered**:
- Redirect to `/today`: Rejected because users may not have enough
  item variety for outfit generation immediately.

## Protected Routes Update

### Decision: Add `/onboarding` to middleware `protectedRoutes` array
**Rationale**: Currently `/onboarding` is not in the protected routes
list (`['/wardrobe', '/outfits', '/anchor', '/settings']`). Adding it
ensures unauthenticated users are redirected to login before reaching
the onboarding page. The existing `AuthBoundary` in the page provides
a second layer of defense.
**Alternatives considered**:
- Rely solely on AuthBoundary: Rejected because middleware provides
  earlier, more reliable interception before any page code runs.

## Login/Signup Redirect Targets

### Decision: Change default post-login redirect from `/wardrobe` to `/today`
**Rationale**: The auth callback and confirm routes will handle the
onboarding check and redirect empty-wardrobe users. Setting the default
to `/today` means users with items go directly to the daily outfit page,
while the server-side check handles the onboarding case.
**Alternatives considered**:
- Keep `/wardrobe` as default: Rejected because `/today` is the
  intended primary landing page for returning users with items.
