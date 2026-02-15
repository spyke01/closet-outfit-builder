# Quickstart: Onboarding Gating & Auth Flow Wiring

**Date**: 2026-02-13
**Feature**: 001-onboarding-auth-gating

## What This Feature Does

After this change, new users (and returning users with empty wardrobes)
are automatically guided to the onboarding wizard before they can access
the main app pages. This ensures every user has wardrobe items before
trying to use outfit generation, wardrobe browsing, or anchor discovery.

## How to Test

### 1. New User Registration (OAuth)

1. Open the app in an incognito browser
2. Click "Sign up" and use Google OAuth
3. **Expected**: After OAuth completes, you land on `/onboarding`
4. Complete the onboarding wizard
5. **Expected**: After completion, you land on `/wardrobe` with your
   new items visible

### 2. New User Registration (Email)

1. Sign up with email/password
2. Confirm your email via the verification link
3. **Expected**: After confirmation, you land on `/onboarding`
4. Complete the onboarding wizard
5. **Expected**: After completion, you land on `/wardrobe`

### 3. Returning User With Items

1. Log in as a user who has wardrobe items
2. **Expected**: You land on `/today` (daily outfit page)
3. Navigate to `/wardrobe`, `/outfits`, `/anchor`
4. **Expected**: All pages load normally

### 4. Empty Wardrobe User Page Gating

1. Log in as a user with items, then delete all wardrobe items
2. Navigate to `/today`
3. **Expected**: Redirected to `/onboarding`
4. Try `/wardrobe`, `/outfits`, `/anchor`
5. **Expected**: All redirect to `/onboarding`
6. Try `/settings`
7. **Expected**: Settings page loads normally (exempt from gating)

### 5. Unauthenticated Onboarding Access

1. In an incognito browser, navigate to `/onboarding`
2. **Expected**: Redirected to `/auth/login`

### 6. Re-Onboarding (Additive)

1. Log in as a user with existing wardrobe items
2. Navigate directly to `/onboarding`
3. **Expected**: Onboarding page loads (not blocked)
4. Complete onboarding with new items
5. **Expected**: New items appear in wardrobe alongside existing items

## Key Files Changed

| File | Change |
|------|--------|
| `lib/server/wardrobe-readiness.ts` | New: readiness check + routing helper |
| `app/auth/callback/route.ts` | Modified: onboarding-aware redirect |
| `app/auth/confirm/route.ts` | Modified: onboarding-aware redirect |
| `app/today/page.tsx` | Modified: empty wardrobe redirect |
| `app/wardrobe/page.tsx` | Modified: empty wardrobe redirect |
| `app/outfits/page.tsx` | Modified: empty wardrobe redirect |
| `app/anchor/[category]/page.tsx` | Modified: empty wardrobe redirect |
| `lib/supabase/middleware.ts` | Modified: add `/onboarding` to protected |
| `lib/services/onboarding-persister.ts` | Modified: include `user_id` |
| `components/login-form.tsx` | Modified: redirect target to `/today` |
| `components/sign-up-form.tsx` | Modified: redirect target to `/today` |

## Rollback

To revert this feature:
1. Revert all file changes (git revert)
2. No database migrations to roll back
3. No data cleanup needed (items saved during onboarding are valid
   wardrobe items)
