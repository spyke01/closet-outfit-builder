# Feature Specification: Onboarding Gating & Auth Flow Wiring

**Feature Branch**: `001-onboarding-auth-gating`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Onboarding Gating + Auth Flow Wiring + RLS Insert Fix"

## Clarifications

### Session 2026-02-13

- Q: Where should users be redirected after completing onboarding? → A: Redirect to the wardrobe page.
- Q: When a user with existing items re-onboards, what happens to existing wardrobe items? → A: Additive — new onboarding items are added alongside existing items.
- Q: Which app pages should redirect empty-wardrobe users to onboarding? → A: All app pages except settings (includes outfits, anchor, today, wardrobe).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Lands in Onboarding After Registration (Priority: P1)

A brand-new user signs up (via email confirmation or OAuth) and has zero wardrobe items. Upon completing authentication, they are automatically routed to the onboarding flow rather than the main app, ensuring their first experience guides them through adding initial wardrobe items.

**Why this priority**: The core value proposition depends on users having wardrobe items. Without onboarding gating, new users land on an empty dashboard with no guidance, leading to confusion and drop-off.

**Independent Test**: Can be fully tested by creating a new user account and verifying the redirect lands on the onboarding page. Delivers immediate value by ensuring every new user enters a guided setup experience.

**Acceptance Scenarios**:

1. **Given** a user has just completed email confirmation with zero wardrobe items, **When** the confirmation completes, **Then** they are redirected to the onboarding page.
2. **Given** a user has just completed OAuth sign-in for the first time with zero wardrobe items, **When** the OAuth callback completes, **Then** they are redirected to the onboarding page.
3. **Given** a user has just completed OAuth sign-in and has existing wardrobe items, **When** the OAuth callback completes, **Then** they are redirected to their requested destination or the daily outfit page.

---

### User Story 2 - Returning Empty-Wardrobe User Is Guided to Onboarding (Priority: P1)

An authenticated user who previously skipped onboarding or deleted all their wardrobe items navigates to any app page (daily outfit, wardrobe, outfits, or anchor). The system detects they have zero active wardrobe items and redirects them to onboarding, preventing a confusing empty-state experience. The settings page remains accessible regardless of wardrobe state.

**Why this priority**: Users with empty wardrobes cannot use core features (outfit generation, wardrobe browsing, anchor discovery). Redirecting them to onboarding is essential for re-engagement.

**Independent Test**: Can be tested by logging in as a user with zero active wardrobe items and navigating to any gated page. Verifies redirect to onboarding. Also verify settings page loads normally.

**Acceptance Scenarios**:

1. **Given** an authenticated user has zero active wardrobe items, **When** they navigate to the daily outfit page, **Then** they are redirected to onboarding.
2. **Given** an authenticated user has zero active wardrobe items, **When** they navigate to the wardrobe page, **Then** they are redirected to onboarding.
3. **Given** an authenticated user has zero active wardrobe items, **When** they navigate to the outfits page, **Then** they are redirected to onboarding.
4. **Given** an authenticated user has zero active wardrobe items, **When** they navigate to the anchor page, **Then** they are redirected to onboarding.
5. **Given** an authenticated user has zero active wardrobe items, **When** they navigate to the settings page, **Then** the page loads normally without redirect.
6. **Given** an authenticated user has at least one active wardrobe item, **When** they navigate to the daily outfit page, **Then** the page loads normally without redirect.

---

### User Story 3 - Onboarding Is Protected From Unauthenticated Access (Priority: P2)

An unauthenticated visitor attempts to access the onboarding page directly (e.g., via a shared link or direct URL entry). The system blocks access and redirects them to the login page, ensuring onboarding data is always associated with an authenticated account.

**Why this priority**: Onboarding writes wardrobe data that must be tied to a user account. Allowing unauthenticated access would either fail silently or create orphaned data.

**Independent Test**: Can be tested by opening the onboarding URL in an incognito/unauthenticated browser session and verifying redirect to login.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they request the onboarding page, **Then** they are redirected to the login page.
2. **Given** an authenticated user, **When** they request the onboarding page, **Then** the page loads successfully.

---

### User Story 4 - Onboarding Items Save Successfully (Priority: P1)

A user completes the onboarding flow and submits their initial wardrobe items. The items are persisted to the database with the correct user ownership, passing all data access policies. Previously, items failed to save because the insert payload was missing the user identifier required by the data access policy. After successful onboarding, the user is redirected to the wardrobe page where they can see their newly added items.

**Why this priority**: If onboarding items fail to save, the entire onboarding experience is broken — users complete the flow but have nothing in their wardrobe. This is a data integrity and trust issue.

**Independent Test**: Can be tested by completing the onboarding flow as an authenticated user and verifying that all submitted items appear in the wardrobe.

**Acceptance Scenarios**:

1. **Given** an authenticated user completes onboarding with selected items, **When** the items are submitted, **Then** all items are persisted to the user's wardrobe.
2. **Given** an authenticated user completes onboarding, **When** the submission succeeds, **Then** the user is redirected to the wardrobe page.
3. **Given** an authenticated user completes onboarding, **When** they arrive at the wardrobe page, **Then** all onboarded items are visible and owned by that user.
4. **Given** an authenticated user completes onboarding, **When** the items are persisted, **Then** each item is marked as active.
5. **Given** a user with existing wardrobe items completes onboarding again, **When** the items are submitted, **Then** new items are added alongside existing items (additive, no replacement or deactivation of existing items).

---

### Edge Cases

- What happens when a user completes onboarding, deletes all items, and revisits the app? They are redirected to onboarding again (wardrobe empty = onboarding eligible).
- What happens when a user has only inactive/archived wardrobe items? They are treated as having an empty wardrobe and redirected to onboarding (only active items count).
- What happens if the wardrobe readiness check fails due to a service error? The user proceeds to the default destination (daily outfit page) rather than being blocked. Errors are logged but do not prevent app access.
- What happens if a user with items manually navigates to the onboarding page? The page loads — onboarding is not hard-blocked for users who already have items (allows re-onboarding).
- What happens if a user with items completes onboarding again? New items are added alongside existing items (additive behavior). No existing items are deactivated or replaced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST redirect newly authenticated users with zero active wardrobe items to the onboarding page after login or registration completes.
- **FR-002**: System MUST redirect authenticated users with zero active wardrobe items to the onboarding page when they navigate to the daily outfit page.
- **FR-003**: System MUST redirect authenticated users with zero active wardrobe items to the onboarding page when they navigate to the wardrobe page.
- **FR-004**: System MUST redirect unauthenticated users who attempt to access the onboarding page to the login page.
- **FR-005**: System MUST include the user's identity in every wardrobe item created during onboarding, ensuring items pass data access policy validation.
- **FR-006**: System MUST mark all items created during onboarding as active.
- **FR-007**: System MUST redirect authenticated users with existing active wardrobe items to their requested destination or the daily outfit page after login.
- **FR-008**: System MUST NOT block authenticated users from accessing onboarding even if they already have wardrobe items (allows voluntary re-onboarding).
- **FR-009**: System MUST centralize the post-authentication routing decision (onboarding vs. main app) in a single reusable component to ensure consistent behavior across all auth entry points (OAuth, email confirmation, password login).
- **FR-010**: System MUST define "empty wardrobe" as zero rows in the wardrobe items collection where the item is marked active for the authenticated user.
- **FR-011**: System MUST redirect authenticated users with zero active wardrobe items to the onboarding page when they navigate to the outfits page.
- **FR-012**: System MUST redirect authenticated users with zero active wardrobe items to the onboarding page when they navigate to the anchor page.
- **FR-013**: System MUST NOT redirect authenticated users away from the settings page regardless of wardrobe state.
- **FR-014**: System MUST redirect users to the wardrobe page upon successful completion of onboarding.
- **FR-015**: When a user with existing wardrobe items completes onboarding, the system MUST add new items alongside existing items without deactivating or replacing any existing wardrobe items.

### Key Entities

- **Wardrobe Item**: A clothing item owned by a user, with an active/inactive status. The presence of at least one active item determines whether a user bypasses onboarding.
- **User Session**: The authenticated user context, providing the user identity needed for data access policy compliance and routing decisions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly registered users with empty wardrobes are routed to onboarding on their first post-auth page load.
- **SC-002**: 100% of items submitted during onboarding are successfully persisted and visible in the user's wardrobe immediately after completion.
- **SC-003**: Users complete the full sign-up-to-first-wardrobe-item flow in under 5 minutes without encountering errors or dead-end states.
- **SC-004**: Zero unauthenticated requests reach the onboarding page content — all are redirected to login.
- **SC-005**: Returning users with active wardrobe items experience no change in their existing navigation flow (no regressions).
- **SC-006**: The onboarding redirect decision is consistent across all authentication methods (OAuth, email confirmation, password login).
- **SC-007**: After completing onboarding, 100% of users land on the wardrobe page with their newly added items visible.

## Assumptions

- "Empty wardrobe" is defined as zero active rows in wardrobe items for the authenticated user (active = true).
- Demo/seed wardrobe creation during registration is disabled — new users start with a genuinely empty wardrobe.
- Onboarding remains accessible to users who already have items; it is not hard-blocked after initial use.
- The default post-auth destination for users with items is the daily outfit page.
- If the wardrobe readiness check encounters a service error, the system fails open (user proceeds to default destination) rather than blocking access.
- Re-onboarding is additive — existing wardrobe items are never deactivated or replaced by onboarding.
- The settings page is exempt from empty-wardrobe gating to allow users to manage account preferences regardless of wardrobe state.
