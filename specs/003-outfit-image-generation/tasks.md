# Tasks: Outfit Image Generation

**Input**: Design documents from `/specs/003-outfit-image-generation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included per constitution requirement (II. Test-Driven Quality: "All new features MUST include tests").

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, storage bucket, types, and schemas needed by all user stories

- [x] T001 Create database migration for `generated_outfit_images`, `image_generation_usage`, and `generation_log` tables with RLS policies, indexes, and `check_and_increment_quota` helper function in `supabase/migrations/20260215_add_outfit_image_generation.sql`
- [x] T002 Add `GeneratedOutfitImage`, `ImageGenerationUsage`, `GenerationLogEntry`, `GenerationStatus`, `AccountTier`, and `IMAGE_GENERATION_LIMITS` types to `lib/types/database.ts`
- [x] T003 Add `GenerationStatusSchema`, `AccountTierSchema`, `GeneratedOutfitImageSchema`, `ImageGenerationUsageSchema`, `GenerateOutfitImageRequestSchema`, and `GenerateOutfitImageResponseSchema` Zod schemas to `lib/schemas/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and Edge Function that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create prompt builder utility `buildOutfitPrompt()` in `lib/utils/outfit-prompt-builder.ts` that accepts an array of wardrobe items with their categories, colors, materials, and formality scores, and produces a structured flat-lay composition prompt following the same section format (Garment Requirements, Background, Style, Brand Handling, Output Specifications) as `scripts/generate-wardrobe-item-images.ts`
- [ ] T005 Write tests for `buildOutfitPrompt()` in `lib/utils/__tests__/outfit-prompt-builder.test.ts` covering: single item, multiple items across categories, items with missing optional fields (brand, material), minimum required fields validation (category + color), and tuck style inclusion
- [ ] T006 Create `generate-outfit-image` Edge Function in `supabase/functions/generate-outfit-image/index.ts` following the `process-image` pattern: auth verification, Replicate API call to `google-deepmind/imagen-4` with `Prefer: wait`, download result image, upload to `outfit-generated-images` Storage bucket, update DB record status, increment usage quota, and log to `generation_log`
- [ ] T007 Create `ensureGeneratedImagesBucket()` in the Edge Function (following the `ensureStorageBucket` pattern from `process-image/index.ts`) to auto-create the `outfit-generated-images` bucket with public read, 10MB limit, and allowed MIME types `image/webp`, `image/png`, `image/jpeg`

**Checkpoint**: Foundation ready - Edge Function deployed, prompt builder tested, DB schema applied

---

## Phase 3: User Story 1 - Generate Visual Preview of Outfit (Priority: P1) MVP

**Goal**: Users can click "Generate Image" on an outfit detail page and receive a flat-lay AI-generated image within 30 seconds

**Independent Test**: Select an existing outfit with items that have category and color data, click "Generate Outfit Image", see progress indicator, and receive a completed image displayed in the outfit view

### Tests for User Story 1

- [ ] T008 [P] [US1] Write tests for `generateOutfitImage` server action in `lib/actions/__tests__/outfit-images.test.ts` covering: successful generation flow, rejection for free-tier users, rejection when outfit items lack required data (category/color), and proper error handling when Edge Function fails (quota NOT decremented)
- [ ] T009 [P] [US1] Write tests for `useGenerateOutfitImage` and `useOutfitImages` hooks in `lib/hooks/__tests__/use-outfit-images.test.ts` covering: fetching images for an outfit, triggering generation mutation, cache invalidation on success, 3-second debounce enforcement, and loading/error states

### Implementation for User Story 1

- [ ] T010 [US1] Create `generateOutfitImage` server action in `lib/actions/outfit-images.ts` implementing validate-authenticate-authorize-execute: validate input with `GenerateOutfitImageRequestSchema`, verify outfit ownership, check tier is not `starter`, validate outfit items have category + color, build prompt via `buildOutfitPrompt()`, create pending `generated_outfit_images` record, invoke `generate-outfit-image` Edge Function, and return result with quota info
- [ ] T011 [US1] Create `getOutfitImages` server action in `lib/actions/outfit-images.ts` that fetches all completed generated images for an outfit ordered by `created_at DESC`, with auth and ownership verification
- [ ] T012 [US1] Create `useOutfitImages(outfitId)` and `useGenerateOutfitImage()` hooks in `lib/hooks/use-outfit-images.ts` using TanStack Query with query key `['outfit-images', outfitId]`, 5-minute stale time, mutation with cache invalidation, and 3-second debounce on generate
- [ ] T013 [US1] Create `OutfitImageGenerator` component in `components/outfit-image-generator.tsx` with: "Generate Outfit Image" button (disabled during generation), progress indicator using `ProcessingIndicator` pattern, status text showing generation state (pending/generating/completed/failed), and error display with retry option
- [ ] T014 [US1] Integrate `OutfitImageGenerator` into outfit detail view mode in `app/outfits/[id]/outfit-detail-client.tsx` by adding the component below the outfit items display section, passing the outfit data and items array
- [ ] T015 [US1] Display generated image inline in outfit detail page after successful generation, with download button (anchor tag with `download` attribute to image URL) in `app/outfits/[id]/outfit-detail-client.tsx`
- [ ] T016 [US1] Add item data validation feedback in `components/outfit-image-generator.tsx`: before generation, check all items have category and color; if not, show which items need more detail with item names listed
- [ ] T017 [US1] Mark generated images as outdated when outfit items change in `app/outfits/[id]/outfit-detail-client.tsx`: compare outfit `updated_at` timestamp against each generated image's `created_at`; if outfit was modified after the image was generated, show a visual "outdated" indicator (muted overlay + "Items changed - regenerate?" text) on the image with a regenerate button

**Checkpoint**: User Story 1 fully functional - users can generate and view outfit images from the detail page

---

## Phase 4: User Story 2 - Respect Usage Limits (Priority: P1)

**Goal**: Users can only generate images within their tier limits, with clear messaging about quotas and reset times

**Independent Test**: Attempt to generate images until monthly or hourly limits are reached, verify further attempts are blocked with clear error messages including reset times; verify free-tier users see locked button with upgrade prompt

### Tests for User Story 2

- [ ] T018 [P] [US2] Write tests for `getImageGenerationQuota` server action in `lib/actions/__tests__/outfit-images.test.ts` covering: quota fetch for each tier, monthly reset logic (reset when `monthly_reset_at < now()`), hourly burst calculation from `hourly_timestamps`, and new user row creation
- [ ] T019 [P] [US2] Write tests for `useImageGenerationQuota` hook in `lib/hooks/__tests__/use-outfit-images.test.ts` covering: `canGenerate` computed property, `isFreeTier` flag, quota display values, and 1-minute stale time

### Implementation for User Story 2

- [ ] T020 [US2] Create `getImageGenerationQuota` server action in `lib/actions/outfit-images.ts` that authenticates, determines account tier (read from `user_preferences.account_tier` column, defaulting to `'starter'` if absent), fetches or creates `image_generation_usage` row, auto-resets monthly count if `monthly_reset_at < now()`, calculates hourly remaining from `hourly_timestamps` array, and returns tier info with limits and remaining counts
- [ ] T021 [US2] Add quota check logic to `generateOutfitImage` server action in `lib/actions/outfit-images.ts`: before creating pending record, verify monthly count < tier limit AND hourly burst < 5; return 429 error with `monthly_reset_at` or "try again in X minutes" for hourly limit
- [ ] T022 [US2] Create `useImageGenerationQuota` hook in `lib/hooks/use-outfit-images.ts` with query key `['image-generation-quota']`, 1-minute stale time, computed `canGenerate` and `isFreeTier` properties
- [ ] T023 [US2] Add quota display to `OutfitImageGenerator` component in `components/outfit-image-generator.tsx`: show "X of Y image generations remaining this month (resets [date])" text near the generate button, using `useImageGenerationQuota` hook data
- [ ] T024 [US2] Implement free-tier locked state in `components/outfit-image-generator.tsx`: when `isFreeTier` is true, show "Generate Outfit Image" button with lock icon (Lucide `Lock` via direct import), disabled state, and clicking shows upgrade prompt text linking to `/pricing` page
- [ ] T025 [US2] Add error messages for quota exceeded in `components/outfit-image-generator.tsx`: show "Monthly limit reached. Upgrade your plan or wait until [reset date]" for monthly limit; show "Generation limit reached. Try again in X minutes" for hourly burst limit

**Checkpoint**: Quota enforcement complete - free users see locked state, paid users see quota, limits are enforced server-side

---

## Phase 5: User Story 3 - View Generation History and Manage Images (Priority: P2)

**Goal**: Users can view all previously generated images for an outfit, download them, delete them, or set one as the outfit's primary thumbnail

**Independent Test**: Navigate to an outfit with multiple generated images, see a gallery with timestamps, download an image, delete an image, and set one as primary thumbnail

### Tests for User Story 3

- [ ] T026 [P] [US3] Write tests for `deleteOutfitImage` and `setPrimaryOutfitImage` server actions in `lib/actions/__tests__/outfit-images.test.ts` covering: successful deletion with storage cleanup, ownership verification, setting primary (unsets previous primary), and deleting a primary image clears primary status
- [ ] T027 [P] [US3] Write tests for `useDeleteOutfitImage` and `useSetPrimaryOutfitImage` hooks in `lib/hooks/__tests__/use-outfit-images.test.ts` covering: optimistic cache updates, rollback on error, and cache invalidation of `['outfits']` when primary changes

### Implementation for User Story 3

- [ ] T028 [US3] Create `deleteOutfitImage` server action in `lib/actions/outfit-images.ts`: validate UUID, authenticate, verify ownership, delete file from `outfit-generated-images` bucket using `storage_path`, delete DB record, and clear primary if deleted image was primary
- [ ] T029 [US3] Create `setPrimaryOutfitImage` server action in `lib/actions/outfit-images.ts`: validate UUIDs, authenticate, verify ownership of both image and outfit, unset any existing `is_primary = true` for that outfit, set target image `is_primary = true`
- [ ] T030 [US3] Create `useDeleteOutfitImage` and `useSetPrimaryOutfitImage` hooks in `lib/hooks/use-outfit-images.ts` with optimistic updates and cache invalidation for `['outfit-images', outfitId]` and `['outfits']`
- [ ] T031 [US3] Create `OutfitImageGallery` component in `components/outfit-image-gallery.tsx` displaying all generated images for an outfit in a responsive grid with: thumbnail previews, generation timestamp, download button (Lucide `Download` direct import), delete button (Lucide `Trash2` direct import) with confirmation, and "Set as thumbnail" button (Lucide `Star` direct import)
- [ ] T032 [US3] Integrate `OutfitImageGallery` into outfit detail view in `app/outfits/[id]/outfit-detail-client.tsx` below the `OutfitImageGenerator` component, showing the gallery section when images exist
- [ ] T033 [US3] Update `OutfitCard` component in `components/outfit-card.tsx` to display the primary generated image as outfit thumbnail when `is_primary` image exists, by querying for the primary image and showing it in the card header area

**Checkpoint**: Full image management - users can view history, download, delete, and set primary thumbnails

---

## Phase 6: Edge Cases & Polish

**Purpose**: Handle edge cases from spec and cross-cutting concerns

- [ ] T034 Implement free retry logic in `generateOutfitImage` server action in `lib/actions/outfit-images.ts`: when `retry_of` is provided, verify original image exists, belongs to user, and `retry_expires_at > now()` (5-minute window); if valid, do not decrement quota; set `retry_expires_at` on newly created records to `now() + 5 minutes`
- [ ] T035 Add `cancelOutfitImageGeneration` server action in `lib/actions/outfit-images.ts`: validate UUID, authenticate, verify ownership, only cancel if status is `pending`, update status to `cancelled`
- [ ] T036 Handle Replicate API failures gracefully in `supabase/functions/generate-outfit-image/index.ts`: on any error, update image record to `failed` with error message, do NOT increment quota, log failure to `generation_log`, and return structured error response
- [ ] T037 Add duplicate request prevention in `components/outfit-image-generator.tsx`: disable generate button for 3 seconds after click (FR-018 debounce), and prevent generation if an existing `pending` or `generating` record exists for this outfit
- [ ] T038 Export `useOutfitImages`, `useGenerateOutfitImage`, `useImageGenerationQuota`, `useDeleteOutfitImage`, and `useSetPrimaryOutfitImage` from `lib/hooks/index.ts`
- [ ] T039 Add accessibility attributes to all new interactive components: `aria-label` on icon-only buttons (generate, download, delete, set primary), `aria-live="polite"` on generation status text, `role="status"` on progress indicator, keyboard navigation for gallery grid in `components/outfit-image-gallery.tsx` and `components/outfit-image-generator.tsx`
- [ ] T040 Run `npm run lint`, `npm run typecheck`, and `npm run test:run` to verify all code passes quality gates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion; can run in parallel with US1 but quota integration into `generateOutfitImage` (T021) depends on T010
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion; can run in parallel with US1/US2 but gallery integration (T031) benefits from T014 being complete
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - core generation flow
- **User Story 2 (P1)**: Integrates quota checks into US1's `generateOutfitImage` action (T021 depends on T010)
- **User Story 3 (P2)**: Independent management features; gallery placement depends on detail page integration from US1 (T014). T032 also depends on T031 (gallery placement)

### Within Each User Story

- Tests written first (constitution mandate)
- Server actions before hooks
- Hooks before components
- Components before page integration

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T004 and T006 can run in parallel (different files)
- T008 and T009 can run in parallel (different test files)
- T010 and T011 can run in parallel (same file but independent functions)
- T018 and T019 can run in parallel (different test files)
- T026 and T027 can run in parallel (different test files)
- T028 and T029 can run in parallel (independent server actions)

---

## Parallel Example: User Story 1

```bash
# Launch tests in parallel:
Task: "Write tests for generateOutfitImage server action in lib/actions/__tests__/outfit-images.test.ts"
Task: "Write tests for useGenerateOutfitImage hook in lib/hooks/__tests__/use-outfit-images.test.ts"

# Launch independent server actions in parallel:
Task: "Create generateOutfitImage server action in lib/actions/outfit-images.ts"
Task: "Create getOutfitImages server action in lib/actions/outfit-images.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (DB migration, types, schemas)
2. Complete Phase 2: Foundational (prompt builder, Edge Function)
3. Complete Phase 3: User Story 1 (generate + display image)
4. **STOP and VALIDATE**: Test end-to-end generation on a real outfit
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test generation flow → Deploy (MVP!)
3. Add User Story 2 → Test quota enforcement → Deploy
4. Add User Story 3 → Test image management → Deploy
5. Polish → Final quality pass → Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution requires tests before merge (Phase 6 T040 validates)
- Edge Function follows exact pattern from `process-image/index.ts` including `ensureStorageBucket` and CORS helpers
- All Lucide icons must use direct imports per bundle optimization rules
- All UI must use semantic theme tokens per theming standard
