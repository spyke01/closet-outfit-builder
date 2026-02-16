# Tasks: Sebastian Paid AI Assistant (Chat + Vision)

**Input**: Design documents from `/specs/003-sebastian-paid-assistant/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required per constitution principle II (Test-Driven Quality).

**Organization**: Tasks are grouped by user story for independent delivery and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story mapping (`US1`, `US2`, `US3`, `US4`)
- Include explicit file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add schema and configuration scaffolding

- [ ] T001 Create assistant tables migration (`assistant_threads`, `assistant_messages`, `assistant_inference_events`) with RLS in `supabase/migrations/20260216xxxxxx_create_assistant_tables.sql`
- [ ] T002 [P] Add assistant metric keys and plan limits/features updates in `lib/services/billing/plans.ts`
- [ ] T003 [P] Extend entitlement helpers to support assistant usage metrics in `lib/services/billing/entitlements.ts`
- [ ] T004 Document env variables (`REPLICATE_*`) in `.env.example`
- [ ] T005 Update CSP `connect-src` for Replicate API in `netlify.toml`

**Checkpoint**: Schema + billing primitives ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build reusable assistant services before route implementation

**CRITICAL**: No user story work starts before this phase

- [ ] T006 Create assistant domain types and Zod schemas in `lib/services/assistant/types.ts`
- [ ] T007 Create Replicate provider adapter with model routing + fallback + normalized errors in `lib/services/assistant/providers/replicate.ts`
- [ ] T008 Create context builder service (wardrobe/outfits/calendar/trips bounded context) in `lib/services/assistant/context-builder.ts`
- [ ] T009 Create moderation service (input/output checks + refusal templates) in `lib/services/assistant/moderation.ts`
- [ ] T010 [P] Create persona module + system prompt assembler based on `docs/sebastian-personality.md` and `contracts/persona-prompt.md` in `lib/services/assistant/persona.ts`
- [ ] T011 [P] Add unit tests for provider adapter routing/fallback in `lib/services/assistant/__tests__/replicate.test.ts`
- [ ] T012 [P] Add unit tests for context ownership and limits in `lib/services/assistant/__tests__/context-builder.test.ts`
- [ ] T013 [P] Add unit tests for moderation pass/block behavior in `lib/services/assistant/__tests__/moderation.test.ts`
- [ ] T014 [P] Add unit tests for persona prompt structure and refusal templates in `lib/services/assistant/__tests__/persona.test.ts`

**Checkpoint**: Assistant core services validated

---

## Phase 3: User Story 1 — Paid General Styling Chat (Priority: P1) 🎯 MVP

**Goal**: Paid users can send text chat and receive Sebastian responses

**Independent Test**: Paid user gets response; free user receives gating; errors are normalized

### Tests for User Story 1

- [ ] T015 [P] [US1] Add route tests for auth and paid gating in `app/api/assistant/chat/__tests__/route.auth.test.ts`
- [ ] T016 [P] [US1] Add route tests for quota/burst enforcement in `app/api/assistant/chat/__tests__/route.usage.test.ts`

### Implementation for User Story 1

- [ ] T017 [US1] Implement `POST /api/assistant/chat` with auth, paid gating, usage checks, provider invocation, and thread/message persistence in `app/api/assistant/chat/route.ts`
- [ ] T018 [US1] Wire persona prompt assembly into chat orchestration in `app/api/assistant/chat/route.ts`
- [ ] T019 [US1] Add helper for hourly assistant burst key and counter increment (or extend existing helpers) in `lib/services/billing/entitlements.ts`
- [ ] T020 [US1] Add standardized assistant error code mapping in `lib/services/assistant/types.ts`

**Checkpoint**: Paid text chat functional and metered

---

## Phase 4: User Story 2 — Wardrobe/Outfit Personalized Recommendations (Priority: P1)

**Goal**: Sebastian responses are grounded in user wardrobe/outfit data

**Independent Test**: Responses reference only requesting user's items

### Tests for User Story 2

- [ ] T021 [P] [US2] Add integration test ensuring context pack only includes owned wardrobe/outfits in `app/api/assistant/chat/__tests__/route.context-ownership.test.ts`
- [ ] T022 [P] [US2] Add integration test for empty-closet fallback response path in `app/api/assistant/chat/__tests__/route.empty-context.test.ts`

### Implementation for User Story 2

- [ ] T023 [US2] Wire `context-builder` into chat route and include references/citations in response payload in `app/api/assistant/chat/route.ts`
- [ ] T024 [US2] Add context relevance filtering (focus item + top-N strategy) in `lib/services/assistant/context-builder.ts`

**Checkpoint**: Personalized wardrobe-aware recommendations delivered safely

---

## Phase 5: User Story 3 — Outfit Photo Feedback (Priority: P1)

**Goal**: Paid users can submit image + text and receive feedback

**Independent Test**: Valid image accepted; unsafe/invalid image blocked safely

### Tests for User Story 3

- [ ] T025 [P] [US3] Add route test for valid image-url chat flow in `app/api/assistant/chat/__tests__/route.vision.test.ts`
- [ ] T026 [P] [US3] Add route test for blocked image content in `app/api/assistant/chat/__tests__/route.vision-safety.test.ts`

### Implementation for User Story 3

- [ ] T027 [US3] Extend chat request schema to accept optional `imageUrl` and enforce allowed origin/path constraints in `app/api/assistant/chat/route.ts`
- [ ] T028 [US3] Add image moderation hook before provider call in `lib/services/assistant/moderation.ts`
- [ ] T029 [US3] Persist `image_url` reference and safety metadata in `assistant_messages` rows via `app/api/assistant/chat/route.ts`

**Checkpoint**: Vision feedback feature live with safety controls

---

## Phase 6: User Story 4 — Calendar/Trip-Aware Recommendations (Priority: P2)

**Goal**: Sebastian uses event/trip context for planning prompts

**Independent Test**: Future event/trip data appears in context-aware output

### Tests for User Story 4

- [ ] T030 [P] [US4] Add context-builder test for calendar/trip window bounds in `lib/services/assistant/__tests__/context-builder.calendar-trip.test.ts`
- [ ] T031 [P] [US4] Add route test for planning prompt with event/trip hints in `app/api/assistant/chat/__tests__/route.calendar-trip.test.ts`

### Implementation for User Story 4

- [ ] T032 [US4] Add calendar/trip window retrieval and summarization in `lib/services/assistant/context-builder.ts`
- [ ] T033 [US4] Add `contextHints` handling (`eventDate`, `tripId`) in `app/api/assistant/chat/route.ts`

**Checkpoint**: Calendar/trip-aware planning responses available

---

## Phase 7: Threads + Observability + Polish

**Purpose**: Thread retrieval, audit events, and production hardening

- [ ] T034 Create `GET /api/assistant/threads/[id]` with ownership enforcement in `app/api/assistant/threads/[id]/route.ts`
- [ ] T035 Add assistant inference event logging with redaction in `app/api/assistant/chat/route.ts`
- [ ] T036 Add retry + timeout + circuit-breaker behavior in provider adapter `lib/services/assistant/providers/replicate.ts`
- [ ] T037 Add integration test for cross-user thread access denial in `app/api/assistant/threads/[id]/__tests__/route.authz.test.ts`
- [ ] T038 Run `npm run typecheck && npm run lint && npm run test:run`
- [ ] T039 Execute quickstart validation scenarios from `specs/003-sebastian-paid-assistant/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no prerequisites
- Foundational (Phase 2) depends on Setup and blocks all stories
- US1 (Phase 3) depends on Foundational
- US2 (Phase 4) depends on US1 route baseline + Foundational services
- US3 (Phase 5) depends on US1 route baseline + moderation service
- US4 (Phase 6) depends on Foundational context-builder; can proceed after US1 baseline
- Phase 7 depends on all stories complete

### Parallel Opportunities

- T002 and T003 can run in parallel
- T010, T011, T012 can run in parallel
- T013 and T014 can run in parallel
- T018 and T019 can run in parallel
- T022 and T023 can run in parallel
- T027 and T028 can run in parallel

## Implementation Strategy

### MVP First

1. Complete Setup + Foundational
2. Deliver US1 (paid text chat)
3. Validate paid gating + limits + fallback behavior
4. Deploy behind feature flag

### Incremental Delivery

1. Add US2 personalization
2. Add US3 vision feedback
3. Add US4 calendar/trip planning
4. Finish thread retrieval + observability hardening
