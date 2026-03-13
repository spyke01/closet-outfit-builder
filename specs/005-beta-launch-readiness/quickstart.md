# Developer Quickstart: Beta Launch Readiness

**Branch**: `005-beta-launch-readiness` | **Date**: 2026-03-09

## Environment Setup

No new environment variables are required beyond what's already configured. Confirm these are set:

```bash
# Stripe (already required)
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_PRICE_PLUS_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...

# Supabase (already required)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...    # Required for webhook redemption inserts
```

## Database Migrations

Run in order:

```bash
# 1. Add walkthrough state to user_preferences
supabase migration new add_walkthrough_completed_at

# 2. Add user_saved tracking to today_ai_outfits
supabase migration new add_today_user_saved

# 3. Create promotional_codes and code_redemptions tables
supabase migration new create_promotional_codes
```

See `data-model.md` for exact SQL. Apply locally:
```bash
supabase db reset   # or supabase migration up
```

## Key Files to Create

| File | Purpose |
|------|---------|
| `app/(app)/analytics/page.tsx` | Analytics dashboard page (server component) |
| `components/analytics/analytics-dashboard.tsx` | Client dashboard UI |
| `app/(app)/export/page.tsx` | Export & Share page |
| `components/export/export-share-client.tsx` | Export client component |
| `components/walkthrough/walkthrough-coach.tsx` | Coach mark component |
| `lib/hooks/use-walkthrough.ts` | Walkthrough step state hook |
| `lib/actions/walkthrough.ts` | `completeWalkthrough()` server action |
| `lib/actions/promo-code.ts` | `validatePromoCode()` server action |
| `app/api/billing/promo-code/validate/route.ts` | Promo code validation endpoint |
| `app/api/admin/billing/promo-codes/route.ts` | Admin promo code CRUD |
| `app/api/analytics/dashboard/route.ts` | Analytics data endpoint |
| `supabase/migrations/*_create_promotional_codes.sql` | DB migration |
| `supabase/migrations/*_add_walkthrough_completed_at.sql` | DB migration |
| `supabase/migrations/*_add_today_user_saved.sql` | DB migration |

## Key Files to Modify

| File | Change |
|------|--------|
| `app/pricing/page.tsx` | Add auth check → redirect to `/settings/billing` |
| `app/settings/billing/billing-page-client.tsx` | Add promo code input field above checkout button |
| `components/billing/plan-selector.tsx` | Update Sebastian listing for Free tier; no "coming soon" labels needed |
| `lib/services/billing/stripe.ts` | Remove `allow_promotion_codes: true`; support `discounts` param |
| `app/api/billing/checkout/route.ts` | Accept `promotionCodeId`; resolve to Stripe coupon |
| `app/api/stripe/webhook/route.ts` | Count redemptions after confirmed checkout |
| `app/admin/billing/page-client.tsx` | Add "Promotional Codes" tab/section |
| `app/onboarding/page.tsx` | Change post-completion redirect from `/today` to `/wardrobe` |
| `components/top-bar.tsx` | Add Analytics nav link (Plus/Pro); add Export link |
| `app/about/page.tsx` | Fix offline claim, tech refs, feature icons, add Sebastian |
| `app/sebastian/page.tsx` | Replace hardcoded hex with CSS variable classes |
| `components/homepage/*.tsx` (6 files) | Replace hardcoded hex with CSS variable classes |

## Testing Locally

```bash
# Run dev server
npm run dev

# Run tests
npm run test:run

# Type check
npm run typecheck

# Lint
npm run lint

# Test Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Stripe Coupon Setup (Test Mode)

When testing promo code creation via admin UI, the server action will call Stripe API to create a coupon. Verify in Stripe Dashboard > Coupons that the coupon appears after creation.

For manual testing without admin UI:
```bash
# Create a test coupon via Stripe CLI
stripe coupons create \
  --percent-off=50 \
  --duration=repeating \
  --duration-in-months=3 \
  --name="BETA50"
```

Then insert a row into `promotional_codes` with the returned coupon ID.

## Walkthrough Testing

1. Create a fresh test account
2. Complete onboarding
3. Confirm redirect goes to `/wardrobe` (not `/today`)
4. Confirm coach mark sequence starts automatically
5. Verify `user_preferences.walkthrough_completed_at` is set after completion/dismissal
6. Log out, log back in — confirm walkthrough does NOT retrigger
7. Navigate to Settings → verify "Replay walkthrough" option is present
