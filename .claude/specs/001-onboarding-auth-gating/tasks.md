# Tasks: Onboarding Gating & Auth Flow Wiring

**Input**: Design documents from `/specs/001-onboarding-auth-gating/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/wardrobe-readiness.md

**Tests**: Included per constitution principle II (Test-Driven Quality).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (Next.js App Router)**: `app/`, `lib/`, `components/` at repository root
- Tests in colocated `__tests__/` directories per constitution convention

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new server helper directory

- [ ] T001 Create `lib/server/` directory for server-only helpers

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core helpers that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Add `user_id: string` and `active: boolean` to the `CreateWardrobeItemInput` type in `lib/types/database.ts`
- [ ] T003 Implement `hasActiveWardrobeItems(supabase, userId)` function in `lib/server/wardrobe-readiness.ts` — query `wardrobe_items` with `.select('id').eq('user_id', userId).eq('active', true).limit(1)`, return `true` if row exists, fail-open on error (return `true`)
- [ ] T004 Implement `getPostAuthRoute({ hasItems, requestedNext })` function in `lib/server/wardrobe-readiness.ts` — return `/onboarding` when `hasItems` is false, else return sanitized `requestedNext` or `/today`. Sanitize to reject absolute URLs and non-internal paths
- [ ] T005 Write unit tests for `hasActiveWardrobeItems` and `getPostAuthRoute` in `lib/server/__tests__/wardrobe-readiness.test.ts` — test routing matrix from contracts (empty → onboarding, items → next or /today, external URL → /today rejected, query error → fail-open returns true)

**Checkpoint**: Foundation ready — wardrobe readiness helper tested and available for all stories

---

## Phase 3: User Story 1 — New User Lands in Onboarding After Registration (Priority: P1) MVP

**Goal**: Wire auth entry points so newly authenticated users with empty wardrobes are redirected to onboarding instead of the main app.

**Independent Test**: Create a new user account via OAuth or email confirmation and verify the redirect lands on `/onboarding`. Log in as a user with items and verify redirect to `/today`.

### Implementation for User Story 1

- [ ] T006 [US1] Update `app/auth/callback/route.ts` — remove seed-user Edge Function invocation, import `hasActiveWardrobeItems` and `getPostAuthRoute` from `lib/server/wardrobe-readiness.ts`, after session exchange call readiness check and use `getPostAuthRoute` to determine redirect destination
- [ ] T007 [US1] Update `app/auth/confirm/route.ts` — remove `seedNewUser()` call, import readiness helpers, after OTP verification call `hasActiveWardrobeItems` and redirect via `getPostAuthRoute`, preserve existing error handling
- [ ] T008 [P] [US1] Update `components/login-form.tsx` — change password login success redirect from `/wardrobe` to `/today`, change OAuth callback `next` target from `/wardrobe` to `/today`
- [ ] T009 [P] [US1] Update `components/sign-up-form.tsx` — change OAuth callback `next` target from `/wardrobe` to `/today`, keep email signup confirmation flow unchanged
- [ ] T010 [US1] Write tests for auth callback routing in `app/auth/callback/__tests__/route.test.ts` — test: empty wardrobe user redirects to `/onboarding`, user with items redirects to `next` param or `/today`, seed-user is no longer called
- [ ] T011 [US1] Write tests for auth confirm routing in `app/auth/confirm/__tests__/route.test.ts` — test: empty wardrobe user redirects to `/onboarding`, user with items redirects to `/today`, seedNewUser is no longer called

**Checkpoint**: New user registration flow now redirects empty-wardrobe users to onboarding

---

## Phase 4: User Story 4 — Onboarding Items Save Successfully (Priority: P1)

**Goal**: Fix the onboarding persister so items include `user_id` in the insert payload, satisfying RLS INSERT policy. Redirect to wardrobe page after completion.

**Independent Test**: Complete onboarding as an authenticated user. Verify all items appear in the wardrobe page, each marked active and owned by the user.

### Implementation for User Story 4

- [ ] T012 [US4] Update `mapGeneratedItemToInput()` in `lib/services/onboarding-persister.ts` — add `user_id: userId` parameter to the function, include `user_id` in the returned insert object, explicitly set `active: true` in the insert object
- [ ] T013 [US4] Update `persistWardrobeItems()` in `lib/services/onboarding-persister.ts` — pass `userId` through to `mapGeneratedItemToInput()`, ensure the batch insert call includes `user_id` on every row
- [ ] T014 [US4] Update onboarding wizard completion redirect — after successful persistence in `components/onboarding/onboarding-wizard.tsx`, redirect to `/wardrobe` instead of current behavior
- [ ] T015 [US4] Write tests for onboarding persister in `lib/services/__tests__/onboarding-persister.test.ts` — test: `mapGeneratedItemToInput` returns object with `user_id` field, `active` is explicitly `true`, mock Supabase insert receives `user_id` on every row in batch

**Checkpoint**: Onboarding items persist correctly with user ownership and redirect to wardrobe

---

## Phase 5: User Story 2 — Returning Empty-Wardrobe User Is Guided to Onboarding (Priority: P1)

**Goal**: Gate all app pages (except settings) so authenticated users with zero active wardrobe items are redirected to onboarding.

**Independent Test**: Log in as a user with zero active items. Navigate to `/today`, `/wardrobe`, `/outfits`, `/anchor`. Verify all redirect to `/onboarding`. Navigate to `/settings`. Verify it loads normally. Log in as a user with items. Verify all pages load normally.

### Implementation for User Story 2

- [ ] T016 [US2] Add wardrobe readiness check to `app/today/page.tsx` — after existing auth check, call `hasActiveWardrobeItems`, if false call `redirect('/onboarding')`
- [ ] T017 [P] [US2] Add wardrobe readiness check to `app/wardrobe/page.tsx` — import server Supabase client, get user, call `hasActiveWardrobeItems`, if false call `redirect('/onboarding')`
- [ ] T018 [P] [US2] Add wardrobe readiness check to `app/outfits/page.tsx` — import server Supabase client, get user, call `hasActiveWardrobeItems`, if false call `redirect('/onboarding')`
- [ ] T019 [P] [US2] Add wardrobe readiness check to `app/anchor/[category]/page.tsx` — after existing auth check, call `hasActiveWardrobeItems`, if false call `redirect('/onboarding')`
- [ ] T020 [US2] Verify `app/settings/page.tsx` does NOT have wardrobe readiness check — confirm settings page remains accessible regardless of wardrobe state (no changes needed, document verification)
- [ ] T021 [US2] Write tests for page gating behavior in `lib/server/__tests__/page-gating.test.ts` — test: each gated page redirects when `hasActiveWardrobeItems` returns false, each gated page renders when returns true, settings page always renders

**Checkpoint**: All app pages except settings redirect empty-wardrobe users to onboarding

---

## Phase 6: User Story 3 — Onboarding Is Protected From Unauthenticated Access (Priority: P2)

**Goal**: Block unauthenticated visitors from accessing the onboarding page by adding it to the middleware protected routes list.

**Independent Test**: Open `/onboarding` in an incognito browser. Verify redirect to `/auth/login`. Log in and navigate to `/onboarding`. Verify it loads.

### Implementation for User Story 3

- [ ] T022 [US3] Add `/onboarding` to `protectedRoutes` array in `lib/supabase/middleware.ts` — add to existing array alongside `/wardrobe`, `/outfits`, `/anchor`, `/settings`
- [ ] T023 [US3] Add `/today` to `protectedRoutes` array in `lib/supabase/middleware.ts` — currently not protected, needs to be since it has auth-dependent content
- [ ] T024 [US3] Verify `AuthBoundary` in `app/onboarding/page.tsx` remains as defense-in-depth — confirm existing auth boundary is preserved (no changes needed, document verification)

**Checkpoint**: Onboarding route is protected at both middleware and page level

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup across all stories

- [ ] T025 Run `npm run typecheck` and fix any TypeScript errors introduced by type changes
- [ ] T026 Run `npm run lint` and fix any linting issues
- [ ] T027 Run `npm run test:run` and verify all tests pass (new and existing)
- [ ] T028 Run quickstart.md validation — manually test each scenario from `specs/001-onboarding-auth-gating/quickstart.md`
- [ ] T029 Remove any unused seed-user imports or dead code from auth routes after seed removal

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — auth route wiring
- **US4 (Phase 4)**: Depends on Phase 2 (type changes) — can run in PARALLEL with US1
- **US2 (Phase 5)**: Depends on Phase 2 — can run in PARALLEL with US1 and US4
- **US3 (Phase 6)**: No dependency on other stories — can run in PARALLEL with US1, US2, US4
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on foundational readiness helper. No dependencies on other stories.
- **User Story 4 (P1)**: Depends on foundational type change. No dependencies on other stories.
- **User Story 2 (P1)**: Depends on foundational readiness helper. No dependencies on other stories.
- **User Story 3 (P2)**: No dependencies on other stories. Only modifies middleware config.

### Within Each User Story

- Type/model changes before service changes
- Service changes before route/page changes
- Tests after implementation (constitution allows test-alongside approach)
- Story complete before moving to polish

### Parallel Opportunities

- T008 and T009 can run in parallel (different component files, no dependencies)
- T016, T017, T018, T019 can run in parallel (different page files)
- US1, US2, US4 can all run in parallel after Phase 2
- US3 can run in parallel with any other story

---

## Parallel Example: After Foundational Phase

```bash
# These can all start simultaneously after Phase 2:

# US1: Auth routing
Task: "T006 Update app/auth/callback/route.ts"
Task: "T007 Update app/auth/confirm/route.ts"

# US4: Persister fix (parallel with US1)
Task: "T012 Update mapGeneratedItemToInput in onboarding-persister.ts"

# US2: Page gating (parallel with US1 and US4)
Task: "T016 Add readiness check to app/today/page.tsx"
Task: "T017 Add readiness check to app/wardrobe/page.tsx"
Task: "T018 Add readiness check to app/outfits/page.tsx"
Task: "T019 Add readiness check to app/anchor/[category]/page.tsx"

# US3: Middleware (parallel with everything)
Task: "T022 Add /onboarding to protectedRoutes in middleware.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (readiness helper + type changes)
3. Complete Phase 3: US1 (auth routing)
4. Complete Phase 4: US4 (persister fix)
5. **STOP and VALIDATE**: New users hit onboarding, items save correctly
6. Deploy/demo if ready

### Full Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (auth routing) → New users redirected to onboarding
3. Add US4 (persister fix) → Items save with user_id
4. Add US2 (page gating) → All pages redirect empty-wardrobe users
5. Add US3 (middleware) → Onboarding route protected from unauthenticated access
6. Polish → Typecheck, lint, full test suite, quickstart validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tests use `npm run test:run` (run-once mode per constitution)
- No database migrations — all changes are application-level
