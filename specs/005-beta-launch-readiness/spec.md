# Feature Specification: Beta Launch Readiness

> Historical note: this spec records the beta-launch cleanup scope at the time it was written. Current UI steering has since moved to the Apple Liquid Glass design system defined in `app/globals.css` and repo guidance docs such as `CLAUDE.md`. Where this spec references older palette/font/theming guidance, treat those references as historical context rather than the current source of truth.

**Feature Branch**: `005-beta-launch-readiness`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "We are preparing to launch this site to a set of beta customers. I want to review the site for any features that we are promising, ensure that they are implemented, look for inconsistent feature descriptions or pricing, and identify any points of potential confusion for users. I also want to review the site's UI/UX to truly polish the experience, we should have consistent color, branding, typography, and iconography across the site. We should also think through ways to allow beta customers a discount on their upgrades such as an amount of money off their first 3 months. We should also think through the user journey of a brand new customer and what potential pitfalls they might run into. We might want to consider a walkthrough where we point out where they can find certain things or where to start."

## Clarifications

### Session 2026-03-09 (continued)

- Q: For unimplemented priced features (Sebastian, Analytics, Export & Share) — build before launch or defer? → A: Sebastian is already implemented as a floating chat button accessible to all users, with an upsell for free-tier users; it also powers AI outfit generation. Analytics and Export & Share are not yet built and will be labeled "coming soon" on the pricing page.
- Q: Where does the promotional code entry field appear — in-app before Stripe redirect, or inside Stripe's hosted checkout page? → A: In-app on the billing/plan-selector page; the user enters the code, sees the discounted price preview, then proceeds to Stripe for payment.
- Q: Where does the walkthrough start after onboarding completes, and in what order does it cover the app? → A: Starts on the Wardrobe page (anchoring on the items just created in onboarding), then guides to outfit building, then to the Today page for daily recommendations.
- Q: Where are promotional codes created and managed — new admin UI, existing admin billing page, or directly via the payment processor? → A: Added to the existing admin billing page; no new admin routes required.
- Q: Are promo codes single-use per account only, or shared across multiple beta users with a redemption cap? → A: Codes are shared across the beta group (multiple users can use the same code), but each code has a configurable hard cap on total redemptions (e.g., 30 uses max) to prevent unintended viral spread. Each account may only redeem a given code once. A redemption is only counted upon confirmed successful payment — abandoned checkouts do not consume a use.
- Q: Is Sebastian a Plus/Pro exclusive feature or available to all users with tier-based access levels? → A: Sebastian is available to all users; free-tier users can access it but encounter an upsell prompt for usage limits, while Plus and Pro subscribers have full unrestricted access. All marketing copy should reflect this tiered-access model rather than describing Sebastian as paid-only.
- Q: Does the promotional code field appear in both the public pricing page upgrade flow and the in-app billing/settings upgrade flow? → A: Only in the in-app billing/settings page. Authenticated users who navigate to the public /pricing page are redirected to the billing page, so there is effectively one upgrade flow for logged-in users.
- Q: When a user with an active beta discount switches from Plus to Pro mid-discount period, does the remaining discount carry over to the new plan? → A: No — the discount does not carry over. The user is informed at the point of switching that the beta discount applies to their original purchase only; switching plans forfeits any remaining discounted months.
- Q: How should unimplemented priced features (Analytics, Export & Share) be handled at beta launch — label coming soon, or build a basic version? → A: Build a basic implementation of each feature before launch. Each feature page should include an in-feature "coming soon" section that shows planned future expansion. Free-tier users get either a stripped-down version or a visual preview of what the feature looks like to set expectations and drive upgrade intent.
- Q: What data does the basic Analytics implementation show? → A: A combined wardrobe + outfit engagement dashboard: wardrobe stats (items in wardrobe, outfits created, most-worn items, recently added items) and outfit engagement stats (outfits saved, outfit history, how many times Today's recommendation was accepted vs. skipped).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Feature Parity Enforcement (Priority: P1)

A prospective customer visits the pricing page and sees that Plus and Pro plans include "Basic analytics" and "Export and share." When they upgrade and look for these features in the app, they cannot find them — there is no analytics section and no export functionality is available. This creates a trust-breaking experience and potential refund requests on day one of beta launch.

Sebastian AI is confirmed to be implemented as a floating chat button accessible within the app; it also powers AI outfit generation. The remaining unimplemented priced features — Analytics and Export & Share — will be built at a basic level before beta launch rather than labeled as unavailable. Each feature will include an in-feature "coming soon" section that sets expectations for future expansion.

The site must only advertise and charge for features that are at least partially available in the app. Features listed in pricing tiers must be accessible at a meaningful basic level, with a clear roadmap section showing what is coming next.

**Why this priority**: Advertising features that don't exist is the highest-risk issue for a beta launch. It damages trust, increases churn, and may create legal/consumer protection exposure.

**Independent Test**: Audit each feature listed in each pricing tier against a working app session. Every line item must be reachable and functional, or it must be removed from the pricing page.

**Acceptance Scenarios**:

1. **Given** Sebastian AI assistant is implemented as a floating chat button, **When** any authenticated user views the app, **Then** the Sebastian button is visible, and free-tier users see an upsell prompt while Plus and Pro subscribers can use it without restriction.
2. **Given** the pricing page lists "Basic analytics" for Plus and "Advanced analytics" for Pro, **When** a subscriber navigates to the Analytics section in the app, **Then** a combined wardrobe and outfit engagement dashboard is accessible showing: wardrobe stats (total items, outfits created, most-worn items, recently added), outfit engagement stats (outfits saved, outfit history, Today recommendation accepted vs. skipped count), and an in-feature section describing upcoming analytics capabilities.
3. **Given** the pricing page lists "Export and share" for Pro, **When** a Pro subscriber navigates to the Export & Share section, **Then** a basic export or sharing action is available, with an in-feature section describing future export formats and sharing options.
4. **Given** any feature is listed in a pricing tier, **When** a paying subscriber of that tier is using the app, **Then** they can access at least a basic version of that feature without hitting a dead end or error state.
5. **Given** a feature has an in-feature "coming soon" expansion section, **When** a user reads it, **Then** the section clearly distinguishes what is available today from what is planned, without implying current capabilities that do not exist.
6. **Given** Analytics or Export & Share is accessed by a free-tier user, **When** they view the feature, **Then** they see either a stripped-down version of the feature or a visual preview showing what the full feature looks like, with a clear prompt to upgrade.

---

### User Story 2 - Content and Pricing Consistency (Priority: P1)

A user reads the marketing homepage, then visits the About page, then visits the Pricing page. Across these three pages, features are described differently, some features mentioned on the homepage are not mentioned on the About page, and the About page makes a claim about offline capabilities that is not reflected in the actual product experience. The user is confused about what the product actually does.

All public-facing pages must describe features consistently, use the same terminology, and avoid making product claims that are not accurate.

**Why this priority**: Inconsistent or inaccurate marketing content undermines credibility with beta customers who are evaluating whether to pay. Fixing content is low-effort and high-impact.

**Independent Test**: A reviewer unfamiliar with the codebase reads the homepage, About page, and Pricing page in sequence and produces the same mental model of what the product does and includes.

**Acceptance Scenarios**:

1. **Given** the About page currently states the app offers "offline capabilities," **When** the page is reviewed, **Then** this claim is either substantiated by real offline functionality or removed from the page.
2. **Given** Sebastian is a named, marketed feature on the homepage and Sebastian page, **When** the About page "Key Features" section is read, **Then** Sebastian is mentioned as a feature available on applicable plans.
3. **Given** the homepage highlights "Curated Capsules" as a core feature, **When** the Pricing page is read, **Then** capsule wardrobe functionality is either visible in the feature lists or the homepage messaging is updated to align with what the product actually delivers.
4. **Given** the About page currently uses clothing item images as icons for feature cards, **When** the page is reviewed, **Then** the icons or illustrations communicate the feature being described rather than displaying generic wardrobe items.
5. **Given** the About page currently mentions specific technical frameworks in customer-facing copy, **When** the page is reviewed for a business audience, **Then** the Technology section either targets non-technical readers or is removed entirely.
6. **Given** the yearly savings percentage is advertised on each paid plan, **When** the math is verified against listed monthly and yearly prices, **Then** all savings percentages are arithmetically correct.

---

### User Story 3 - New User Onboarding Walkthrough (Priority: P2)

A brand new customer signs up, completes the 6-step onboarding wizard to set up their wardrobe, and then lands in the app. They are not sure what to do next: the Today page shows an outfit but they don't know how to save it, they don't know where to find the calendar, they don't know how to add individual items, and they don't know Sebastian exists. Within the first session, they feel lost and disengage.

After completing onboarding, new users should receive a brief, non-intrusive guided tour that highlights the key areas of the app and gives them a clear starting point for their first action.

**Why this priority**: First-session engagement is a critical predictor of long-term retention. A walkthrough prevents confusion and sets users up for success before beta feedback is collected.

**Independent Test**: A new user who has never seen the app can complete onboarding and, with only the walkthrough as guidance, successfully generate and save their first outfit within 5 minutes.

**Acceptance Scenarios**:

1. **Given** a user completes the onboarding wizard for the first time, **When** they arrive at the Wardrobe page, **Then** a walkthrough or coach mark sequence is triggered automatically, starting by pointing out the wardrobe items they just created.
2. **Given** the walkthrough is active, **When** the user follows it, **Then** it guides them in this order: (a) Wardrobe — the items they just added and how to manage them, (b) Outfit building — where to create and save outfits from their wardrobe, (c) Today page — where their daily AI-powered outfit recommendation appears.
3. **Given** the walkthrough is active, **When** the user wants to skip it, **Then** they can dismiss it at any point without losing their place in the app.
4. **Given** a user dismissed or completed the walkthrough previously, **When** they log in again, **Then** the walkthrough does not re-trigger automatically.
5. **Given** a user dismissed the walkthrough, **When** they navigate to Settings or Help, **Then** there is an option to replay the walkthrough.
6. **Given** any new user completes onboarding, **When** the walkthrough runs, **Then** it points out where Sebastian can be accessed, with free-tier users shown context about usage limits and how to unlock full access.

---

### User Story 4 - Beta Customer Discount (Priority: P2)

A beta customer who signed up early is on the free plan and wants to upgrade to Plus or Pro. As a reward for being an early adopter and providing feedback, the product team wants to offer them a meaningful discount on their first few months. Currently there is no mechanism to offer this — all users pay full price immediately.

Beta customers should be able to apply a discount that reduces their cost for their first 3 months when upgrading to a paid plan.

**Why this priority**: A beta discount is a key conversion incentive and goodwill gesture for early adopters. It also makes it lower-risk for beta users to try paid features and provide feedback.

**Independent Test**: A test beta user can enter a promotional code during checkout and have their first 3 months billed at the discounted rate, with their 4th month billed at full price automatically.

**Acceptance Scenarios**:

1. **Given** a user is on the free plan and navigates to the in-app billing page (or is redirected there from the public `/pricing` page), **When** they select a paid plan to upgrade, **Then** there is a field or mechanism to enter a promotional code before completing checkout.
2. **Given** a valid beta promotional code is entered, **When** the user proceeds to checkout, **Then** the discounted price for the first 3 months is clearly shown before the user confirms payment.
3. **Given** a valid beta promotional code is applied and the discount is 50% off the monthly price for the first 3 months, **When** the code is applied, **Then** the checkout summary shows the discounted monthly price (e.g., $2.50/month for Plus, $5.00/month for Pro) applied to the first 3 billing cycles before reverting to full price.
4. **Given** a promotional code has already been used by a user, **When** they attempt to apply it again, **Then** they see a clear message that the code has already been used on their account.
5. **Given** a promotional code is expired or invalid, **When** a user enters it, **Then** they see a helpful message explaining the code is not valid.
6. **Given** a user used a 3-month discount code, **When** month 4 arrives, **Then** their subscription automatically renews at the standard full price without any action required from the user.
7. **Given** a beta user cancels during the discounted period and later resubscribes, **When** they attempt to apply the same code, **Then** the discount does not reapply (one-time use per account).

---

### User Story 5 - UI/UX Visual Consistency (Priority: P3)

A beta customer uses the app across multiple pages — the public site, the pricing page, and the authenticated app. They notice that button colors vary unexpectedly between pages, that some pages use serif headings and others do not, and that icons feel visually inconsistent (some filled, some outlined, different sizes). The experience feels unpolished and raises doubts about the quality of the product.

All pages, both marketing and in-app, must present a consistent visual identity: colors must follow the established brand palette, typography must use the correct font hierarchy, and icons must be visually coherent in style and weight.

**Why this priority**: Visual consistency is a proxy for quality and trustworthiness. Inconsistencies visible in the first session erode confidence in a paid product, but this can be addressed in a focused audit pass.

**Independent Test**: A reviewer unfamiliar with the codebase visits each page and cannot identify any button using an off-brand color, any heading in the wrong font, or any icon visually inconsistent with its neighbors.

**Acceptance Scenarios**:

1. **Given** the brand has a defined primary CTA color, **When** any page with a primary call-to-action button is viewed, **Then** all primary CTA buttons display the same brand color with no visual discrepancies between pages.
2. **Given** Playfair Display is the display/heading font and Inter is the body font, **When** any page is reviewed, **Then** all headings use the display font and all body text uses the body font, with no unintended mixing.
3. **Given** icons are used throughout the app to represent features and actions, **When** a page is reviewed, **Then** all icons on that page are from the same icon family, at consistent visual weight, and sized consistently relative to their context.
4. **Given** the dark mode is active, **When** any public or app page is viewed, **Then** all elements adapt correctly to the dark theme with no readability or contrast issues.
5. **Given** the app has a defined set of status/feedback alert styles, **When** any feedback message is shown to the user, **Then** it uses the standard alert component and variant rather than plain text or ad-hoc styled elements.

---

### Edge Cases

- If a beta user applies a discount code but abandons checkout before payment is confirmed, the code is not consumed — the user can return and apply the same code again on a future attempt, and it does not count against the redemption cap.
- Authenticated users who navigate to the public `/pricing` page are redirected to the in-app billing page; there is therefore only one upgrade flow for logged-in users, and the promotional code field appears in that single flow.
- What if the walkthrough is triggered on a small mobile screen where coach marks may be obscured by the viewport or soft keyboard?
- What if a returning user clears their browser data — does the "walkthrough already seen" state persist server-side so it does not re-trigger?
- Analytics and Export & Share will have basic implementations at beta launch, so paying subscribers will always have access to at least a functional baseline. The in-feature "coming soon" section communicates what is being expanded next.
- If a user switches plan tiers during the active discount period, the discount is forfeited — they pay full price on the new plan from the switch date. A warning is shown before confirming the switch.

## Requirements *(mandatory)*

### Functional Requirements

**Feature Parity**

- **FR-001**: All features listed in any paid pricing tier MUST be accessible at a meaningful basic level for subscribers of that tier within the authenticated app; no feature may be listed without at least a functional baseline implementation.
- **FR-002**: Each feature with a basic implementation MUST include an in-feature "coming soon" section that clearly describes planned future expansion, distinguishing what is available today from what is on the roadmap.
- **FR-002a**: The basic Analytics dashboard MUST display a combined wardrobe and outfit engagement view including: total wardrobe items, total outfits created, most-worn items, recently added items, outfits saved, outfit history, and a count of how many times the Today page recommendation was accepted versus skipped.
- **FR-003**: Free-tier users who encounter a feature restricted to paid tiers MUST see either a stripped-down version of that feature or a visual preview showing what the full feature looks like, alongside a clear upgrade prompt.

**Content Consistency**

- **FR-004**: The About page MUST NOT claim offline capabilities unless genuine offline content access is available to users without an internet connection.
- **FR-005**: The About page MUST describe Sebastian as available to all users, noting that free-tier users have access with usage limits while Plus and Pro subscribers have full unrestricted access — Sebastian MUST NOT be described as a paid-only feature.
- **FR-006**: The About page MUST NOT reference specific technical frameworks or libraries in customer-facing copy.
- **FR-007**: Feature names and descriptions MUST use identical terminology across the homepage, About page, Pricing page, and Sebastian page.
- **FR-008**: All advertised discount percentages MUST be arithmetically accurate relative to listed monthly and yearly prices.

**Beta Discount**

- **FR-009**: The in-app billing and plan-selector page MUST include a promotional code entry field that is visible and usable before the user is redirected to the external payment processor to complete checkout. Authenticated users who navigate to the public `/pricing` page MUST be redirected to the in-app billing page, ensuring all upgrade interactions go through a single flow.
- **FR-010**: Valid promotional codes MUST display the discounted price clearly before the user confirms the upgrade.
- **FR-011**: A promotional code MUST be redeemable only once per user account; a user who has already used a code MUST NOT be able to apply it again.
- **FR-011b**: Each promotional code MUST have a configurable hard cap on total redemptions across all users (e.g., 30 uses); once the cap is reached, the code MUST be rejected as invalid for any further users.
- **FR-011c**: A redemption MUST only be counted upon confirmed successful payment; abandoned or failed checkouts MUST NOT decrement the remaining redemption count.
- **FR-012**: After the promotional discount period ends, the subscription MUST automatically revert to the full standard price without requiring user action.
- **FR-012b**: If a user with an active beta discount switches to a different plan tier before the discount period ends, the discount MUST NOT carry over to the new plan. The user MUST be shown a clear warning before confirming the plan switch that their remaining discounted months will be forfeited.
- **FR-013**: Promotional code creation and management (create, list, revoke) MUST be accessible to administrators from the existing admin billing page, without requiring any new admin routes or separate admin interfaces. When creating a code, administrators MUST be able to set the maximum redemption limit.

**New User Walkthrough**

- **FR-014**: First-time users who complete onboarding MUST be shown a guided walkthrough automatically when they land on the Wardrobe page after completing the wizard.
- **FR-015**: The walkthrough MUST follow this order: (1) Wardrobe — introduce the items just created and how to manage them; (2) Outfit building — show where users create and save outfits; (3) Today page — show where the daily AI outfit recommendation appears.
- **FR-016**: The walkthrough MUST point out where Sebastian can be accessed for all new users; free-tier users MUST be shown context about their access limits and how upgrading unlocks full Sebastian functionality.
- **FR-017**: Users MUST be able to dismiss the walkthrough at any step without losing app access or being forced to restart.
- **FR-018**: The walkthrough seen/completed state MUST persist per user account so it does not re-trigger on subsequent logins.
- **FR-019**: Users MUST be able to replay the walkthrough from Settings or Help at any time after dismissing or completing it.

**UI/UX Consistency**

- **FR-020**: All primary CTA buttons across marketing and app pages MUST use the brand's designated primary color from the shared design system — no page-specific hard-coded color overrides.
- **FR-021**: All feedback messages shown to users (success, error, warning, info) MUST use the standard Alert component with the appropriate variant.
- **FR-022**: All icons within a page or section MUST be from the same icon family and consistent in visual weight and sizing convention.
- **FR-023**: All heading text MUST use the designated display font and body text MUST use the designated body font, with no unintentional font mixing.
- **FR-024**: All pages MUST render correctly in both light and dark mode with no elements that ignore the active theme.

### Key Entities

- **Promotional Code**: A shared redeemable code usable by multiple beta users; attributes include discount value (50% for beta), discount type (percentage), duration in months (3), maximum redemption count (admin-configured, e.g., 30), current redemption count, and expiry date. A code is considered exhausted when current redemptions reach the maximum.
- **Code Redemption**: A record linking a specific user account to a successful use of a promotional code; captures the date of confirmed payment and the subscription it was applied to. Used to enforce both the per-account limit (one redemption per user per code) and to accurately track the total redemption count against the cap.
- **Walkthrough State**: A per-user record indicating whether the onboarding walkthrough has been seen or completed; stored against the user account so the state persists across devices and browser sessions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of features listed in any paid pricing tier are accessible at a meaningful basic level in the app before beta launch; zero advertised features are entirely missing or produce an error/dead-end state when accessed.
- **SC-002**: All public-facing pages (homepage, About, Pricing, Sebastian) use identical names and descriptions for every product feature with no naming inconsistencies across pages.
- **SC-003**: Beta customers who apply a valid promotional code complete the checkout process at a rate of 80% or higher, indicating the discount flow is clear and low-friction.
- **SC-004**: New users who receive the walkthrough successfully generate and save their first outfit within 5 minutes of finishing onboarding.
- **SC-005**: At least 70% of new users who see the walkthrough complete it without dismissing it, indicating it is perceived as helpful.
- **SC-006**: A visual audit of all pages by a reviewer unfamiliar with the codebase surfaces zero instances of off-brand button colors, incorrect fonts, or inconsistent icon styles.
- **SC-007**: All pages are reviewed in dark mode with zero identified elements where the theme is overridden by hard-coded colors.
- **SC-008**: Beta feedback submissions related to "can't find feature" or "feature not working as described" account for fewer than 10% of total feedback received in the first two weeks.

## Assumptions

- Sebastian AI assistant is confirmed as implemented: it appears as a floating chat button in the authenticated app, is gated with an upsell for free-tier users, and also powers the AI outfit generation feature. No build work is required for Sebastian.
- Analytics and Export & Share are the only currently unimplemented features listed in paid pricing tiers. Both will be built to a basic functional level before beta launch. Each will include an in-feature roadmap section showing planned expansion. Free-tier users will receive either a stripped-down version or a visual preview with an upgrade prompt.
- The beta discount will be distributed as a shared promotional code across the beta group (multiple users can use the same code). Abuse protection relies on two controls: a per-account redemption limit (one use per user) and a hard total redemption cap set by the admin at code creation time (e.g., 30 uses). This prevents accidental viral spread without requiring individual code generation per user.
- The walkthrough will be a lightweight coach mark or tooltip sequence rather than a full-screen modal tour, keeping it dismissible and non-blocking.
- The About page "offline capabilities" claim refers to PWA install-to-home-screen behavior, which is supported; however, the app does not currently cache content for use without internet, so this claim should be rewritten to accurately describe installability only.
- The walkthrough should not block app use — it must be fully dismissible and non-modal to avoid frustrating users who want to explore independently.
- Beta discount is 50% off the monthly price for the first 3 billing cycles (e.g., Plus: $2.50/month for 3 months then $4.99/month; Pro: $5.00/month for 3 months then $9.99/month). This discount applies to monthly billing only; yearly billing is excluded from the beta discount to keep the offer simple.
