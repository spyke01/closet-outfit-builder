# Mobile layout and membership access

Free analytics now changes with each tab. Overview shows wardrobe totals and recent wear counts; Clothing shows a few actual pieces and category totals; Wear history shows the latest three confirmed outfits from 30 days; Cost per wear shows price coverage and a clearly labelled example. A compact prompt explains the relevant paid benefit and opens details before the plan comparison. It does not obscure the basic preview.

Locked daily occasions, an exhausted AI outfit trial, Sebastian, and custom clothing images now explain the requested action, the Plus/Pro benefit, and the next step. Locked occasion cards remain readable and clickable. Membership lookup failures offer a retry instead of an upgrade prompt. Paid analytics retains its full filters and history.

The weather popup uses aligned daily rows, rain chances, and temperature ranges. Modal headers keep a centered 44 px close target while the body scrolls. Outfit details use the same composition grid as Today, a complete expandable piece list, and a compact metadata summary in the same visual and reading order. Editing remains available.

## Complimentary access

An explicit service-managed grant supplies membership access separately from Stripe subscription records. It does not create a Stripe subscription or billing charge. Grants can expire or be revoked. Ordinary members cannot write grants, and an admin role alone does not confer a paid tier. Node entitlements and the database plan resolver use the same highest-valid-plan rule. Existing monetary AI limits remain in force.

The additive migration was applied before deploying code that reads the table. The rollout restores the designated owner/admin account only after hosted verification. No customer subscription, payment, invoice, or Stripe status needs alteration.

## Verification

2,432 automated tests passed, with four existing skips. Production build, TypeScript, strict lint, and private-value scans passed. Real hosted database tests verified self-upgrade denial, account isolation, expiry, revocation, and matching Node/SQL plans. Browser checks verified Free previews, benefit prompts, close-button centering, responsive forecasts, outfit editing, and complimentary Pro access surviving routine Stripe synchronization. They also verified that the test created no AI jobs. All temporary accounts were removed.

Weather responses are deterministic fixtures for layout validation. Other browser data and membership checks use the real application in an isolated account. Screenshots show the final light/dark presentation. Run `node scripts/check-mobile-access-browser.mjs` against a local production build; set `PLAYWRIGHT_MODULE` if needed. `MOBILE_TEST_BASE=https://www.myaioutfit.com` selects the verified production domain. The runner never submits an AI request or starts checkout.
