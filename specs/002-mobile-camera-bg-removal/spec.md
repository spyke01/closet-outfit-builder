# Feature Specification: Mobile Camera Capture & Background Removal

**Feature Branch**: `002-mobile-camera-bg-removal`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "Allow mobile web users to take photos with their camera or upload from photo library, with async background removal processing for transparent backgrounds"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mobile Camera Capture (Priority: P1)

A mobile web user wants to quickly photograph a clothing item and add it to their wardrobe. They tap the upload area, choose "Take Photo," and their device camera opens. After snapping a photo, the image is uploaded and the user can immediately continue browsing or adding details. Background removal happens asynchronously — the item appears with a placeholder or original image first, then updates to a clean transparent-background version once processing completes.

**Why this priority**: This is the core value proposition — mobile users currently cannot use their camera at all. Camera capture is the most natural way to add wardrobe items on mobile.

**Independent Test**: Can be fully tested by opening the app on a mobile browser, tapping upload, selecting "Take Photo," capturing an image, and verifying it appears in the wardrobe.

**Acceptance Scenarios**:

1. **Given** a user is on the add-item page on a mobile browser, **When** they tap the upload area, **Then** they see options to take a photo or choose from their photo library.
2. **Given** a user selects "Take Photo," **When** the camera opens and they capture an image, **Then** the image is uploaded and a preview is shown immediately.
3. **Given** a user has captured a photo, **When** the upload completes, **Then** the user can continue filling in item details without waiting for background removal.
4. **Given** a user is on a desktop browser, **When** they interact with the upload area, **Then** they see the existing file picker experience (no camera option forced).

---

### User Story 2 - Async Background Removal Processing (Priority: P1)

When any user uploads a wardrobe item image (whether via camera capture, photo library, or file upload), the system automatically removes the background to produce a clean, transparent-background PNG. This processing happens asynchronously so the user is not blocked. The item initially displays with the original image, then seamlessly updates to the processed version once ready.

**Why this priority**: Background removal is essential for visual consistency with the app's built-in item images and for clean outfit composition displays. Async processing is critical to prevent poor user experience from long wait times.

**Independent Test**: Can be tested by uploading any image and verifying that (a) the item is immediately usable with the original image, and (b) the image later updates to a transparent-background version.

**Acceptance Scenarios**:

1. **Given** a user uploads an image, **When** the upload completes, **Then** background removal processing begins automatically without user intervention.
2. **Given** background removal is in progress, **When** the user views their wardrobe or item detail, **Then** they see the original image with a visual indicator that processing is underway.
3. **Given** background removal completes successfully, **When** the user next views the item, **Then** the image displays with a transparent background.
4. **Given** background removal fails, **When** the user views the item, **Then** the original image is retained and the user is not shown an error (graceful degradation).

---

### User Story 3 - Photo Library Selection on Mobile (Priority: P2)

A mobile user wants to add a clothing item photo they already have in their phone's photo library. They tap the upload area, choose "Photo Library," select their image, and it uploads with the same async background removal flow.

**Why this priority**: Complements camera capture for users who already have photos of their items. Lower priority than camera since file upload partially works already, but the mobile-optimized experience (photo library picker) is important.

**Independent Test**: Can be tested by opening the app on a mobile browser, tapping upload, selecting "Photo Library," choosing an image, and verifying it uploads successfully.

**Acceptance Scenarios**:

1. **Given** a user is on mobile and taps the upload area, **When** they select "Photo Library," **Then** the device's native photo picker opens.
2. **Given** a user selects a photo from their library, **When** the image is selected, **Then** it uploads and follows the same processing flow as camera-captured images.

---

### User Story 4 - Processing Status Visibility (Priority: P3)

Users can see which wardrobe items are still being processed and which have completed background removal. This gives confidence that the system is working and sets expectations for when images will be finalized.

**Why this priority**: Nice-to-have transparency feature. The system works without it (items just update silently), but it builds user trust.

**Independent Test**: Can be tested by uploading multiple images and verifying processing status indicators appear and update correctly.

**Acceptance Scenarios**:

1. **Given** a user has items with pending background removal, **When** they view their wardrobe, **Then** those items show a subtle processing indicator.
2. **Given** processing completes for an item, **When** the user is viewing the wardrobe, **Then** the indicator disappears and the image updates without requiring a page refresh.

---

### Edge Cases

- What happens when a user's camera permissions are denied? The system should fall back to file/photo library upload and show a helpful message.
- What happens when the uploaded image has no discernible clothing item (e.g., a blank wall)? Background removal should still complete (removing what it can) and the result is stored — no special error handling needed.
- What happens when the user uploads an image that already has a transparent background? The system should detect this and skip background removal to avoid unnecessary processing.
- What happens if the user deletes a wardrobe item while background removal is still processing? The processing result should be discarded and storage cleaned up.
- What happens on very slow mobile connections? The upload should show progress and be cancellable (existing behavior), and background removal should not be affected since it runs server-side after upload.
- What happens when background removal takes an unusually long time (e.g., service timeout)? The system should have a maximum processing time and fall back to the original image.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present mobile web users with the option to capture a photo using their device camera when adding a wardrobe item.
- **FR-002**: System MUST present mobile web users with the option to select an image from their device photo library when adding a wardrobe item.
- **FR-003**: System MUST automatically initiate background removal processing for every uploaded wardrobe item image.
- **FR-004**: System MUST perform background removal asynchronously — the user MUST NOT be blocked from interacting with the app while processing occurs.
- **FR-005**: System MUST store the original uploaded image immediately and make the wardrobe item available for use before background removal completes.
- **FR-006**: System MUST replace the original image with the processed (background-removed + compressed) version once processing completes successfully, then delete the original from storage.
- **FR-007**: System MUST retain the original image if background removal fails, with no error shown to the user (original becomes the permanent image).
- **FR-008**: System MUST display a visual indicator on wardrobe items that are currently undergoing background removal processing.
- **FR-009**: System MUST update the displayed image without requiring a page refresh when background removal completes, using Supabase Realtime subscriptions on wardrobe item row changes.
- **FR-010**: System MUST support the existing file upload method on desktop browsers alongside the new mobile capture options.
- **FR-011**: System MUST produce a PNG image with transparent background as the output of background removal.
- **FR-012**: System MUST skip background removal for images that already have a transparent background (PNG with alpha channel).
- **FR-013**: System MUST enforce a maximum processing time of 60 seconds for background removal and fall back to the original image if exceeded.
- **FR-014**: System MUST handle camera permission denial gracefully by falling back to file/photo library upload with a user-friendly message.

### Key Entities

- **Wardrobe Item Image**: Represents an image associated with a wardrobe item. Initially stored as the original upload; after processing, replaced with the compressed transparent-background PNG (original is deleted). Tracks processing status (pending, processing, completed, failed).
- **Processing Job** (logical concept, not a separate DB table): Represents the asynchronous background removal + compression pipeline tracked via `bg_removal_status`, `bg_removal_started_at`, and `bg_removal_completed_at` columns on `wardrobe_items`. Steps: upload original → remove background → compress → replace original → delete original. Subject to a maximum processing duration of 60 seconds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mobile users can capture a photo and have it appear in their wardrobe within 10 seconds (excluding background removal processing time).
- **SC-002**: Background removal processing completes for 95% of images within 30 seconds.
- **SC-003**: Users are never blocked from navigating the app while background removal is in progress.
- **SC-004**: 90% of processed images produce a visually clean transparent background suitable for outfit composition.
- **SC-005**: The mobile upload experience (camera or photo library) requires no more than 3 taps from the add-item page to image captured/selected.
- **SC-006**: Failed background removal does not result in any data loss — original images are always preserved.

## Clarifications

### Session 2026-02-14

- Q: Which background removal service/approach should be used? → A: 851-labs/background-remover on Replicate API (~$0.002/image), called from a Supabase Edge Function.
- Q: Where should background removal run given Netlify hosting? → A: Supabase Edge Function calling Replicate API (851-labs/background-remover). Netlify has no Docker support; Supabase Edge Functions handle async orchestration.
- Q: How should the client detect when background removal completes? → A: Supabase Realtime subscription on wardrobe item row changes; image URL update triggers instant client re-render.
- Q: Should the system store both original and processed images? → A: No. Store original temporarily, then remove background, compress, replace original with processed version, and delete the original. Only the final compressed transparent PNG is retained long-term.
- Q: What is the maximum processing timeout for background removal? → A: 60 seconds. Anything beyond that falls back to retaining the original image.

## Assumptions

- Mobile browsers support the HTML media capture attributes needed for camera access (widely supported on iOS Safari and Android Chrome).
- The existing Supabase Edge Function infrastructure can be extended for background removal processing.
- Background removal will be handled by **851-labs/background-remover** via the **Replicate API** (~$0.002/image), invoked from a **Supabase Edge Function** for async processing.
- The existing upload size limit (5MB) and supported formats (JPEG, PNG, WebP) remain appropriate for mobile camera captures.
- Users on mobile are authenticated (existing auth gating applies).
- The existing drag-and-drop upload experience on desktop remains unchanged.
