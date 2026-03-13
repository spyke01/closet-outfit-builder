# Data Model: Beta Launch Readiness

**Branch**: `005-beta-launch-readiness` | **Date**: 2026-03-09

## New Tables

### `promotional_codes`

Stores admin-created beta discount codes. Each code maps 1:1 to a Stripe coupon.

```sql
CREATE TABLE promotional_codes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text UNIQUE NOT NULL,          -- User-facing code e.g. 'BETA50'
  stripe_coupon_id    text NOT NULL,                 -- Stripe coupon ID for discount application
  discount_percent    smallint NOT NULL,              -- e.g. 50
  duration_months     smallint NOT NULL,              -- e.g. 3
  max_redemptions     integer NOT NULL,               -- Admin-configured cap e.g. 30
  current_redemptions integer NOT NULL DEFAULT 0,
  expires_at          timestamptz,                    -- NULL = no expiry
  revoked_at          timestamptz,                    -- NULL = active; SET to revoke
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Admin-only write; authenticated users can read (for validation)
ALTER TABLE promotional_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promotional codes"
  ON promotional_codes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN app_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'billing'
  ));

CREATE POLICY "Authenticated users can read active codes for validation"
  ON promotional_codes FOR SELECT
  USING (auth.uid() IS NOT NULL AND revoked_at IS NULL);
```

**Validation rules**:
- A code is valid when: `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()) AND current_redemptions < max_redemptions`
- Codes apply to monthly billing only (enforced at the API layer, not DB layer)

---

### `code_redemptions`

Records each confirmed successful redemption of a promotional code by a user.

```sql
CREATE TABLE code_redemptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id              uuid NOT NULL REFERENCES promotional_codes(id),
  user_id              uuid NOT NULL REFERENCES auth.users(id),
  stripe_subscription_id text,                       -- Set after confirmed payment
  redeemed_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (code_id, user_id)                          -- One redemption per user per code
);

ALTER TABLE code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own redemptions"
  ON code_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all redemptions"
  ON code_redemptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN app_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'billing'
  ));

-- Insert only via server actions (no direct client insert)
CREATE POLICY "Service role can insert redemptions"
  ON code_redemptions FOR INSERT
  WITH CHECK (true);  -- Service role only in webhook handler
```

**Key constraints**:
- `UNIQUE (code_id, user_id)` enforces the one-use-per-account rule at the database level
- Inserts happen only inside the Stripe webhook handler after payment confirmation (service role)
- Abandoned checkouts do NOT insert rows

---

## Modified Tables

### `user_preferences` — add `walkthrough_completed_at`

```sql
ALTER TABLE user_preferences
  ADD COLUMN walkthrough_completed_at timestamptz;
-- NULL = never triggered or never completed
-- Timestamp = dismissed or completed (either state stops re-triggering)
```

**State logic**:
- `NULL` AND user has wardrobe items AND is their first session after onboarding → trigger walkthrough
- Any non-NULL value → do not re-trigger

---

### `today_ai_outfits` — add `user_saved`

```sql
ALTER TABLE today_ai_outfits
  ADD COLUMN user_saved boolean NOT NULL DEFAULT false;
```

**When set to `true`**: The server action that handles "Save outfit from Today page" updates this flag alongside creating the saved `outfits` record.

**Analytics use**:
- Accepted count: `COUNT(*) FILTER (WHERE user_saved = true)`
- Total recommendations: `COUNT(*)`
- Skip rate: `(total - accepted) / total`

---

## Unchanged Tables (Referenced)

These existing tables are read by new features but require no schema changes:

| Table | Used By |
|-------|---------|
| `wardrobe_items` | Analytics: total items, most-worn, recently added |
| `outfits` | Analytics: total outfits, outfit history; Export: outfit card |
| `outfit_items` | Analytics: most-worn item computation; Export: item images |
| `calendar_entries` | Analytics: worn outfit history |
| `user_subscriptions` | Entitlement checks for Analytics and Export & Share |
| `billing_events` | Webhook redemption processing |
| `user_preferences` | Walkthrough state (new column added above) |
| `today_ai_outfits` | Analytics: accepted/skipped counts (new column above) |

---

## Entity Summary

| Entity | Table | Key Relationships |
|--------|-------|-------------------|
| Promotional Code | `promotional_codes` | Has many `code_redemptions` |
| Code Redemption | `code_redemptions` | Belongs to `promotional_codes`, belongs to `auth.users` |
| Walkthrough State | `user_preferences.walkthrough_completed_at` | Belongs to `auth.users` (1:1) |
| Today Acceptance | `today_ai_outfits.user_saved` | Part of existing `today_ai_outfits` |
