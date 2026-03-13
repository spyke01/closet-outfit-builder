# Phase 0 Research: Beta Launch Readiness

**Branch**: `005-beta-launch-readiness` | **Date**: 2026-03-09

## 1. Promotional Code / Stripe Integration

### Decision
Hybrid approach: custom `promotional_codes` table in Supabase + corresponding Stripe coupon.

### How It Works
1. Admin creates a promo code in our system via the admin billing page → a Stripe coupon is created via Stripe API (50% off, 3 months duration, `duration: 'repeating'`) and its `coupon_id` is stored on our record.
2. When a user enters a code in the plan selector, a server action validates it against our table (checks `revoked_at`, `expires_at`, per-account redemption via `code_redemptions`, and remaining cap via `current_redemptions < max_redemptions`).
3. The validated Stripe coupon ID is passed to `createStripeCheckoutSession()` via `discounts: [{ coupon: stripe_coupon_id }]`.
4. `allow_promotion_codes: true` is removed from checkout session creation (codes are now validated and applied in-app, not at Stripe's checkout page).
5. After `checkout.session.completed` webhook fires with confirmed payment, a `code_redemptions` row is inserted and `current_redemptions` is incremented atomically.

### Key Finding: Existing Infrastructure
- `lib/services/billing/stripe.ts` creates checkout sessions with `allow_promotion_codes: 'true'` — this must be changed to pass `discounts` only when a validated coupon is applied.
- The webhook at `app/api/stripe/webhook/route.ts` already handles `checkout.session.completed` — redemption counting logic will be added here.
- Admin billing page (`app/admin/billing/page-client.tsx`) is extended with a "Promotional Codes" tab; no new routes required.

### Alternatives Considered
- **Stripe-native promotion codes only**: Rejected — Stripe's promotion code system cannot enforce per-account single-use limits or our custom hard redemption cap server-side before the checkout session is created.
- **Fully custom discount (no Stripe coupon)**: Rejected — Stripe coupon with `duration: 'repeating'` and `duration_in_months: 3` handles the automatic revert to full price after month 3 natively, eliminating the need for custom subscription management.

---

## 2. New User Walkthrough Implementation

### Decision
Custom-built coach mark sequence using React portals and `useRef` element anchoring. No third-party walkthrough library.

### Rationale
- Spec assumption: "lightweight coach mark or tooltip sequence rather than a full-screen modal tour"
- Third-party options (Shepherd.js, Intro.js, driver.js) add 30–80KB to the bundle, may conflict with Radix UI focus management and `prefers-reduced-motion`, and require wrappers that break SSR conventions
- Custom implementation is ~150 lines (hook + component); anchors to existing DOM elements via `data-walkthrough-id` attributes

### State Persistence
- `user_preferences` table already exists with per-user settings
- Add `walkthrough_completed_at timestamptz` column via migration
- `null` = walkthrough not yet triggered; timestamp = completed or explicitly dismissed
- A `completeWalkthrough()` server action updates this column
- Walkthrough state loaded server-side on the Wardrobe page (no client-side flicker)

### Onboarding Redirect Change
- Current: onboarding completion redirects to `/today`
- Required change: redirect to `/wardrobe` so the walkthrough triggers there
- The walkthrough then navigates the user: Wardrobe → `/outfits/create` (outfit building) → `/today`

### Walkthrough Step Map
| Step | Page | Anchor | Message |
|------|------|--------|---------|
| 1 | `/wardrobe` | First wardrobe item card | "These are the items you just added. Tap any item to edit or swap it." |
| 2 | `/wardrobe` | "Add item" button | "Grow your wardrobe by adding more items here." |
| 3 | `/outfits/create` or nav link | Outfits nav link | "Build outfits by combining items from your wardrobe." |
| 4 | `/today` | Today nav link | "Your daily AI recommendation lives here. It refreshes each day." |
| 5 | Sebastian button (floating) | Sebastian fab | "Ask Sebastian for styling advice anytime. Free users get limited access — upgrade for unlimited." |

---

## 3. Analytics Dashboard — Data Sources

### Decision
Derive analytics from existing tables; add one tracking column to `today_ai_outfits`.

### Existing Data Available
| Metric | Source |
|--------|--------|
| Total wardrobe items | `COUNT(wardrobe_items) WHERE active = true` |
| Total outfits created | `COUNT(outfits)` |
| Most-worn items | Join `outfit_items` → `wardrobe_items`, count appearances; cross-ref `calendar_entries WHERE status = 'worn'` |
| Recently added items | `wardrobe_items ORDER BY created_at DESC LIMIT 5` |
| Outfits saved from Today | **Gap — see below** |
| Today accepted vs skipped | **Gap — see below** |
| Outfit history | `outfits ORDER BY created_at DESC` |

### Gap: Today Recommendation Tracking
`today_ai_outfits.outfit_id` references the AI-generated outfit suggestion, not the user's saved action. There is currently no column tracking whether the user accepted (saved) vs skipped (regenerated without saving).

**Resolution**: Add `user_saved boolean DEFAULT false` to `today_ai_outfits`. When the user clicks Save on the Today page, the Server Action that calls `createOutfit()` also updates `today_ai_outfits SET user_saved = true` for that day's entry. Analytics can then compute `accepted = COUNT(CASE WHEN user_saved THEN 1 END)`.

### Existing API Foundation
`GET /api/wardrobe/dashboard` returns `totalItems`, `totalCategories`, `totalOutfits`, `categoryBreakdown`, `recentActivity`. Extend this or create a new `GET /api/analytics/dashboard` route with the full dataset.

### Free Tier Preview
Free-tier users see a blurred/greyed stat card layout with 2–3 sample numbers and an upgrade prompt. The blurred preview approach is chosen over an empty state or redirect because it shows immediate value (the feature looks useful) without delivering paid content.

---

## 4. Export & Share — Basic Implementation

### Decision
Export as a shareable outfit image card; share via the Web Share API with clipboard fallback.

### Data Available
All outfit data already exists: `outfits` + `outfit_items` + `wardrobe_items` (with `image_url`). No new tables required.

### Basic Implementation Scope
- **Export**: A single outfit's items rendered into a styled card (grid of item images + outfit name + score). User clicks "Export" → browser downloads the card as a PNG via `html-to-image` or native `canvas` API. No server-side image generation.
- **Share**: Web Share API (`navigator.share`) on supported mobile browsers with title + URL. Fallback: copy shareable URL to clipboard.
- **Shared URL**: `/outfits/[id]` — already exists but is auth-gated. For beta, shared links go to the public marketing site with a preview card (or the login page with a redirect).

### Free Tier Treatment
Free-tier users see the Export & Share page with a blurred export preview and an upgrade prompt. The actual export/share action is gated behind Plus/Pro entitlement check.

### In-Feature Roadmap Section
Visible to all users after the current capability, listing: "Coming soon: Share to Instagram Stories, Export full lookbook PDF, Collaborate with a stylist."

---

## 5. About Page — Required Content Changes

### Issues Identified (from codebase audit)
| Line | Issue | Fix |
|------|-------|-----|
| 101 | "Built with modern web technologies including Next.js, React, TypeScript, and Supabase" | Remove tech stack sentence |
| 102 | "…with offline capabilities" | Change to "…installable to your home screen for quick access" |
| 37–90 | Feature card icons are wardrobe clothing images (`ocbd-blue.png`, etc.) | Replace with Lucide React icons or abstract illustrations |
| — | Sebastian not mentioned in Key Features section | Add Sebastian feature card |
| — | "Curated Capsules" (homepage) vs no mention in About/Pricing | Align copy or remove from homepage |

---

## 6. UI Color Token Audit

### Hardcoded Hex Colors Found (8 files)
All 8 files use the same repeated pattern for CTA buttons and section backgrounds. These must be replaced with semantic CSS variable classes.

| Hardcoded | CSS Variable Class | Tailwind Class |
|-----------|-------------------|----------------|
| `bg-[#D49E7C]` (primary CTA) | `--secondary` in light mode, `--primary` in dark | `bg-secondary` (light) / use `bg-primary` convention |
| `text-[#1A2830]` | `--foreground` (dark) | `text-foreground` |
| `hover:bg-[#e1b08f]` | secondary hover | `hover:bg-secondary/90` |
| `bg-[#294653]` (dark section bg) | `--card` dark mode equivalent | `bg-card` |
| `text-[#E8F0F2]` (light text on dark bg) | `--foreground` dark mode | `text-foreground` |
| `border-[#3b6270]` | `--border` | `border-border` |

**Note**: The public marketing pages use the secondary/terracotta color (`#D49E7C`) as the primary CTA color on dark teal backgrounds. This is intentional brand design; however, they should reference `var(--secondary)` via `bg-secondary` and `bg-primary` (for dark sections) rather than raw hex values so that dark mode works correctly.

**Files requiring color token updates:**
- `components/homepage/app-demo.tsx`
- `components/homepage/hero-section.tsx`
- `components/homepage/how-it-works.tsx`
- `components/homepage/navigation.tsx`
- `components/homepage/sebastian-section.tsx`
- `components/homepage/final-cta.tsx`
- `app/about/page.tsx`
- `app/sebastian/page.tsx`

---

## 7. Plan Selector — Sebastian Tier Listing

### Issue
`components/billing/plan-selector.tsx` lists "Sebastian AI assistant access" only for Plus and Pro. It does not appear on the Free tier row, implying Sebastian is Plus/Pro exclusive.

### Fix
Update the Free tier feature list to include "Sebastian AI (limited access)" and update Plus/Pro entries to "Sebastian AI (full access)" or similar. This aligns with FR-005 and the confirmed clarification.

---

## 8. Pricing Page Auth Redirect

### Current Behavior
`app/pricing/page.tsx` is fully public — authenticated users can visit it freely.

### Required Change
Add a server-side auth check: if the requesting user is authenticated, redirect to `/settings/billing`. The public pricing page is only for unauthenticated visitors.

Implementation: Use Supabase server client in the page's server component to check session → `redirect('/settings/billing')` if session exists.
