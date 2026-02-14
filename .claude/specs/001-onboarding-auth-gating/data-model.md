# Data Model: Onboarding Gating & Auth Flow Wiring

**Date**: 2026-02-13
**Feature**: 001-onboarding-auth-gating

## Entities

### Wardrobe Item (existing — modified)

No schema changes to the `wardrobe_items` table. The only change is to
the application-level insert payload.

**Relevant fields for this feature**:

| Field     | Type    | Notes                                      |
|-----------|---------|--------------------------------------------|
| id        | UUID    | Primary key                                |
| user_id   | UUID    | FK to auth.users — required by RLS INSERT  |
| active    | boolean | Determines wardrobe readiness (true=active)|
| name      | text    | Item display name                          |
| category_id | UUID  | FK to categories                           |

**Insert payload change**:
- `CreateWardrobeItemInput` type MUST include `user_id: string`
- `mapGeneratedItemToInput()` MUST populate `user_id` from the
  authenticated session

**RLS policy (existing, unchanged)**:
- INSERT: `user_id = auth.uid()` — row must include user_id matching
  the authenticated user
- SELECT: `user_id = auth.uid()` — users can only read their own items

### Wardrobe Readiness (new concept — no table)

A derived state computed at request time, not stored.

**Definition**: A user has an active wardrobe if
`COUNT(wardrobe_items WHERE user_id = ? AND active = true) >= 1`

**Query pattern**:
```
SELECT id FROM wardrobe_items
WHERE user_id = $userId AND active = true
LIMIT 1
```

Returns: `boolean` — true if at least one row exists.

**Usage points**:
- Auth callback route (post-OAuth)
- Auth confirm route (post-email-verification)
- Server-side page components (today, wardrobe, outfits, anchor)

## State Transitions

### User Wardrobe Lifecycle

```
[New User] --(register/login)--> [Empty Wardrobe]
    |
    v
[Empty Wardrobe] --(redirected to onboarding)--> [In Onboarding]
    |
    v
[In Onboarding] --(completes, items saved)--> [Active Wardrobe]
    |
    v
[Active Wardrobe] --(deletes all items)--> [Empty Wardrobe]
    |
    v (re-enters onboarding)
[In Onboarding] --(completes, items ADDED)--> [Active Wardrobe]
```

**Key transitions**:
- Empty → Active: Onboarding persister saves items with `active: true`
- Active → Empty: User deletes all items (existing delete flow)
- Active → Active (re-onboard): New items added alongside existing
  (additive, no replacement)

## No Database Migrations Required

This feature does not add tables, columns, or RLS policies.
All changes are application-level:
1. Insert payload includes `user_id`
2. Server-side readiness query
3. Routing logic in auth routes and page components
