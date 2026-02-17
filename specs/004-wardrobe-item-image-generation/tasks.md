# Tasks: Wardrobe Item Image Generation

**Input**: Design documents from `/specs/004-wardrobe-item-image-generation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included per constitution requirement (II. Test-Driven Quality: "All new features MUST include tests").

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Architecture Note**: The billing/membership system (`user_subscriptions`, `plans`, `usage_counters`) was implemented after the original spec. Usage tracking uses the existing `usage_counters` table with `metric_key = 'ai_wardrobe_image_generations'` and the `entitlements.ts` service (`canUseFeature()`, `isUsageExceeded()`, `incrementUsageCounter()`). Plan tiers are `free`/`plus`/`pro` from `user_subscriptions.plan_code`.

**Key Simplification**: Generated images directly replace `wardrobe_items.image_url` — no separate image records table, no gallery, no history. The `wardrobe-images` Storage bucket is reused.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, types, and schemas needed by all user stories

- [X] T001 Create database migration for `generation_log` table with RLS policies and indexes in `supabase/migrations/YYYYMMDD_add_wardrobe_item_image_generation.sql`. Usage tracking uses existing `usage_counters` table.
- [X] T002 [P] Add `GenerationLogEntry`, `GenerationLogStatus` types to `lib/types/database.ts`
- [X] T003 [P] Add `GenerationLogStatusSchema`, `GenerateWardrobeItemImageRequestSchema`, and `GenerateWardrobeItemImageResponseSchema` Zod schemas to `lib/schemas/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and Edge Function that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create prompt builder utility `buildWardrobeItemPrompt()` in `lib/utils/wardrobe-item-prompt-builder.ts` that accepts a single wardrobe item with its category, color, brand, material, name, and other available attributes, and produces a product-style image prompt following the same section format (Garment Requirements, Background, Style, Brand Handling, Output Specifications) as `scripts/generate-wardrobe-item-images.ts`
- [X] T005 [P] Write tests for `buildWardrobeItemPrompt()` in `lib/utils/__tests__/wardrobe-item-prompt-builder.test.ts` covering: item with all fields, item with only required fields (category + color), items with missing optional fields (brand, material), and different category types (tops, bottoms, shoes, accessories)
- [X] T006 Create `generate-wardrobe-item-image` Edge Function in `supabase/functions/generate-wardrobe-item-image/index.ts` following the `process-image` pattern: auth verification, Replicate API call to `google-deepmind/imagen-4` with `Prefer: wait`, download result image, upload to `wardrobe-images` Storage bucket at `{user_id}/generated/{wardrobe_item_id}.webp`, return image URL. Edge Function does NOT manage quota or DB updates — the calling server action handles those.

**Checkpoint**: Foundation ready — Edge Function deployed, prompt builder tested, DB schema applied

---

## Phase 3: User Story 1 - Generate AI Image for a Wardrobe Item (Priority: P1) MVP

**Goal**: Users can click "Generate Image" on a wardrobe item and receive a product-style AI-generated image within 30 seconds

**Independent Test**: Select an existing wardrobe item with category and color data, click "Generate Image", see progress indicator, and receive a completed image displayed as the item's image

### Tests for User Story 1

- [X] T007 [P] [US1] Write tests for `generateWardrobeItemImage` server action in `lib/actions/__tests__/wardrobe-item-images.test.ts` covering: successful generation flow (image_url updated), rejection for free-tier users (using `canUseFeature(entitlements, 'ai_image_generation')`), rejection when item lacks required data (category/color), and proper error handling when Edge Function fails (quota NOT incremented)
- [X] T008 [P] [US1] Write tests for `useGenerateWardrobeItemImage` hook in `lib/hooks/__tests__/use-wardrobe-item-image-generation.test.ts` covering: triggering generation mutation, cache invalidation of wardrobe item queries on success, 3-second debounce enforcement, and loading/error states

### Implementation for User Story 1

- [X] T009 [US1] Create `generateWardrobeItemImage` server action in `lib/actions/wardrobe-item-images.ts` implementing validate-authenticate-authorize-execute: validate input with `GenerateWardrobeItemImageRequestSchema`, verify item ownership, check entitlements via `resolveUserEntitlements()` + `canUseFeature(entitlements, 'ai_image_generation')` + `isUsageExceeded(entitlements, 'ai_wardrobe_image_generations')` + hourly burst check via `getAiBurstHourKey()`, validate item has category + color, build prompt via `buildWardrobeItemPrompt()`, invoke `generate-wardrobe-item-image` Edge Function, on success update `wardrobe_items.image_url`, increment usage via `incrementUsageCounter()`, log to `generation_log`, and return result
- [X] T010 [US1] Create `getImageGenerationQuota` server action in `lib/actions/wardrobe-item-images.ts` that returns current quota usage and limits using `resolveUserEntitlements()`
- [X] T011 [US1] Create `useGenerateWardrobeItemImage()` hook in `lib/hooks/use-wardrobe-item-image-generation.ts` using TanStack Query mutation with cache invalidation of `['wardrobe-items']` and 3-second debounce on generate
- [X] T012 [US1] Create `WardrobeItemImageGenerator` component in `components/wardrobe-item-image-generator.tsx` with: "Generate Image" button (disabled during generation), progress indicator using `ProcessingIndicator` pattern, status text showing generation state, error display with retry option, and confirmation dialog when replacing an existing image
- [X] T013 [US1] Integrate `WardrobeItemImageGenerator` into wardrobe item detail view page, adding the component near the item's image area with the item data passed as props
- [X] T014 [US1] Add item data validation feedback in `components/wardrobe-item-image-generator.tsx`: before generation, check item has category and color; if not, show which attributes need to be filled in

**Checkpoint**: User Story 1 fully functional — users can generate and view wardrobe item images from the detail page

---

## Phase 4: User Story 2 - Respect Usage Limits (Priority: P1)

**Goal**: Users can only generate images within their tier limits, with clear messaging about quotas and reset times

**Independent Test**: Attempt to generate images until monthly or hourly limits are reached, verify further attempts are blocked with clear error messages including reset times; verify free-tier users see locked button with upgrade prompt

**Architecture**: Uses existing billing infrastructure — `useBillingEntitlements()` hook for client-side plan info, `resolveUserEntitlements()` for server-side checks, `usage_counters` table for tracking. Feature flag: `plans.features_json.ai_image_generation`.

### Tests for User Story 2

- [X] T015 [P] [US2] Write tests for quota check logic in `lib/actions/__tests__/wardrobe-item-images.test.ts` covering: `canUseFeature` rejects free-tier, `isUsageExceeded` rejects when monthly limit reached, burst check rejects when hourly limit reached, and quota is only incremented on success
- [X] T016 [P] [US2] Write tests for quota display in `components/__tests__/wardrobe-item-image-generator.test.tsx` covering: free-tier locked state, quota display text, and error messages for exceeded limits

### Implementation for User Story 2

- [X] T017 [US2] Add quota display to `WardrobeItemImageGenerator` component in `components/wardrobe-item-image-generator.tsx`: use `useBillingEntitlements()` hook to fetch plan info, show "X of Y image generations remaining this month" using entitlements usage data
- [X] T018 [US2] Implement free-tier locked state in `components/wardrobe-item-image-generator.tsx`: when `entitlements.effectivePlanCode === 'free'` or `!canUseFeature(entitlements, 'ai_image_generation')`, show "Generate Image" button with lock icon (Lucide `Lock` via direct import), disabled state, and clicking shows upgrade prompt text linking to `/pricing` page
- [X] T019 [US2] Add error messages for quota exceeded in `components/wardrobe-item-image-generator.tsx`: show "Monthly limit reached. Upgrade your plan or wait until [reset date]" for monthly limit (code `USAGE_LIMIT_EXCEEDED`); show "Hourly limit reached. Try again later." for burst limit (code `BURST_LIMIT_EXCEEDED`)

**Checkpoint**: Quota enforcement complete — free users see locked state, paid users see quota, limits are enforced server-side via entitlements

---

## Phase 5: User Story 3 - Choose How to Set a Wardrobe Item Image (Priority: P2)

**Goal**: Users see "Generate with AI" as an option alongside "Upload Photo" on the wardrobe item create/edit screen

**Independent Test**: Create or edit a wardrobe item, see both upload and generate options near the image area, successfully use either method

### Implementation for User Story 3

- [X] T020 [US3] Integrate `WardrobeItemImageGenerator` into the wardrobe item create/edit form near the image upload area, presenting "Upload Photo" and "Generate with AI" as parallel options
- [X] T021 [US3] Ensure generated image is properly reflected in the form state so saving the item preserves the AI-generated `image_url`

**Checkpoint**: Full image acquisition flow — users can upload, use premade, or generate AI images for wardrobe items

---

## Phase 6: Edge Cases & Polish

**Purpose**: Handle edge cases from spec and cross-cutting concerns

- [X] T022 Implement free retry logic in `generateWardrobeItemImage` server action: when `is_retry = true`, verify last generation for this item was within 5 minutes (check `generation_log`); if valid, do not increment quota
- [X] T023 Add duplicate request prevention in `components/wardrobe-item-image-generator.tsx`: disable generate button for 3 seconds after click (FR-014 debounce)
- [X] T024 Handle Replicate API failures gracefully in `supabase/functions/generate-wardrobe-item-image/index.ts`: on any error, return structured error response; server action logs failure to `generation_log` and does NOT increment quota
- [X] T025 Add accessibility attributes to all new interactive components: `aria-label` on icon-only buttons, `aria-live="polite"` on generation status text, `role="status"` on progress indicator, keyboard navigation in `components/wardrobe-item-image-generator.tsx`
- [X] T026 Run `npm run lint`, `npm run typecheck`, and `npm run test:run` to verify all code passes quality gates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion; quota integration into `generateWardrobeItemImage` (T009) must be complete first
- **User Story 3 (Phase 5)**: Depends on Phase 3 completion (component must exist before integrating into form)
- **Polish (Phase 6)**: Depends on all user stories being complete

### Within Each User Story

- Tests written first (constitution mandate)
- Server actions before hooks
- Hooks before components
- Components before page integration

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T004 and T005 can run in parallel (different files)
- T007 and T008 can run in parallel (different test files)
- T015 and T016 can run in parallel (different test files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (DB migration, types, schemas)
2. Complete Phase 2: Foundational (prompt builder, Edge Function)
3. Complete Phase 3: User Story 1 (generate + display image)
4. **STOP and VALIDATE**: Test end-to-end generation on a real wardrobe item
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test generation flow → Deploy (MVP!)
3. Add User Story 2 → Test quota enforcement → Deploy
4. Add User Story 3 → Test create/edit integration → Deploy
5. Polish → Final quality pass → Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution requires tests before merge (Phase 6 T026 validates)
- Edge Function follows exact pattern from `process-image/index.ts` including CORS helpers
- All Lucide icons must use direct imports per bundle optimization rules
- All UI must use semantic theme tokens per theming standard
- Usage tracking uses existing `usage_counters` table + `entitlements.ts` service
- Plan/tier info from `user_subscriptions.plan_code` via `resolveUserEntitlements()`
- Feature gating via `canUseFeature(entitlements, 'ai_image_generation')`
- Generated images replace `wardrobe_items.image_url` directly — no image history table
- Storage uses existing `wardrobe-images` bucket at path `{user_id}/generated/{item_id}.webp`
