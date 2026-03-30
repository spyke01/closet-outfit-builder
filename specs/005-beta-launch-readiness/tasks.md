# Tasks: Beta Launch Readiness

**Input**: Design documents from `/specs/005-beta-launch-readiness/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**User Stories**:
- US1 (P1): Feature Parity — Analytics dashboard + Export & Share page
- US2 (P1): Content & Pricing Consistency — About page fixes, Sebastian listing, pricing redirect
- US3 (P2): New User Walkthrough — Coach mark system, onboarding redirect
- US4 (P2): Beta Customer Discount — Promo code system, admin management, checkout changes
- US5 (P3): UI/UX Visual Consistency — Replace hardcoded hex colors in 8 files

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: TypeScript types and Zod schemas shared across multiple user stories

- [x] T001 [P] Create `lib/types/promo-code.ts` — export `PromoCode`, `CodeRedemption`, `PromoCodeValidationResult` TypeScript types matching data-model.md entities
- [x] T002 [P] Create `lib/types/analytics.ts` — export `AnalyticsDashboardResponse`, `WardrobeStats`, `EngagementStats`, `TodayStats` TypeScript types matching contracts/analytics-api.md
- [x] T003 [P] Create `lib/types/walkthrough.ts` — export `WalkthroughStep`, `WalkthroughState` TypeScript types

---

## Phase 2: Foundational (Database Migrations)

**Purpose**: Schema changes that US1, US3, and US4 depend on. Must be applied before those stories begin.

**⚠️ CRITICAL**: Apply all migrations to local Supabase before starting US1, US3, or US4 implementation

- [x] T004 Create migration `supabase/migrations/YYYYMMDD_add_today_user_saved.sql` — add `user_saved boolean NOT NULL DEFAULT false` to `today_ai_outfits` table (required by US1 analytics acceptance tracking)
- [x] T005 Create migration `supabase/migrations/YYYYMMDD_add_walkthrough_completed_at.sql` — add `walkthrough_completed_at timestamptz` to `user_preferences` table (required by US3)
- [x] T006 Create migration `supabase/migrations/YYYYMMDD_create_promotional_codes.sql` — create `promotional_codes` table with all columns, indexes, and RLS policies per data-model.md (required by US4)
- [x] T007 Create migration `supabase/migrations/YYYYMMDD_create_code_redemptions.sql` — create `code_redemptions` table with UNIQUE constraint on `(code_id, user_id)` and RLS policies per data-model.md (required by US4)
- [x] T008 Apply all migrations locally: `supabase db reset` or `supabase migration up` — confirm tables exist and RLS is active

**Checkpoint**: All migrations applied. US1, US3, US4 can now proceed.

---

## Phase 3: User Story 1 — Feature Parity: Analytics + Export & Share (Priority: P1) 🎯 MVP

**Goal**: Build a functional Analytics dashboard (wardrobe + outfit engagement stats) and a basic Export & Share page. Both include in-feature roadmap sections. Free-tier users see a blurred preview with upgrade prompt.

**Independent Test**: A Plus/Pro user can navigate to `/analytics` and see real stats. A free user sees a blurred preview with upgrade prompt. A Pro user can navigate to `/export` and export an outfit as a PNG. Both pages include a "Coming soon" roadmap section.

### Analytics — Backend

- [x] T009 [US1] Modify `lib/actions/outfits.ts` (or `lib/actions/today.ts`) — in the server action that handles "Save outfit from Today page", after calling `createOutfit()`, add: `UPDATE today_ai_outfits SET user_saved = true WHERE user_id = $uid AND entry_date = current_date` to track acceptance
- [x] T010 [US1] Create `app/api/analytics/dashboard/route.ts` — `GET` handler that:
  - Authenticates user and reads subscription tier via `lib/services/billing/entitlements.ts`
  - For Plus/Pro: queries `wardrobe_items` (total, recently added ×5, most-worn ×5 via `outfit_items` join), `outfits` (total, loved, last 10), `today_ai_outfits` (total count, `user_saved` count) for authenticated user
  - For Free tier: returns only `totalItems` and `totalOutfits`, with `tier: 'free'` flag; all other fields null
  - Returns typed `AnalyticsDashboardResponse` (see `lib/types/analytics.ts`)
- [x] T011 [US1] Create `lib/actions/analytics.ts` — `getAnalyticsDashboard()` server action that calls the dashboard API (or queries Supabase directly using server-side client) for use in the page server component

### Analytics — UI

- [x] T012 [US1] Create `app/(app)/analytics/page.tsx` — server component that:
  - Reads user tier and prefetches analytics data via `getAnalyticsDashboard()`
  - Passes data and `tier` to `<AnalyticsDashboard />` via `next/dynamic` import
  - Uses page shell: `bg-background text-foreground`
- [x] T013 [P] [US1] Create `components/analytics/analytics-dashboard.tsx` — `'use client'` component rendering:
  - `WardrobeStatsSection`: total items card + total outfits card (visible to all tiers)
  - `RecentlyAddedSection`: grid of last 5 item image thumbnails with names
  - `MostWornSection`: ranked list of top 5 most-worn items with appearance count
  - `OutfitEngagementSection`: outfits saved, loved count, outfit history list (last 10)
  - `TodayStatsSection`: acceptance rate display (e.g., "12 of 18 recommendations saved — 67%")
  - Free-tier gating: sections 2–5 render a blurred `relative` container with an absolute-positioned `bg-card/80 backdrop-blur-sm` overlay and upgrade CTA button
  - All stat cards use `bg-card border border-border rounded-lg` per constitution component recipes
- [x] T014 [US1] Create `components/analytics/analytics-coming-soon.tsx` — roadmap section rendered below all stats on the analytics page, visible to all tiers. Lists: "Style heatmap by day/occasion", "Seasonal wardrobe coverage report", "Cost-per-wear calculator", "Color palette analysis"
- [x] T015 [US1] Update `components/top-bar.tsx` — add "Analytics" nav link pointing to `/analytics`; show for all authenticated users (free users are redirected to the page which shows the preview/upgrade prompt, so the link is always visible)

### Export & Share — Backend

- [x] T016 [P] [US1] Create `app/(app)/export/page.tsx` — server component that:
  - Authenticates user and reads subscription tier
  - Fetches user's saved outfits list (id, name, score, item count) via Supabase server client
  - Passes data and `tier` to `<ExportShareClient />` via `next/dynamic`

### Export & Share — UI

- [x] T017 [US1] Create `components/export/export-share-client.tsx` — `'use client'` component:
  - Renders outfit selector (dropdown or grid) showing user's saved outfits
  - On outfit select: renders a styled outfit card preview (item images in 2-col grid, outfit name, score badge) in a hidden ref'd `div`
  - "Export as image" button: captures the ref'd `div` to PNG via `HTMLCanvasElement` drawImage sequence or `window.print()` as fallback; triggers file download as `[outfit-name].png`
  - "Share" button: calls `navigator.share({ title, url })` if supported; falls back to `navigator.clipboard.writeText(shareUrl)` with success `Alert variant="success"`
  - Entitlement gate: for Free/Plus users, "Export" and "Share" buttons are disabled with `title="Upgrade to Pro to export and share"` and show upgrade prompt instead of executing the action
  - Pro-gated actions display: when tier is `free` or `plus`, show a blurred preview card overlay with upgrade CTA (same pattern as analytics)
- [x] T018 [US1] Create `components/export/export-coming-soon.tsx` — roadmap section below the export UI: "Share to Instagram Stories", "Export full lookbook as PDF", "Generate trip packing list PDF", "Collaborate with a stylist"

**Checkpoint**: US1 complete. Analytics at `/analytics` shows real data for Plus/Pro, preview for Free. Export at `/export` works for Pro. Both pages have roadmap sections.

---

## Phase 4: User Story 2 — Content & Pricing Consistency (Priority: P1)

**Goal**: Fix all inaccurate and inconsistent content on public-facing pages. All pages describe features with identical terminology and no false claims.

**Independent Test**: A reviewer reads the About page, homepage, pricing page, and Sebastian page in sequence and forms a consistent, accurate picture of the product. The About page makes no offline capabilities claim, has no tech stack references, and mentions Sebastian with correct tier information.

### About Page Fixes

- [x] T019 [P] [US2] Edit `app/about/page.tsx` — remove the sentence "Built with modern web technologies including Next.js, React, TypeScript, and Supabase." (FR-006)
- [x] T020 [P] [US2] Edit `app/about/page.tsx` — change "Our Progressive Web App (PWA) works across all devices with offline capabilities." to "Our app installs to your home screen for quick, native-like access on any device." (FR-004)
- [x] T021 [US2] Edit `app/about/page.tsx` — replace the 4 clothing item images (`ocbd-blue.png`, `ocbd-white.png`, `sportcoat-tweed-grey.png`, `mac-coat-navy.png`) used as feature card icons with appropriate Lucide React icons (e.g., `Shield` for Personal & Secure, `Shirt` for Custom Wardrobe, `Sparkles` for Smart Recommendations, `Cloud` for Weather Integration). Use direct Lucide imports per constitution. (FR-007)
- [x] T022 [US2] Edit `app/about/page.tsx` — add a Sebastian feature card to the "Key Features" section. Content: title "Sebastian AI Stylist", description "Get instant styling advice, outfit feedback, and trip planning from your personal AI assistant. Available on all plans — upgrade for unlimited access." Use `MessageCircle` Lucide icon. (FR-005)
- [x] T023 [P] [US2] Edit `app/about/page.tsx` — replace hardcoded hex CTA button `bg-[#D49E7C] text-[#1A2830] hover:bg-[#e1b08f]` with `bg-secondary text-secondary-foreground hover:bg-secondary/90` (this file has the hex issue in the CTA button at line 108; handled here for US2 rather than US5 since it's the same file being edited)

### Plan Selector & Pricing Page

- [x] T024 [US2] Edit `components/billing/plan-selector.tsx` — update the Free tier (`Closet Starter`) `featureList` array to include a Sebastian entry such as `"Sebastian AI (limited access)"`. Update Plus and Pro entries from `"Sebastian AI assistant access"` to `"Sebastian AI (full access)"`. This aligns the plan selector with confirmed Sebastian availability for all tiers. (FR-005, FR-007)
- [x] T025 [US2] Edit `app/pricing/page.tsx` — add server-side auth check at the top of the page server component: import Supabase server client, get session; if authenticated, `redirect('/settings/billing')` (FR-009 — one upgrade flow for logged-in users)

### Homepage Alignment

- [x] T026 [P] [US2] Review `components/homepage/feature-highlights.tsx` — check if "Curated Capsules" feature is described in a way that conflicts with the pricing page feature list. If the pricing page does not list capsule wardrobe as a feature, either: (a) update the homepage copy to use terminology that matches what's in the pricing page feature lists, OR (b) add capsule wardrobe to the relevant tier's feature list. Make the descriptions consistent. (FR-007)

**Checkpoint**: US2 complete. All public pages give a consistent, accurate product picture.

---

## Phase 5: User Story 3 — New User Onboarding Walkthrough (Priority: P2)

**Goal**: New users who complete onboarding receive a 5-step coach mark tour automatically on the Wardrobe page. State persists server-side so the tour never re-triggers. Users can replay it from Settings.

**Independent Test**: Create a fresh account, complete onboarding → land on `/wardrobe` with coach marks visible. Follow all 5 steps. Log out, log back in → no coach marks. Navigate to Settings → find "Replay walkthrough" option → click → coach marks restart.

### Walkthrough — Server Actions & Hook

- [x] T027 [US3] Create `lib/actions/walkthrough.ts` — export two server actions:
  - `completeWalkthrough()`: validates session, updates `user_preferences SET walkthrough_completed_at = now() WHERE user_id = $uid`
  - `getWalkthroughCompleted()`: returns `{ completed: boolean }` by reading `user_preferences.walkthrough_completed_at` for current user
- [x] T028 [US3] Create `lib/hooks/use-walkthrough.ts` — `'use client'` hook that:
  - Accepts `{ initialCompleted: boolean }` prop (server-side prefetched value)
  - Manages `currentStep: number` state (0 = not started, 1–5 = active steps, null = dismissed/done)
  - Exposes: `currentStep`, `isActive`, `advance()`, `dismiss()` — `dismiss()` calls `completeWalkthrough()` server action
  - Respects `prefers-reduced-motion` media query (disables CSS transitions when true)

### Walkthrough — Coach Mark Component

- [x] T029 [US3] Create `components/walkthrough/walkthrough-coach.tsx` — `'use client'` component:
  - Accepts `steps: WalkthroughStep[]`, `currentStep`, `onNext`, `onDismiss` props
  - Each `WalkthroughStep` has `{ targetId: string, title: string, body: string, position: 'top' | 'bottom' | 'left' | 'right' }` — `targetId` matches a `data-walkthrough-id` attribute on the target element
  - Renders: semi-transparent full-page overlay (click-through except on tooltip), a positioned tooltip anchored to the target element via `getBoundingClientRect()` in a `useEffect`, a "Next" / "Got it" button, a "Skip tour" link, and a step progress indicator (e.g., "2 of 5")
  - Tooltip uses `bg-card border border-border rounded-lg shadow-lg` per constitution
  - Dismisses on `Escape` key (`useEffect` with `keydown` listener)
  - Portal-rendered via `createPortal(…, document.body)` so it overlays all app content
  - When `prefers-reduced-motion` is true, no fade/slide animations

### Walkthrough — Integration

- [x] T030 [US3] Edit `app/(app)/wardrobe/page.tsx` (or `wardrobe-page-client.tsx`) — add `data-walkthrough-id="wardrobe-item-first"` attribute to the first wardrobe item card rendered; add `data-walkthrough-id="wardrobe-add-button"` to the Add Item button. Prefetch walkthrough state server-side via `getWalkthroughCompleted()` and pass as prop to `<WalkthroughCoach />`. Render `<WalkthroughCoach initiallyVisible={!completed} />` conditionally.
- [x] T031 [US3] Add `data-walkthrough-id` attributes to navigation targets:
  - In `components/top-bar.tsx`: add `data-walkthrough-id="nav-outfits"` to the Outfits nav link; add `data-walkthrough-id="nav-today"` to the Today nav link
  - Confirm Sebastian floating button (wherever it's rendered) has `data-walkthrough-id="sebastian-button"`
- [x] T032 [US3] Define the 5 walkthrough steps as a constant in `components/walkthrough/walkthrough-steps.ts`:
  1. `{ targetId: 'wardrobe-item-first', title: 'Your wardrobe', body: 'These are the items you just added. Tap any item to view or edit it.' }`
  2. `{ targetId: 'wardrobe-add-button', title: 'Add more items', body: 'Grow your wardrobe by adding clothing here anytime.' }`
  3. `{ targetId: 'nav-outfits', title: 'Build outfits', body: 'Combine items into saved outfits you can wear again.' }`
  4. `{ targetId: 'nav-today', title: 'Daily recommendation', body: 'Your AI-powered outfit suggestion for today lives here.' }`
  5. `{ targetId: 'sebastian-button', title: 'Meet Sebastian', body: 'Ask Sebastian for styling advice anytime. Free users get limited access — upgrade for unlimited.' }`

### Walkthrough — Onboarding Redirect & Replay

- [x] T033 [US3] Edit `app/onboarding/page.tsx` (and/or `components/onboarding/onboarding-wizard.tsx`) — change the post-completion redirect from `router.push('/today')` to `router.push('/wardrobe')` so the walkthrough triggers on arrival. Confirm the redirect happens only after wardrobe items are successfully saved to the DB.
- [x] T034 [US3] Edit the Settings page (find the relevant settings component, likely `app/settings/page.tsx` or a settings section component) — add a "Replay app walkthrough" option (e.g., a button or link in an "App" or "Help" settings section). On click, call `completeWalkthrough()` with a null value (or create a `resetWalkthrough()` server action that sets `walkthrough_completed_at = NULL`) then `router.push('/wardrobe')`.

**Checkpoint**: US3 complete. New user walkthrough works end-to-end. Replay option available in Settings.

---

## Phase 6: User Story 4 — Beta Customer Discount (Priority: P2)

**Goal**: Admins can create shared promotional codes with a hard redemption cap. Users can enter codes in-app before checkout. Stripe handles the discount; our DB tracks redemptions after confirmed payment.

**Independent Test**: Admin creates a code "BETA50" via admin billing page. Test user enters "BETA50" on the billing settings page, sees "$2.50/mo for 3 months, then $4.99/mo" for Plus. Completes checkout. Check `code_redemptions` table — one row exists. Try the same code again → "already used" error. Stripe Dashboard shows the discount applied to the subscription.

### Promo Code — Server Actions & Stripe Integration

- [x] T035 [US4] Create `lib/actions/promo-code.ts` — export server action `validatePromoCode(code: string, plan: 'plus' | 'pro', interval: 'month' | 'year')`:
  - Validates user session; returns `{ valid: false, reason: 'yearly_not_eligible' }` if `interval === 'year'`
  - Queries `promotional_codes` where `code = $code AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()) AND current_redemptions < max_redemptions`
  - Checks `code_redemptions` for existing row with `(code_id, user_id)` — returns `{ valid: false, reason: 'already_used' }` if found
  - Returns `{ valid: true, discountPercent, durationMonths, fullPriceCents, discountedPriceCents, promoCodeDbId: string }` on success (never returns Stripe coupon ID directly)
  - Input validated with Zod: `code` is non-empty string, `plan` is enum, `interval` is enum
- [x] T036 [US4] Modify `lib/services/billing/stripe.ts` — in `createStripeCheckoutSession()`:
  - Remove `payload.append('allow_promotion_codes', 'true')`
  - Add optional `stripeCouponId?: string` parameter to the function signature
  - When `stripeCouponId` is present, add `payload.append('discounts[0][coupon]', stripeCouponId)` to the checkout session payload
- [x] T037 [US4] Modify `app/api/billing/checkout/route.ts` — extend the POST handler:
  - Accept optional `promotionCodeId: string` in request body (Zod-validated as UUID)
  - If present: look up `promotional_codes` by `id = promotionCodeId` using service role client, re-validate (active, not expired, not exhausted)
  - Re-check `code_redemptions` for this user (security re-check — never trust client)
  - Pass `stripe_coupon_id` from the DB record to `createStripeCheckoutSession()` as `stripeCouponId`
  - If validation fails on re-check: return 400 with appropriate error message

### Promo Code — Webhook Redemption Counting

- [x] T038 [US4] Modify `app/api/stripe/webhook/route.ts` — in the `checkout.session.completed` handler, after the existing subscription sync logic:
  - Check if `session.discounts` array has entries and `session.discounts[0]?.coupon?.id` is set
  - Look up `promotional_codes` where `stripe_coupon_id = coupon_id` using service role client
  - If found: within a single DB transaction (or two sequential service-role operations with idempotency):
    1. `INSERT INTO code_redemptions (code_id, user_id, stripe_subscription_id)` — catch UNIQUE constraint violations and treat as idempotent success
    2. `UPDATE promotional_codes SET current_redemptions = current_redemptions + 1 WHERE id = code_id` — only when the insert succeeds (not on duplicate)
  - Log any errors but do not re-throw (don't fail the webhook for redemption tracking errors; subscription is already updated)

### Promo Code — Admin API

- [x] T039 [US4] Create `app/api/admin/billing/promo-codes/route.ts`:
  - `GET`: requires billing admin role; queries all rows from `promotional_codes` with `current_redemptions` and computed `isActive` boolean; returns typed list per `contracts/promo-code-api.md`
  - `POST`: requires billing admin role; validates request body with Zod (code: alphanumeric 4–20 chars, discountPercent: 1–99, durationMonths: 1–12, maxRedemptions: 1–10000, expiresAt: optional ISO date); creates Stripe coupon via `stripe.coupons.create()` with `percent_off`, `duration: 'repeating'`, `duration_in_months`; inserts row into `promotional_codes`; returns created record
- [x] T040 [US4] Create `app/api/admin/billing/promo-codes/[id]/route.ts`:
  - `DELETE`: requires billing admin role; validates `id` as UUID; sets `promotional_codes.revoked_at = now()` for the given ID; returns `{ success: true }`

### Promo Code — Billing UI

- [x] T041 [US4] Create `components/billing/promo-code-input.tsx` — `'use client'` component:
  - Text input (placeholder "Enter promo code") + "Apply" button
  - On submit: calls `validatePromoCode()` server action with current plan and interval selection
  - On success: shows `Alert variant="success"` with discounted price preview (e.g., "$2.50/mo for 3 months, then $4.99/mo") and stores `promoCodeDbId` in component state
  - On error: shows `Alert variant="destructive"` with human-readable reason (map reason codes to messages: 'already_used' → "This code has already been used on your account.", 'exhausted' → "This code is no longer available.", 'expired' → "This code has expired.", 'not_found' → "Invalid promo code.", 'yearly_not_eligible' → "Promo codes apply to monthly plans only.")
  - Exposes `promoCodeDbId: string | null` via callback `onValidated(id: string | null)`
- [x] T042 [US4] Edit `app/settings/billing/billing-page-client.tsx` — integrate `<PromoCodeInput />`:
  - Render it above the "Upgrade" / checkout button in the plan selector area (only show for free-tier users who are selecting a paid plan)
  - When `onValidated` fires with a non-null ID: pass `promotionCodeId` to the checkout initiation call (`POST /api/billing/checkout`)
  - Show plan-switch discount warning: if user currently has an active beta discount and selects a different plan tier, show `Alert variant="warning"` explaining the remaining discounted months will be forfeited

### Promo Code — Admin UI

- [x] T043 [US4] Edit `app/admin/billing/page-client.tsx` — add a "Promotional Codes" tab alongside the existing user search tab:
  - Tab content: `<PromoCodeCreateForm />` (inputs for code, discountPercent, durationMonths, maxRedemptions, expiresAt) that calls `POST /api/admin/billing/promo-codes`
  - Below form: `<PromoCodeList />` table showing code, discount%, uses/cap, expires, active/revoked status, "Revoke" button (calls `DELETE /api/admin/billing/promo-codes/[id]`)
  - Use existing admin UI patterns (same card components, table styles, button variants already in the admin billing page)
  - Show success/error alerts using `Alert` component with appropriate variants per CLAUDE.md alert standard

**Checkpoint**: US4 complete. Full promo code lifecycle works: admin creates → user validates in-app → Stripe discounts checkout → webhook counts redemption.

---

## Phase 7: User Story 5 — UI/UX Visual Consistency (Priority: P3)

> Historical note: the implementation notes below describe the earlier semantic-token migration pass. The current visual source of truth is the Apple Liquid Glass system in `app/globals.css` and the updated repo guidance docs, not the older `bg-card` / `bg-background` migration language in this task list.

**Goal**: All 8 files with hardcoded hex color values are updated to use semantic CSS variable classes from the design system. All pages render correctly in dark mode.

**Independent Test**: A reviewer inspects all updated files and finds no hardcoded hex values (`#...` or `[#...]`). All pages render in dark mode with no elements that appear with hardcoded light-mode colors.

- [x] T044 [P] [US5] Edit `components/homepage/hero-section.tsx` — replace all hardcoded hex Tailwind classes:
  - `bg-[#294653]` → `bg-primary`
  - `border-[#3b6270]` → `border-border`
  - `text-[#E8F0F2]` → `text-foreground`
  - `bg-[#D49E7C]` → `bg-secondary`
  - `hover:bg-[#e1b08f]` → `hover:bg-secondary/90`
  - `text-[#1A2830]` → `text-primary-foreground`
  - `bg-[#23414d]` → `bg-card`
  - `border-[#2f5664]` → `border-border`
  - `hover:bg-[#2b4b57]` → `hover:bg-card/80`
- [x] T045 [P] [US5] Edit `components/homepage/navigation.tsx` — replace all hardcoded hex Tailwind classes (same mapping as T044; this file uses `bg-[#D49E7C] text-[#1A2830] hover:bg-[#e1b08f]` on CTA buttons)
- [x] T046 [P] [US5] Edit `components/homepage/sebastian-section.tsx` — replace all hardcoded hex classes (same mapping pattern; uses `bg-[#D49E7C]/25`, `bg-[#D49E7C]`, `text-[#1A2830]`, `hover:bg-[#e1b08f]`)
- [x] T047 [P] [US5] Edit `components/homepage/final-cta.tsx` — replace hardcoded hex CTA button classes (same mapping)
- [x] T048 [P] [US5] Edit `components/homepage/app-demo.tsx` — replace all hardcoded hex classes (multiple section backgrounds and CTA; same mapping as T044 plus any additional patterns found in this file)
- [x] T049 [P] [US5] Edit `components/homepage/how-it-works.tsx` — replace all hardcoded hex classes (this file also has `bg-[#1e3641]`, `border-[#2b4f5d]`, `bg-[#2d5563]`, `border-[#4f8092]`, `text-[#EAF4F7]` — map to `bg-card`, `border-border`, `bg-primary/80`, `border-primary`, `text-foreground` as appropriate)
- [x] T050 [P] [US5] Edit `app/sebastian/page.tsx` — replace hardcoded hex CTA button classes (`bg-[#D49E7C] text-[#1A2830] hover:bg-[#e1b08f]`) with `bg-secondary text-secondary-foreground hover:bg-secondary/90`
- [x] T051 [US5] Visually verify all 8 updated files in dark mode via `npm run dev` — toggle dark mode in the app and confirm: no elements appear with hardcoded light-mode background colors, no text becomes illegible, no borders disappear against dark backgrounds. Note: T023 already handled `app/about/page.tsx` in Phase 4.

**Checkpoint**: US5 complete. All marketing and public pages use semantic CSS variable classes throughout.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T052 [P] Run `npm run lint` — resolve all ESLint errors and warnings introduced by new files (no new warnings should be added)
- [x] T053 [P] Run `npm run typecheck` — resolve all TypeScript errors (strict mode; no `any` types in new code)
- [x] T054 [P] Run `npm run test:run` — confirm all existing tests pass; fix any regressions caused by modified files (especially `today.ts` server action and `stripe.ts` changes)
- [x] T055 Write Vitest unit tests for `validatePromoCode()` server action in `lib/actions/__tests__/promo-code.test.ts` — cover: valid code, already-used code, exhausted cap, expired code, yearly interval rejection, re-validation after checkout mock
- [x] T056 Write Vitest unit tests for `useWalkthrough.ts` in `lib/hooks/__tests__/use-walkthrough.test.ts` — cover: initial state (not started), advance through steps, dismiss mid-tour, completed state does not retrigger
- [ ] T057 Run accessibility validation: `npm run test:a11y` or equivalent Axe checks — new coach mark tooltips must have `aria-label`, interactive buttons must be keyboard reachable, overlay must trap focus while active. New analytics and export pages must pass WCAG 2.1 AA
- [ ] T058 Check bundle size impact: `npm run build` — confirm First Load JS stays under 200KB; if `analytics-dashboard.tsx` or `export-share-client.tsx` push a chunk over 100KB, add `next/dynamic` with `ssr: false` and a skeleton loading fallback
- [ ] T059 Validate the full quickstart.md walkthrough manually: create fresh test account → onboard → confirm `/wardrobe` redirect → follow walkthrough → confirm DB state → log out/in → confirm no retrigger → create test promo code via admin → apply at billing → confirm Stripe test mode discount → confirm `code_redemptions` row exists → navigate to `/analytics` → confirm data → navigate to `/export` → export outfit as PNG

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Types)      — No dependencies. Start immediately.
Phase 2 (Migrations) — No dependencies. Start immediately in parallel with Phase 1.
Phase 3 (US1)        — Requires T004 (today_user_saved migration). Phases 1+2 must complete first.
Phase 4 (US2)        — No migration dependencies. Can start after Phase 1.
Phase 5 (US3)        — Requires T005 (walkthrough_completed_at migration). Phases 1+2 must complete first.
Phase 6 (US4)        — Requires T006+T007 (promo code migrations). Phases 1+2 must complete first.
Phase 7 (US5)        — No dependencies. Can start after Phase 1 (types not needed for hex replacement).
Phase 8 (Polish)     — Depends on all story phases being substantially complete.
```

### User Story Dependencies

- **US1 (P1)**: Depends on T004 only. No cross-story dependencies.
- **US2 (P1)**: No migration dependencies. Independent of all other stories.
- **US3 (P2)**: Depends on T005. No cross-story dependencies.
- **US4 (P2)**: Depends on T006+T007. No cross-story dependencies.
- **US5 (P3)**: Fully independent. No migration or cross-story dependencies.

### Critical Path (Sequential)

```
T001–T003 (types)
    └─► T004–T008 (migrations applied)
            ├─► T009–T015 (US1 analytics backend + UI)
            ├─► T016–T018 (US1 export backend + UI)
            ├─► T027–T034 (US3 walkthrough)
            └─► T035–T043 (US4 promo code system)

T019–T026 (US2 content) — can run in parallel with all of the above

T044–T051 (US5 hex colors) — can run in parallel with all of the above
```

---

## Parallel Opportunities

**Phase 1–2**: T001, T002, T003, T004, T005, T006, T007 — all parallel (different files)

**Phase 3 (US1)**:
- T009 (today save tracking) and T010 (analytics API) — parallel
- T012 (analytics page) and T016 (export page) — parallel after T010/T011 complete
- T013 (analytics dashboard component) and T017 (export share component) — parallel

**Phase 4 (US2)**: T019, T020, T023, T026 — parallel (different sections of about page after understanding scope)

**Phase 5 (US3)**: T027 (server actions) and T028 (hook) — parallel

**Phase 7 (US5)**: T044, T045, T046, T047, T048, T049, T050 — all parallel (different files)

**Phase 8 (Polish)**: T052, T053, T054, T057 — parallel

---

## Implementation Strategy

### MVP First (US1 + US2)
Both P1 stories can be validated and deployed together as an MVP:
1. Complete Phases 1–2 (setup + migrations)
2. Complete Phase 3 (US1 — analytics + export)
3. Complete Phase 4 (US2 — content fixes)
4. **STOP and VALIDATE**: Feature parity confirmed, content accurate → beta-ready for core trust issues

### Incremental Delivery
1. Phases 1–2 → foundation ready
2. Phase 3+4 (US1+US2) → feature parity + content accuracy → deploy (MVP)
3. Phase 6 (US4) → promo codes → deploy before beta invites go out
4. Phase 5 (US3) → walkthrough → deploy for first-user onboarding
5. Phase 7 (US5) → visual polish → deploy as final pre-launch pass
6. Phase 8 → polish, tests, bundle check → merge to main

### Parallel Team Strategy
- Developer A: Phases 3+5 (US1 analytics/export + US3 walkthrough — both need migration dependencies)
- Developer B: Phases 4+7 (US2 content fixes + US5 hex colors — no migration dependencies, start immediately)
- Developer C: Phase 6 (US4 promo code system — most complex, benefits from focused attention)
- All three converge on Phase 8 (polish)

---

## Notes

- `[P]` tasks operate on different files with no shared state — safe to parallelize
- `[USN]` label maps each task to a specific user story for traceability
- Every new server action must follow validate-authenticate-authorize-execute (constitution III)
- No `any` types; use `unknown` + Zod at all data boundaries (constitution I)
- No hardcoded hex colors in new components; use semantic CSS variable classes (constitution Theming)
- No third-party walkthrough library; no barrel imports for Lucide (constitution IV + Bundle)
- Commit after each task or logical group to enable easy rollback
- Stop at each **Checkpoint** to validate the user story independently before continuing
