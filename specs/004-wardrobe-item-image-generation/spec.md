# Feature Specification: Wardrobe Item Image Generation

**Feature Branch**: `004-wardrobe-item-image-generation`
**Created**: 2026-02-15
**Updated**: 2026-02-17
**Status**: Draft
**Input**: User description: "Add wardrobe item image generation using google/imagen-4 from Replicate with usage limits to prevent abuse and support future monetization"

## Clarifications

### Session 2026-02-15

- Q: What visual style should generated wardrobe item images use? → A: Product-style isolated item on clean background, consistent with existing wardrobe item images in public/images
- Q: What are the correct tier names and monthly image generation caps? → A: Per pricing strategy doc - Free/Closet Starter (20/month), Plus/Closet Plus (300/month, $4.99/mo), Pro/Closet Pro (unlimited with fair use, $9.99/mo)
- Q: Does image generation share a quota with AI outfit generation? → A: No, separate. Outfit generation assembles existing items with no external API cost. Image generation calls Replicate API with real per-request cost. Image generation requires its own dedicated quota.
- Q: What are the dedicated image generation caps per tier? → A: Free: 0/month (paid-only feature), Plus: 30/month, Pro: 100/month
- Q: How should image generation be presented to free-tier users? → A: Visible but locked - show "Generate Image" button with lock icon; clicking shows upgrade prompt to Closet Plus or Pro
- Q: What should the hourly burst protection cap be? → A: 5 per hour for all tiers

### Session 2026-02-17

- Q: How should users get wardrobe item images? → A: Three ways: (1) upload their own photo, (2) use a premade image matched during onboarding, or (3) generate one via AI based on item attributes (name, brand, color, category, etc.)
- Q: Should generated images be stored separately or replace the item's image_url? → A: Replace image_url directly. No history/gallery needed. User can regenerate and it overwrites.
- Q: Should we use a separate storage bucket for AI-generated images? → A: No, reuse the existing `wardrobe-images` bucket.
- Q: Where should the Generate Image button appear? → A: On the create/edit screen near the upload photo area, and on the detail view page so users can replace an unsatisfactory image.
- Q: How do outfits display images? → A: Outfits continue to show individual wardrobe item images as they do today. No change to outfit display.
- Q: What happens to the old image file in storage when a new AI image is generated? → A: AI-generated images always overwrite at the same storage path (`{user_id}/generated/{item_id}.webp`). Old uploaded photos at different paths are left as-is.
- Q: What happens if a user triggers a second generation for the same item while one is already in progress? → A: Block the second request with a message like "Generation already in progress for this item" until the first completes or fails.
- Q: Should generated image aspect ratio vary by wardrobe item category? → A: No, use square (1:1) for all categories for consistent grid display and simpler implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate AI Image for a Wardrobe Item (Priority: P1)

A user has added a wardrobe item (e.g., "Navy Oxford Shirt by Brooks Brothers") but doesn't have a photo of it, or wants a cleaner product-style image. They can generate an AI image based on the item's attributes (name, brand, color, category, material, etc.).

**Why this priority**: This is the core value proposition - enabling users to have visual representations of all their wardrobe items without needing to photograph each one, which improves outfit visualization and the overall app experience.

**Independent Test**: Can be fully tested by navigating to a wardrobe item that has no image (or one the user wants to replace), clicking "Generate Image", and receiving a product-style AI-generated image of the item within 30 seconds. Delivers immediate value by filling gaps in the user's visual wardrobe.

**Acceptance Scenarios**:

1. **Given** a user is viewing a wardrobe item with defined attributes (name, category, color), **When** they click "Generate Image", **Then** the system generates an AI image and sets it as the item's image
2. **Given** a wardrobe item image generation is in progress, **When** the generation completes successfully, **Then** the generated image replaces the item's current image_url and is displayed immediately
3. **Given** a user has an existing image for a wardrobe item (uploaded or premade), **When** they click "Generate Image", **Then** the system warns that this will replace their current image and asks for confirmation
4. **Given** a wardrobe item is missing required attributes (no color or category), **When** the user attempts to generate an image, **Then** the system shows which attributes need to be filled in before generation can proceed

---

### User Story 2 - Respect Usage Limits to Prevent Abuse (Priority: P1)

Users can generate wardrobe item images within their account tier's limits, preventing system abuse while supporting future monetization through tiered access.

**Why this priority**: Critical for cost control and business viability. Without this, the feature could incur unsustainable API costs. Must be implemented from day one, not added later.

**Independent Test**: Can be tested independently by attempting to generate images until limits are reached, then verifying that further attempts are blocked with clear messaging about limits and reset times. Delivers value by protecting the business from abuse.

**Acceptance Scenarios**:

1. **Given** a Closet Starter (free) user is viewing a wardrobe item, **When** they see the "Generate Image" button, **Then** it is disabled/locked with a prompt to upgrade to Closet Plus or Pro
2. **Given** a Closet Plus user has not generated any images this month, **When** they check their generation limits, **Then** they see "27 of 30 image generations remaining this month (resets on [date])"
3. **Given** a paid user has reached their monthly image generation limit, **When** they attempt to generate another wardrobe item image, **Then** they see an error message: "Monthly limit reached. Upgrade your plan or wait until [reset date] to generate more images."
4. **Given** a Closet Pro user is viewing their usage, **When** they check their limits, **Then** they see "87 of 100 image generations remaining this month"
5. **Given** it is the first day of a new month, **When** a user checks their limits, **Then** their monthly counter has reset to the full allocation for their tier

---

### User Story 3 - Choose How to Set a Wardrobe Item Image (Priority: P2)

Users can choose between three methods to set an image for their wardrobe item: uploading a photo, using a premade image (during onboarding), or generating one with AI. The AI generation option integrates naturally alongside the existing upload flow.

**Why this priority**: Enhances the image acquisition experience by providing AI generation as an alternative when users don't have a photo. The core upload and onboarding flows already work, so this adds a complementary option.

**Independent Test**: Can be tested by creating or editing a wardrobe item, seeing both "Upload Photo" and "Generate with AI" options near the image area, and successfully using either method to set the item's image.

**Acceptance Scenarios**:

1. **Given** a user is creating or editing a wardrobe item, **When** they view the image section, **Then** they see options to upload a photo or generate an image with AI
2. **Given** a user is on a wardrobe item's detail view, **When** the item has no image or the user wants a different one, **Then** they can click "Generate Image" to create an AI image based on the item's attributes
3. **Given** a user generates an AI image for a wardrobe item, **When** they later upload their own photo, **Then** the uploaded photo replaces the AI-generated image
4. **Given** a user is on a wardrobe item detail page with an onboarding-assigned premade image, **When** they click "Generate Image", **Then** a more detailed AI-generated image replaces the premade one

---

### Edge Cases

- What happens when the AI generation service (Replicate) is down or returns an error?
  - System should show a user-friendly error message, not charge the user's generation quota, and provide a retry option
- What happens when a user's subscription downgrades mid-month and they've already exceeded the new lower limit?
  - User keeps their existing wardrobe item images but cannot generate new ones until the next billing cycle or until usage falls below the new limit
- What happens if a user generates an image but closes the browser before it completes?
  - Generation continues server-side; image is set when complete; user is not charged if generation fails
- What happens when the generated image doesn't match the user's expectations or looks incorrect?
  - User can regenerate without additional quota cost within 5 minutes of the original generation (one free retry per generation)
- What happens when a user rapidly clicks "Generate" multiple times?
  - System debounces requests; duplicate requests within 3 seconds are ignored
- What happens when a wardrobe item has minimal attributes (only category)?
  - System requires at minimum category and color to generate a meaningful image; prompts user to add more detail for better results
- What happens if a user navigates away and triggers generation for the same item while one is already in progress?
  - System blocks the second request with a message like "Generation already in progress for this item" until the first generation completes or fails; prevents race conditions on `image_url` updates
- What happens to old image files when a new AI image is generated?
  - AI-generated images always write to the same deterministic storage path (`{user_id}/generated/{item_id}.webp`), so regeneration overwrites the previous file with no orphaned storage. Previously uploaded photos at different paths are not deleted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate product-style wardrobe item images using the google/imagen-4 model from Replicate, presenting the item on a clean background in a square (1:1) aspect ratio consistent with existing wardrobe imagery
- **FR-002**: System MUST construct prompts for image generation from wardrobe item attributes including: name, category, color, brand, material, and any other available descriptive fields
- **FR-003**: System MUST enforce image generation rate limits per user based on their account tier, tracked as a separate quota from AI outfit generation (which has no external API cost). Image generation caps: Closet Starter/Free (0/month - feature not available), Closet Plus (30/month), Closet Pro (100/month)
- **FR-003a**: System MUST show Closet Starter (free) users the "Generate Image" button in a visible-but-locked state (lock icon), and display an upgrade prompt to Closet Plus or Pro when clicked
- **FR-004**: System MUST track generation usage across time windows: hourly (5 per hour max for all tiers to prevent rapid abuse), and monthly (primary quota per tier: Plus 30/month, Pro 100/month)
- **FR-005**: System MUST display remaining generation quota to users before they initiate generation
- **FR-006**: System MUST prevent generation when any rate limit is exceeded and show clear error messages with reset times
- **FR-007**: System MUST store generated images in the existing `wardrobe-images` Supabase Storage bucket and update the wardrobe item's `image_url` field
- **FR-008**: System MUST include a generation status indicator showing: pending, generating, completed, or failed
- **FR-009**: System MUST validate that a wardrobe item has sufficient data (at minimum: category and color) before allowing generation
- **FR-010**: System MUST log all generation attempts with metadata: user_id, wardrobe_item_id, timestamp, model used, prompt hash, success/failure status, and error details
- **FR-011**: System MUST provide one free regeneration within 5 minutes if the user is unsatisfied with the result
- **FR-012**: System MUST track costs per generation for business analytics and profitability monitoring
- **FR-013**: System MUST gracefully handle API failures from Replicate without charging the user's quota
- **FR-014**: System MUST debounce generation requests to prevent accidental duplicate submissions (3-second window)
- **FR-015**: Users MUST be able to cancel a queued generation before it starts processing
- **FR-016**: System MUST reset monthly limits on the first day of each month
- **FR-017**: System MUST present the "Generate with AI" option alongside the existing photo upload option on the wardrobe item create/edit screen
- **FR-018**: System MUST present a "Generate Image" option on the wardrobe item detail view page
- **FR-019**: System MUST confirm with the user before replacing an existing image (uploaded or premade) with an AI-generated one
- **FR-020**: System MUST reject a generation request if a generation is already in progress for the same wardrobe item, showing a "Generation already in progress" message

### Key Entities *(include if feature involves data)*

- **Generation Log Entry**: Audit trail for all generation attempts. Attributes: id, user_id, wardrobe_item_id, model_used, prompt_text, prompt_hash, status (success/failed/cancelled), error_message, api_response_time_ms, cost_cents, created_at

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a product-style wardrobe item image in under 30 seconds from clicking "Generate" to seeing the completed image
- **SC-002**: 90% of image generation requests complete successfully without errors or timeouts
- **SC-003**: Generation quota tracking prevents 100% of abuse attempts (defined as users trying to exceed rate limits)
- **SC-004**: Users can view their remaining generation quota before initiating a generation, with 95% of users reporting they understood their limits in post-feature surveys
- **SC-005**: System cost per generation is tracked and remains below the target threshold to ensure profitability when monetized (cost should be under 50% of planned pricing per generation)
- **SC-006**: Generated images are visually coherent, recognizable as the described wardrobe item, and stylistically consistent with existing wardrobe imagery in 80% of user satisfaction ratings
- **SC-007**: System handles Replicate API failures gracefully, with zero user quota deductions for failed generations
- **SC-008**: Rate limits are enforced 100% accurately with zero false positives (users incorrectly blocked) or false negatives (users exceeding limits)
- **SC-009**: Image generation serves as an effective upsell driver, with measurable conversion from Closet Starter to paid tiers attributed to the feature (Plus: 30/month, Pro: 100/month)

## Assumptions

- **A-001**: The existing Replicate API integration (used for background removal) is stable and can be reused for image generation with minimal modification
- **A-002**: The google/imagen-4 model on Replicate supports sufficient prompt complexity to generate realistic single-item wardrobe images
- **A-003**: Users understand that AI-generated images are stylized representations, not photographic reproductions of their exact items
- **A-004**: Account tier information is already tracked in the user_preferences or users table
- **A-005**: Supabase Storage has sufficient capacity for generated images (estimated 2-5 MB per image)
- **A-006**: The existing `wardrobe-images` bucket and its RLS policies are sufficient for storing AI-generated images alongside user uploads
- **A-007**: Wardrobe item attributes (name, category, color, brand, material) provide enough detail for meaningful image generation prompts
- **A-008**: Users will primarily generate images from the wardrobe item create/edit screen and detail view page
- **A-009**: Cost per generation via Replicate's google/imagen-4 is predictable and documented
- **A-010**: The feature will launch with dedicated image generation caps (Free: 0, Plus: 30/mo, Pro: 100/mo) separate from AI outfit generation limits, and adjust based on usage data and cost analysis per 30-day review cycle

## Dependencies

- **D-001**: Replicate API integration must be functional and configured with valid API credentials
- **D-002**: Existing `wardrobe-images` Supabase Storage bucket must be operational with appropriate RLS policies
- **D-003**: Account tier/subscription system must be in place to differentiate user limits (or default all users to free tier initially)
- **D-004**: Wardrobe item data must include sufficient detail (at minimum category and color) to construct meaningful prompts

## Out of Scope

- **OS-001**: Editing or customizing generated images within the app (users can upload a different photo if unsatisfied)
- **OS-002**: Generating composite images of complete outfits (outfits display individual wardrobe item images as they do today)
- **OS-003**: Real-time collaboration or sharing of generated images with other users
- **OS-004**: Integration with social media platforms for direct posting
- **OS-005**: Payment processing or subscription management for tier upgrades (assuming this exists elsewhere or is a future feature)
- **OS-006**: A/B testing different AI models or prompt strategies (will use google/imagen-4 exclusively for v1)
- **OS-007**: Bulk generation of images for multiple wardrobe items at once
- **OS-008**: Custom prompt input from users (prompts are auto-generated from wardrobe item data only)
- **OS-009**: Image generation history or gallery (generated image simply replaces the item's current image)
