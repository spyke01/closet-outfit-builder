# Implementation Plan: Beta Launch Readiness

**Branch**: `005-beta-launch-readiness` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-beta-launch-readiness/spec.md`

## Summary

Prepares the My AI Outfit app for beta customer launch across five parallel work areas:

1. **Feature Parity** — Build a basic Analytics dashboard (wardrobe + outfit engagement stats) and a basic Export & Share page, each with in-feature roadmap sections and free-tier previews. Add `user_saved` tracking to `today_ai_outfits` to enable acceptance-rate analytics.
2. **Content Consistency** — Fix the About page (remove offline claim, tech stack references, clothing-image feature icons; add Sebastian); align Sebastian's access model and feature terminology across all marketing pages; update `plan-selector.tsx` to show Sebastian as available on all tiers.
3. **Beta Discount** — Build a custom promotional code system (two new Supabase tables, in-app validation, Stripe coupon integration, webhook-driven redemption counting); add a promo code entry UI to the billing settings plan selector; add admin management to the existing admin billing page.
4. **New User Walkthrough** — Build a 5-step coach mark sequence that auto-triggers on the Wardrobe page after onboarding completion; covers wardrobe → outfit building → Today → Sebastian; persists completion state in `user_preferences`.
5. **UI/UX Polish** — Replace hardcoded hex color values in 8 marketing page files with semantic CSS variable classes from the design system.

## Technical Context

**Language/Version**: TypeScript 5.5+ strict, Next.js App Router, React 19, Deno (Edge Functions)
**Primary Dependencies**: Supabase JS, Stripe Node SDK, TanStack Query, Radix UI, Tailwind CSS 4, Zod, Lucide React (direct imports)
**Storage**: Supabase PostgreSQL + Supabase Storage (`wardrobe-images` bucket)
**Testing**: Vitest + Testing Library + Axe
**Target Platform**: Web (Netlify)
**Project Type**: Web application
**Performance Goals**: LCP < 2.5s, FID < 100ms, CLS < 0.1, TTI < 3.5s on 4G (constitution)
**Constraints**: Bundle < 500KB gzipped, First Load JS < 200KB; WCAG 2.1 AA; RLS on all user tables; Server Actions follow validate-authenticate-authorize-execute
**Scale/Scope**: Beta cohort ~30 users; existing app with full billing, wardrobe, outfit, calendar, and admin infrastructure

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | ✅ Pass | All new code uses strict TypeScript; Zod validates all server action inputs and API responses |
| II. Test-Driven Quality | ✅ Pass | New components require Vitest + Testing Library tests; behavior-based selectors (`getByRole`, `getByLabelText`) |
| III. Security by Default | ✅ Pass | RLS on `promotional_codes` and `code_redemptions`; promo code Stripe coupon ID never exposed to client; webhook uses service role for redemption inserts; Server Actions validate-authenticate-authorize-execute |
| IV. Simplicity & YAGNI | ✅ Pass | No new admin routes (admin billing page extended); custom coach marks (no third-party library); no demo components |
| Theming Standard | ✅ Pass | Hardcoded hex replaced with `bg-primary`, `bg-secondary`, `text-foreground`, `border-border` etc. |
| Component Architecture | ✅ Pass | Server Components by default; `'use client'` only for walkthrough, promo code input, analytics client |
| Bundle Optimization | ✅ Pass | Analytics dashboard uses dynamic import if > 50KB; Lucide direct imports throughout |
| Accessibility | ✅ Pass | Coach marks: `aria-label`, keyboard dismissal (`Escape`), `prefers-reduced-motion` respects |

**No violations. Proceeding.**

## Project Structure

### Documentation (this feature)

```text
specs/005-beta-launch-readiness/
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # New tables and column changes
├── quickstart.md        # Developer setup guide
├── contracts/
│   ├── promo-code-api.md      # Promo code validation + admin CRUD contracts
│   ├── analytics-api.md       # Analytics dashboard API contract
│   └── export-share-api.md    # Export & share feature contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (affected paths)

```text
app/
├── (app)/
│   ├── analytics/
│   │   └── page.tsx                           # NEW: Analytics dashboard page
│   └── export/
│       └── page.tsx                           # NEW: Export & Share page
├── pricing/page.tsx                           # MODIFY: auth redirect → /settings/billing
├── settings/billing/billing-page-client.tsx   # MODIFY: add promo code input field
├── admin/billing/
│   └── page-client.tsx                        # MODIFY: add Promotional Codes tab
├── onboarding/page.tsx                        # MODIFY: redirect to /wardrobe (was /today)
├── about/page.tsx                             # MODIFY: content fixes
├── api/
│   ├── billing/
│   │   ├── checkout/route.ts                  # MODIFY: accept promotionCodeId
│   │   └── promo-code/validate/route.ts       # NEW
│   ├── admin/billing/promo-codes/
│   │   ├── route.ts                           # NEW: GET list, POST create
│   │   └── [id]/route.ts                      # NEW: DELETE revoke
│   ├── analytics/dashboard/route.ts           # NEW
│   └── stripe/webhook/route.ts                # MODIFY: count redemptions

components/
├── analytics/
│   └── analytics-dashboard.tsx                # NEW: client analytics UI
├── export/
│   └── export-share-client.tsx                # NEW: export/share UI
├── walkthrough/
│   └── walkthrough-coach.tsx                  # NEW: coach mark component
├── billing/plan-selector.tsx                  # MODIFY: Sebastian free-tier listing
├── homepage/
│   ├── app-demo.tsx                           # MODIFY: hex → CSS vars
│   ├── hero-section.tsx                       # MODIFY: hex → CSS vars
│   ├── how-it-works.tsx                       # MODIFY: hex → CSS vars
│   ├── navigation.tsx                         # MODIFY: hex → CSS vars
│   ├── sebastian-section.tsx                  # MODIFY: hex → CSS vars
│   └── final-cta.tsx                          # MODIFY: hex → CSS vars
└── top-bar.tsx                                # MODIFY: add Analytics nav link

lib/
├── actions/
│   ├── promo-code.ts                          # NEW: validatePromoCode server action
│   ├── walkthrough.ts                         # NEW: completeWalkthrough server action
│   └── analytics.ts                           # NEW: getAnalyticsDashboard server action
├── hooks/
│   └── use-walkthrough.ts                     # NEW: walkthrough step state
├── services/billing/stripe.ts                 # MODIFY: remove allow_promotion_codes
└── types/
    └── promo-code.ts                          # NEW: PromoCode, CodeRedemption types

supabase/migrations/
├── YYYYMMDD_create_promotional_codes.sql      # NEW
├── YYYYMMDD_add_walkthrough_completed_at.sql  # NEW
└── YYYYMMDD_add_today_user_saved.sql          # NEW

app/sebastian/page.tsx                         # MODIFY: hex → CSS vars
```

## Phase 0: Research (Complete)

See [research.md](research.md) for full decisions and rationale. Key decisions:

| Topic | Decision |
|-------|----------|
| Promo code infrastructure | Custom DB tables + Stripe coupon (hybrid); validation in-app, discount applied via `discounts[]` in checkout session |
| Walkthrough library | Custom-built coach marks (no third-party); state in `user_preferences.walkthrough_completed_at` |
| Analytics data | Derived from existing tables; add `today_ai_outfits.user_saved` column for acceptance tracking |
| Export & Share | Client-side PNG export via canvas; Web Share API with clipboard fallback; Pro-gated |
| About page | Remove tech stack sentence, rewrite offline claim, replace clothing images with Lucide icons, add Sebastian card |
| Hex color replacement | All 8 files: `bg-[#D49E7C]` → `bg-secondary`, `bg-[#194957]` dark → `bg-primary`, `text-[#E8F0F2]` → `text-foreground`, `border-[#3b6270]` → `border-border` |

## Phase 1: Design & Contracts (Complete)

### Data Model

See [data-model.md](data-model.md). Summary:

**New tables**:
- `promotional_codes` — admin-created codes with Stripe coupon ID, redemption cap, expiry
- `code_redemptions` — confirmed redemptions per user per code (UNIQUE on `code_id, user_id`)

**Column additions**:
- `user_preferences.walkthrough_completed_at timestamptz` — walkthrough state persistence
- `today_ai_outfits.user_saved boolean DEFAULT false` — Today recommendation acceptance tracking

### API Contracts

See [contracts/](contracts/):

| Contract | Key Endpoints |
|----------|--------------|
| [promo-code-api.md](contracts/promo-code-api.md) | `POST /api/billing/promo-code/validate`, `GET/POST /api/admin/billing/promo-codes`, `DELETE /api/admin/billing/promo-codes/[id]`, webhook modification |
| [analytics-api.md](contracts/analytics-api.md) | `GET /api/analytics/dashboard`, new `/analytics` page route |
| [export-share-api.md](contracts/export-share-api.md) | `/export` page route, client-side export, Web Share API |

### Component Architecture

#### Walkthrough Coach Mark System

```
WardrobePage (server)
└── WalkthroughCoach (client, 'use client')
    ├── useWalkthrough() hook — manages current step, dismiss, advance
    ├── CoachMarkOverlay — backdrop + step indicator
    └── CoachMarkTooltip — anchored to data-walkthrough-id element
        ├── Title + description
        ├── "Next" / "Got it" buttons
        └── "Skip tour" dismiss link
```

- Steps advance via Next button or are dismissed globally via "Skip tour" or `Escape`
- `completeWalkthrough()` Server Action called on final step AND on dismiss
- Respects `prefers-reduced-motion` (no animation when reduced)
- Mobile: tooltip repositions below viewport anchor if anchor is near top

#### Promo Code UI (Billing Settings)

```
BillingPageClient
└── PlanSelector (billing context)
    └── PromoCodeInput (new, 'use client')
        ├── Text input + "Apply" button
        ├── Calls validatePromoCode() server action
        ├── Shows success: discounted price preview ("$2.50/mo for 3 months, then $4.99/mo")
        ├── Shows error: human-readable reason
        └── Stores validated promotionCodeId in local state → passed to checkout
```

#### Analytics Dashboard

```
AnalyticsPage (server — reads user tier, prefetches data)
└── AnalyticsDashboard (dynamic import, 'use client')
    ├── WardrobeStatsSection (total items, total outfits — all users)
    ├── RecentlyAddedSection (last 5 items — Plus/Pro or blurred preview)
    ├── MostWornSection (top 5 — Plus/Pro or blurred preview)
    ├── OutfitEngagementSection (history, loved — Plus/Pro or blurred)
    ├── TodayStatsSection (acceptance rate — Plus/Pro or blurred)
    └── ComingSoonSection (roadmap — all users)
```

#### Admin Promotional Codes Section

Added as a new tab in the existing `app/admin/billing/page-client.tsx`:

```
AdminBillingPage
├── [Existing] User Search Tab
└── [New] Promotional Codes Tab
    ├── PromoCodeCreateForm (code, discount%, duration, maxRedemptions, expiresAt)
    ├── PromoCodeList (table: code, discount, uses/cap, expires, active/revoked, revoke action)
    └── PromoCodeRedemptionDetail (expandable: list of users who redeemed)
```

### Critical Implementation Notes

**Promo Code Security**
The Stripe coupon ID (`stripe_coupon_id`) is never sent to the client. The validate endpoint returns an opaque `stripePromotionCodeId` (our DB record UUID). The checkout endpoint resolves this UUID to the Stripe coupon ID server-side before creating the session. This prevents a client from injecting an arbitrary Stripe coupon ID.

**Redemption Counting Race Condition**
When two users simultaneously redeem the same code at the cap boundary (e.g., 29th and 30th use), the `UPDATE promotional_codes SET current_redemptions = current_redemptions + 1` is atomic in PostgreSQL. The `code_redemptions` UNIQUE constraint provides a second layer of safety. The webhook processes events sequentially per user (Stripe guarantees ordering per customer), so the race is bounded.

**Walkthrough Trigger Logic**
The Wardrobe page server component checks:
1. Is the user authenticated? (always true on this page)
2. Does `user_preferences.walkthrough_completed_at IS NULL`?
3. If both true: render `<WalkthroughCoach initiallyVisible />` — triggers on mount.

This check is free (already loading `user_preferences` for theme and other settings). No additional round trip.

**Onboarding Redirect Change**
The only change needed: after onboarding wizard completes and items are saved, change the redirect from `router.push('/today')` to `router.push('/wardrobe')`. The walkthrough trigger logic on the Wardrobe page handles the rest.

**Today `user_saved` Tracking**
When the user clicks "Save outfit" on the Today page, the existing `createOutfit()` Server Action is called. After creating the outfit, add: `UPDATE today_ai_outfits SET user_saved = true WHERE user_id = $uid AND entry_date = today`. This keeps the save action atomic in the same server action call.

**Pricing Page Redirect**
In `app/pricing/page.tsx` (currently a server component thin wrapper), add at the top:
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (session) redirect('/settings/billing');
```
This runs server-side with no client impact.

### Post-Design Constitution Re-check

| Principle | Status |
|-----------|--------|
| Type Safety | ✅ All new Zod schemas at API boundaries; `promotionCodeId` validated as UUID before DB lookup |
| Security | ✅ Stripe coupon ID resolved server-side; RLS policies verified in data-model.md; service role used only in webhook |
| Simplicity | ✅ No new packages added; coach marks are ~150 LoC; no new admin routes |
| Theming | ✅ All hex replacements map to existing design system tokens |
| Bundle | ✅ Analytics dashboard behind `next/dynamic`; export component behind `next/dynamic` |

**All gates pass. Ready for `/speckit.tasks`.**
