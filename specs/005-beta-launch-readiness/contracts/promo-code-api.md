# API Contract: Promotional Code System

**Branch**: `005-beta-launch-readiness` | **Date**: 2026-03-09

---

## POST `/api/billing/promo-code/validate`

Validates a promotional code for a given plan selection. Returns discounted pricing if valid.

**Auth**: Required (authenticated user)

**Request**:
```typescript
{
  code: string;        // e.g. "BETA50"
  plan: 'plus' | 'pro';
  interval: 'month' | 'year';
}
```

**Response (valid)**:
```typescript
{
  valid: true;
  discountPercent: number;         // e.g. 50
  durationMonths: number;          // e.g. 3
  fullPriceCents: number;          // e.g. 499
  discountedPriceCents: number;    // e.g. 250
  stripePromotionCodeId: string;   // Passed to checkout session
  message?: string;
}
```

**Response (invalid)**:
```typescript
{
  valid: false;
  reason: 'not_found' | 'expired' | 'exhausted' | 'already_used' | 'yearly_not_eligible';
  message: string;   // Human-readable explanation shown in UI
}
```

**Validation Order**:
1. Code exists and `revoked_at IS NULL`
2. `expires_at IS NULL OR expires_at > now()`
3. `current_redemptions < max_redemptions`
4. No existing `code_redemptions` row for `(code_id, current_user_id)`
5. `interval == 'month'` (yearly plans return `yearly_not_eligible`)

**Security**: Server Action validates user session. Never trusts client-supplied coupon IDs. Stripe coupon ID is resolved server-side and never exposed directly in error responses.

---

## POST `/api/billing/checkout` (modified)

Existing endpoint extended with optional promotion code support.

**Additional Request Field**:
```typescript
{
  plan: 'plus' | 'pro';
  interval: 'month' | 'year';
  promotionCodeId?: string;  // NEW: opaque ID from validate endpoint, not the Stripe coupon ID directly
}
```

**Behavior Change**:
- If `promotionCodeId` is present: re-validates server-side (security re-check), then passes `discounts: [{ coupon: stripe_coupon_id }]` to Stripe checkout session creation
- If `promotionCodeId` is absent: creates session without `discounts` (and without `allow_promotion_codes: true` — this flag is removed)
- `allow_promotion_codes: true` is removed from all checkout session creation to prevent users from entering Stripe-native codes that bypass our tracking

---

## GET `/api/admin/billing/promo-codes`

Lists all promotional codes with redemption stats.

**Auth**: Required (billing admin role)

**Response**:
```typescript
{
  codes: Array<{
    id: string;
    code: string;
    discountPercent: number;
    durationMonths: number;
    maxRedemptions: number;
    currentRedemptions: number;
    expiresAt: string | null;
    revokedAt: string | null;
    createdAt: string;
    isActive: boolean;   // computed: not revoked, not expired, not exhausted
  }>;
}
```

---

## POST `/api/admin/billing/promo-codes`

Creates a new promotional code and corresponding Stripe coupon.

**Auth**: Required (billing admin role)

**Request**:
```typescript
{
  code: string;              // e.g. "BETA50" — validated: alphanumeric, uppercase, 4–20 chars
  discountPercent: number;   // 1–99
  durationMonths: number;    // 1–12
  maxRedemptions: number;    // 1–10000
  expiresAt?: string;        // ISO date string, optional
}
```

**Response**:
```typescript
{
  id: string;
  code: string;
  stripeCouponId: string;
  createdAt: string;
}
```

**Side Effects**:
- Creates a Stripe coupon via `stripe.coupons.create({ percent_off: discountPercent, duration: 'repeating', duration_in_months: durationMonths, name: code })`
- Stores the returned `coupon.id` in `promotional_codes.stripe_coupon_id`

---

## DELETE `/api/admin/billing/promo-codes/[id]`

Revokes a promotional code (sets `revoked_at`). Does not delete from DB (audit trail preserved). Does not affect already-redeemed subscriptions.

**Auth**: Required (billing admin role)

**Response**: `{ success: true }`

**Side Effects**: Sets `promotional_codes.revoked_at = now()`. Does NOT archive the Stripe coupon (existing subscriptions with the coupon continue their discount period).

---

## Webhook Modification: `POST /api/stripe/webhook`

**Event**: `checkout.session.completed`

**Additional Processing** (when session has a discount applied):
1. Inspect `session.discounts[0].coupon.id` from the completed checkout session
2. Look up `promotional_codes` where `stripe_coupon_id = coupon_id`
3. Look up `code_redemptions` to confirm no row already exists for `(code_id, user_id)`
4. If confirmed: `INSERT INTO code_redemptions (code_id, user_id, stripe_subscription_id)` using service role
5. `UPDATE promotional_codes SET current_redemptions = current_redemptions + 1 WHERE id = code_id`
6. Both operations in a single database transaction to prevent race conditions

**Idempotency**: If `code_redemptions` insert fails due to UNIQUE constraint (already redeemed), log and continue — this is a safe duplicate-event scenario.
