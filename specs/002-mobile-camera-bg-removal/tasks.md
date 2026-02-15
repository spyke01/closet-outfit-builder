# Tasks: Mobile Camera Capture & Background Removal

**Input**: Design documents from `/specs/002-mobile-camera-bg-removal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per constitution (II. Test-Driven Quality requires tests for all new features).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration, Replicate API secret, and Realtime configuration

- [X] T001 Create database migration adding `bg_removal_status`, `bg_removal_started_at`, `bg_removal_completed_at` columns to `wardrobe_items`, enable Realtime publication, and set REPLICA IDENTITY FULL in `supabase/migrations/20260214191611_add_bg_removal_tracking.sql`
- [X] T002 Set Replicate API token as Supabase secret via `supabase secrets set REPLICATE_API_TOKEN=<token>` and document in `.env.example`
- [X] T003 [P] Add `BgRemovalStatus` union type (`'pending' | 'processing' | 'completed' | 'failed'`) and update `WardrobeItem` interface with new columns in `lib/types/database.ts`
- [X] T004 [P] Add Zod schemas for `BgRemovalStatus` enum and `ReplicateResponse` (prediction output with `status`, `output` URL) in `lib/schemas/index.ts`

**Checkpoint**: Database schema updated, types ready, Replicate secret configured

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure changes that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Update `process-image` Edge Function to integrate Replicate API: after uploading original image, call `POST https://api.replicate.com/v1/predictions` with `Prefer: wait` header and `851-labs/background-remover` model, fetch processed image on success, compress/resize to max 1024px PNG, upload to `processed/` path, delete original, update `wardrobe_items.bg_removal_status` and `image_url` via Supabase client. On failure/timeout (60s), set status to `failed` and keep original in `supabase/functions/process-image/index.ts`
- [ ] T005b [P] Write test for `process-image` Edge Function timeout path: mock Replicate API to exceed 60s, verify function sets `bg_removal_status` to `failed`, verify original image URL is retained as `image_url`, verify no processed image is stored in `supabase/functions/process-image/__tests__/process-image.test.ts`
- [X] T006 Update `ImageProcessingResponse` schema and API route to include `bgRemovalStatus` field in response in `app/api/upload-image/route.ts`
- [X] T007 [P] Create `useWardrobeRealtime` hook: subscribe to `postgres_changes` on `wardrobe_items` table filtered by `user_id`, invalidate TanStack Query wardrobe cache on UPDATE events, cleanup channel on unmount in `lib/hooks/use-realtime-wardrobe.ts`
- [X] T008 [P] Export `useWardrobeRealtime` from hooks barrel file in `lib/hooks/index.ts`

**Checkpoint**: Foundation ready — Edge Function processes images via Replicate, Realtime hook available for subscriptions

---

## Phase 3: User Story 1 — Mobile Camera Capture (Priority: P1) 🎯 MVP

**Goal**: Mobile web users can photograph a clothing item using their device camera and add it to their wardrobe

**Independent Test**: Open app on mobile browser, tap upload area, select "Take Photo," capture image, verify it appears in wardrobe with original image immediately visible

### Tests for User Story 1

- [ ] T009 [P] [US1] Write test for `ImageUpload` component: verify mobile input renders with `accept="image/*"` attribute, verify file selection triggers upload, verify preview displays after capture in `components/__tests__/image-upload.test.tsx`
- [ ] T010 [P] [US1] Write test for `useImageUpload` hook: verify upload calls `/api/upload-image`, verify response includes `bgRemovalStatus`, verify successful response `imageUrl` ends with `.png` (FR-011), verify error state when upload fails in `lib/hooks/__tests__/use-image-upload.test.ts`

### Implementation for User Story 1

- [X] T011 [US1] Update `ImageUpload` component: replace or augment file input with `<input type="file" accept="image/*">` (no `capture` attribute for cross-platform compatibility), ensure the input works on mobile browsers to trigger native camera/gallery picker, maintain existing drag-and-drop for desktop in `components/image-upload.tsx`
- [X] T012 [US1] Update `useImageUpload` hook to handle the `bgRemovalStatus` field from the upload response and expose it as part of hook return value in `lib/hooks/use-image-upload.ts`
- [X] T013 [US1] Update `add-item-client.tsx` to pass mobile-friendly props to `ImageUpload` component and display the upload status from the hook response in `app/wardrobe/items/add-item-client.tsx`

**Checkpoint**: Mobile users can take a photo with their camera and it uploads to their wardrobe. Background removal runs automatically via the Edge Function.

---

## Phase 4: User Story 2 — Async Background Removal Processing (Priority: P1)

**Goal**: Uploaded images automatically get background removed asynchronously; the item shows original image first, then seamlessly updates to the processed version via Realtime

**Independent Test**: Upload any image, verify item appears immediately with original, verify image updates to transparent-background version within 30 seconds without page refresh

### Tests for User Story 2

- [ ] T014 [P] [US2] Write test for `useWardrobeRealtime` hook: verify Supabase channel subscription is created with correct filter, verify TanStack Query cache invalidation on UPDATE event, verify cleanup removes channel on unmount in `lib/hooks/__tests__/use-realtime-wardrobe.test.ts`
- [ ] T015 [P] [US2] Write test for `ProcessingIndicator` component: verify it renders spinner/badge when `bg_removal_status` is `processing`, verify it hides when status is `completed`, verify `aria-live="polite"` attribute present in `components/__tests__/processing-indicator.test.tsx`

### Implementation for User Story 2

- [X] T016 [P] [US2] Create `ProcessingIndicator` component: show a subtle animated badge/overlay on wardrobe item thumbnails when `bg_removal_status` is `pending` or `processing`, hide when `completed` or `failed`, use semantic tokens (`bg-muted`, `text-muted-foreground`), include `aria-live="polite"` for screen readers in `components/processing-indicator.tsx`
- [X] T017 [US2] Integrate `useWardrobeRealtime` hook into the wardrobe page so that when the Edge Function updates `bg_removal_status` and `image_url`, the TanStack Query cache is invalidated and the UI re-renders with the new image in `app/wardrobe/wardrobe-page-client.tsx`
- [X] T018 [US2] Integrate `ProcessingIndicator` into the wardrobe item card/grid component: pass `bg_removal_status` from wardrobe item data to the indicator, render it as an overlay on the item thumbnail in `components/items-grid.tsx`
- [X] T019 [US2] Handle edge case: if user deletes a wardrobe item while bg removal is processing, ensure the Edge Function gracefully handles the missing row (check row exists before updating status) in `supabase/functions/process-image/index.ts`

**Checkpoint**: Images upload immediately, background removal runs async, and the UI updates in real-time when processing completes. Failed processing gracefully falls back to original.

---

## Phase 5: User Story 3 — Photo Library Selection on Mobile (Priority: P2)

**Goal**: Mobile users can select an existing photo from their device's photo library and add it to their wardrobe

**Independent Test**: Open app on mobile browser, tap upload area, select "Photo Library" (or equivalent native picker), choose an image, verify it uploads and processes identically to camera captures

### Implementation for User Story 3

- [X] T020 [US3] Verify the `<input type="file" accept="image/*">` from US1 already enables photo library selection on both iOS and Android (iOS shows both camera and library natively; Android without `capture` attribute shows file picker including gallery). If additional handling needed, add it in `components/image-upload.tsx`
- [X] T021 [US3] Test HEIC format handling: verify that iOS photo library HEIC images are handled by the Edge Function (Replicate accepts common formats). If HEIC causes issues, add server-side conversion or add `accept="image/jpeg,image/png,image/webp"` to restrict input types in `components/image-upload.tsx`

**Checkpoint**: Photo library selection works on mobile with the same processing pipeline as camera capture

---

## Phase 6: User Story 4 — Processing Status Visibility (Priority: P3)

**Goal**: Users can see which wardrobe items are still being processed and which have completed

**Independent Test**: Upload multiple images, verify processing indicators appear on each, verify they disappear as each completes without page refresh

### Tests for User Story 4

- [ ] T022 [P] [US4] Write test for multiple items processing simultaneously: render wardrobe grid with mix of `pending`, `processing`, `completed` status items, verify correct indicators on each, simulate Realtime UPDATE for one item, verify only that item's indicator updates in `components/__tests__/items-grid.test.tsx`

### Implementation for User Story 4

- [X] T023 [US4] Enhance `ProcessingIndicator` to show differentiated states: `pending` (queued icon), `processing` (animated spinner), and ensure smooth transition animation when status changes from `processing` to `completed` (fade out) in `components/processing-indicator.tsx`
- [X] T024 [US4] Ensure `useWardrobeRealtime` handles multiple concurrent processing items correctly — each Realtime UPDATE should only invalidate the relevant query, not cause full list re-renders. Verify TanStack Query's structural sharing handles this efficiently in `lib/hooks/use-realtime-wardrobe.ts`

**Checkpoint**: Multiple items can process simultaneously with individual status indicators that update in real-time

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, accessibility, and cleanup

- [X] T025 [P] Add handling for transparent PNG detection (FR-012): before calling Replicate, check if uploaded image is PNG with alpha channel, skip bg removal if so and set status to `completed` immediately in `supabase/functions/process-image/index.ts`
- [X] T026 [P] Add camera permission denial handling (FR-014): detect when file input returns no file after user interaction (permission denied), show a toast/alert with helpful message suggesting to check browser settings in `components/image-upload.tsx`
- [X] T027 [P] Verify desktop browsers are unaffected: existing file picker and drag-and-drop still work identically, no camera-specific UI appears inappropriately on desktop in `components/image-upload.tsx`
- [ ] T028 Run `npm run typecheck && npm run lint && npm run test:run` to verify all type checks, linting, and tests pass
- [ ] T029 Test end-to-end on mobile device (iOS Safari + Android Chrome): verify camera capture, photo library, bg removal processing, and Realtime updates all work correctly
- [ ] T030 Run quickstart.md validation steps to confirm setup and testing procedures are accurate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Phase 2 completion
  - US1 and US2 are both P1 but US2 depends on US1 (upload flow must exist before Realtime updates matter)
  - US3 depends on US1 (same upload component)
  - US4 depends on US2 (processing indicator component must exist)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 2 — Integrates with US1's upload flow but is independently testable
- **User Story 3 (P2)**: Can start after US1 — Verifies/extends the same input component
- **User Story 4 (P3)**: Can start after US2 — Enhances the processing indicator

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Component creation before integration into pages
- Hook changes before component integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003 and T004 can run in parallel (different files)
- T007 and T008 can run in parallel with T005/T006 (different files)
- T009 and T010 can run in parallel (different test files)
- T014 and T015 can run in parallel (different test files)
- T016 can run in parallel with T014/T015 (different file)
- T025, T026, T027 can all run in parallel (different files/concerns)

---

## Parallel Example: User Story 2

```bash
# Launch tests in parallel:
Task: "Test useWardrobeRealtime hook in lib/hooks/__tests__/use-realtime-wardrobe.test.ts"
Task: "Test ProcessingIndicator component in components/__tests__/processing-indicator.test.tsx"

# Launch component creation in parallel with tests:
Task: "Create ProcessingIndicator in components/processing-indicator.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration, secrets, types)
2. Complete Phase 2: Foundational (Edge Function + Replicate integration, Realtime hook)
3. Complete Phase 3: User Story 1 (mobile camera capture)
4. **STOP and VALIDATE**: Test camera capture on a mobile device
5. Deploy if ready — users can already take photos and get bg removal

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 (Camera Capture) → Test → Deploy (MVP!)
3. Add US2 (Async BG Removal UI) → Test → Deploy (Realtime updates visible)
4. Add US3 (Photo Library) → Test → Deploy (Complete mobile experience)
5. Add US4 (Status Visibility) → Test → Deploy (Polish)
6. Polish phase → Final validation → Ship

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The existing `process-image` Edge Function has a placeholder for bg removal — T005 replaces the placeholder with actual Replicate integration
- The existing `image-upload.tsx` already supports file input — T011 ensures it works optimally on mobile
