# Feature Specification: Outfit Image Generation

**Feature Branch**: `003-outfit-image-generation`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "Add outfit image generation to the UI using google/imagen-4 from Replicate with usage limits to prevent abuse and support future monetization"

## Clarifications

### Session 2026-02-15

- Q: What visual composition style should generated outfit images use? → A: Flat lay - items arranged on a surface, bird's-eye view, consistent with existing wardrobe item images in public/images
- Q: What are the correct tier names and monthly image generation caps? → A: Per pricing strategy doc - Free/Closet Starter (20/month), Plus/Closet Plus (300/month, $4.99/mo), Pro/Closet Pro (unlimited with fair use, $9.99/mo)
- Q: Does image generation share a quota with AI outfit generation? → A: No, separate. Outfit generation assembles existing items with no external API cost. Image generation calls Replicate API with real per-request cost. Image generation requires its own dedicated quota.
- Q: What are the dedicated image generation caps per tier? → A: Free: 0/month (paid-only feature), Plus: 30/month, Pro: 100/month
- Q: How should image generation be presented to free-tier users? → A: Visible but locked - show "Generate Image" button with lock icon; clicking shows upgrade prompt to Closet Plus or Pro
- Q: What should the hourly burst protection cap be? → A: 5 per hour for all tiers

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Visual Preview of Outfit (Priority: P1)

A user has created or selected an outfit and wants to see a realistic visual representation of how the complete outfit would look together, even if they don't have high-quality photos of individual items or the items photographed together.

**Why this priority**: This is the core value proposition - enabling users to visualize their outfits before wearing them, which is the primary use case that justifies the feature's existence and cost.

**Independent Test**: Can be fully tested by selecting an existing outfit, clicking a "Generate Image" button, and receiving a photorealistic AI-generated image of the complete outfit within 30 seconds. Delivers immediate value by helping users make confident outfit decisions.

**Acceptance Scenarios**:

1. **Given** a user is viewing a saved outfit with defined items, **When** they click "Generate Outfit Image", **Then** the system queues the generation request and displays a progress indicator
2. **Given** an outfit image generation is in progress, **When** the generation completes successfully, **Then** the generated image appears in the outfit view with options to download or regenerate
3. **Given** a user has generated an image for an outfit, **When** they modify the outfit items, **Then** the previous generated image is marked as outdated with an option to regenerate
4. **Given** an outfit contains items with incomplete descriptions (missing color, category, or type), **When** the user attempts to generate an image, **Then** the system shows which items need more detail before generation can proceed

---

### User Story 2 - Respect Usage Limits to Prevent Abuse (Priority: P1)

Users can generate outfit images within their account tier's limits, preventing system abuse while supporting future monetization through tiered access.

**Why this priority**: Critical for cost control and business viability. Without this, the feature could incur unsustainable API costs. Must be implemented from day one, not added later.

**Independent Test**: Can be tested independently by attempting to generate images until limits are reached, then verifying that further attempts are blocked with clear messaging about limits and reset times. Delivers value by protecting the business from abuse.

**Acceptance Scenarios**:

1. **Given** a Closet Starter (free) user is viewing an outfit, **When** they see the "Generate Image" button, **Then** it is disabled/locked with a prompt to upgrade to Closet Plus or Pro
2. **Given** a Closet Plus user has not generated any images this month, **When** they check their generation limits, **Then** they see "27 of 30 image generations remaining this month (resets on [date])"
3. **Given** a paid user has reached their monthly image generation limit, **When** they attempt to generate another outfit image, **Then** they see an error message: "Monthly limit reached. Upgrade your plan or wait until [reset date] to generate more images."
4. **Given** a Closet Pro user is viewing their usage, **When** they check their limits, **Then** they see "87 of 100 image generations remaining this month"
5. **Given** it is the first day of a new month, **When** a user checks their limits, **Then** their monthly counter has reset to the full allocation for their tier

---

### User Story 3 - View Generation History and Manage Images (Priority: P2)

Users can view all previously generated outfit images, reuse them, download them, or delete them to free up storage or remove unwanted variations.

**Why this priority**: Enhances user experience by providing access to past generations, but the core value (generating images) works without this. Can be added after P1 stories are stable.

**Independent Test**: Can be tested by navigating to a "Generated Images" section, seeing thumbnails of all past generations with metadata (outfit name, generation date), and performing actions like download, delete, or set as outfit thumbnail.

**Acceptance Scenarios**:

1. **Given** a user has generated outfit images in the past, **When** they navigate to their outfit's detail page, **Then** they see a gallery of all generated images for that outfit with timestamps
2. **Given** a user is viewing their generation history, **When** they click on a generated image, **Then** they can download it, delete it, or set it as the outfit's primary thumbnail
3. **Given** a user deletes a generated image, **When** the deletion completes, **Then** it no longer appears in their history and does not count toward storage limits
4. **Given** a user has multiple generated images for one outfit, **When** they select one as the primary image, **Then** it displays prominently on the outfit card and in the outfit list view

---

### Edge Cases

- What happens when the AI generation service (Replicate) is down or returns an error?
  - System should show a user-friendly error message, not charge the user's generation quota, and provide a retry option
- What happens when a user's subscription downgrades mid-month and they've already exceeded the new lower limit?
  - User keeps access to already-generated images but cannot generate new ones until the next billing cycle or until usage falls below the new limit
- What happens when an outfit has conflicting or impossible item combinations (e.g., "red and blue striped shirt" + "green and yellow plaid shirt" both as tops)?
  - System should detect impossible combinations and prompt user to review outfit items before generation
- What happens if a user generates an image but closes the browser before it completes?
  - Generation continues server-side; image appears in history when complete; user is not charged if they explicitly cancel
- What happens when the generated image doesn't match the user's expectations or looks incorrect?
  - User can regenerate without additional quota cost within 5 minutes of the original generation (one free retry per generation)
- What happens when a user rapidly clicks "Generate" multiple times?
  - System debounces requests and only queues one generation at a time per outfit; duplicate requests within 3 seconds are ignored

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate flat-lay style outfit images using the google/imagen-4 model from Replicate, presenting all outfit items arranged on a surface in a bird's-eye view consistent with existing wardrobe imagery
- **FR-002**: System MUST construct prompts for outfit generation following the same detailed structure used in the wardrobe item generator (sections for garment requirements, background, style, brand handling, and output specifications), adapted for multi-item flat-lay composition
- **FR-003**: System MUST enforce image generation rate limits per user based on their account tier, tracked as a separate quota from AI outfit generation (which has no external API cost). Image generation caps: Closet Starter/Free (0/month - feature not available), Closet Plus (30/month), Closet Pro (100/month)
- **FR-003a**: System MUST show Closet Starter (free) users the "Generate Image" button in a visible-but-locked state (lock icon), and display an upgrade prompt to Closet Plus or Pro when clicked
- **FR-004**: System MUST track generation usage across time windows: hourly (5 per hour max for all tiers to prevent rapid abuse), and monthly (primary quota per tier: Plus 30/month, Pro 100/month)
- **FR-005**: System MUST display remaining generation quota to users before they initiate generation
- **FR-006**: System MUST prevent generation when any rate limit is exceeded and show clear error messages with reset times
- **FR-007**: System MUST store generated images in Supabase Storage with references to the outfit record that was used for generation
- **FR-008**: System MUST include a generation queue status indicator showing: pending, generating, completed, or failed
- **FR-009**: System MUST construct prompts from outfit data including all item descriptions, colors, categories, styles, and formality levels
- **FR-010**: System MUST validate that an outfit has sufficient item data (at minimum: category and color for each item) before allowing generation
- **FR-011**: System MUST log all generation attempts with metadata: user_id, outfit_id, timestamp, model used, prompt hash, success/failure status, and error details
- **FR-012**: System MUST allow users to view a history of all generated images for each outfit
- **FR-013**: System MUST provide download functionality for generated images in standard web formats (WebP, JPEG, or PNG)
- **FR-014**: System MUST allow users to set a generated image as the primary thumbnail for an outfit
- **FR-015**: System MUST provide one free regeneration within 5 minutes if the user is unsatisfied with the result
- **FR-016**: System MUST track costs per generation for business analytics and profitability monitoring
- **FR-017**: System MUST gracefully handle API failures from Replicate without charging the user's quota
- **FR-018**: System MUST debounce generation requests to prevent accidental duplicate submissions (3-second window)
- **FR-019**: Users MUST be able to cancel a queued generation before it starts processing
- **FR-020**: System MUST reset monthly limits on the first day of each month

### Key Entities *(include if feature involves data)*

- **Generated Outfit Image**: Represents a single AI-generated image of an outfit. Attributes: id, outfit_id, user_id, image_url (Supabase Storage path), storage_path, status (pending, generating, completed, failed, cancelled), is_primary, prompt_text, prompt_hash, model_version, generation_duration_ms, cost_cents, error_message, retry_of, retry_expires_at, created_at, updated_at
- **Generation Quota Tracker**: Tracks usage against limits for each user. Attributes: id, user_id, monthly_count, monthly_reset_at, hourly_timestamps (JSONB array of recent generation timestamps for burst protection), created_at, updated_at. Note: account tier is determined from user profile/subscription at query time, not stored in this table
- **Generation Log Entry**: Audit trail for all generation attempts. Attributes: id, user_id, outfit_id, generated_image_id (nullable if failed), model_used, prompt_text, prompt_hash, status, error_message, api_response_time_ms, cost_cents, created_at

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a photorealistic outfit image in under 30 seconds from clicking "Generate" to seeing the completed image
- **SC-002**: 90% of image generation requests complete successfully without errors or timeouts
- **SC-003**: Generation quota tracking prevents 100% of abuse attempts (defined as users trying to exceed rate limits)
- **SC-004**: Users can view their remaining generation quota before initiating a generation, with 95% of users reporting they understood their limits in post-feature surveys
- **SC-005**: System cost per generation is tracked and remains below the target threshold to ensure profitability when monetized (cost should be under 50% of planned pricing per generation)
- **SC-006**: Generated flat-lay images are visually coherent, recognizable as the selected outfit items, and stylistically consistent with existing wardrobe imagery in 80% of user satisfaction ratings
- **SC-007**: System handles Replicate API failures gracefully, with zero user quota deductions for failed generations
- **SC-008**: Users can download generated images in under 3 seconds
- **SC-009**: Rate limits are enforced 100% accurately with zero false positives (users incorrectly blocked) or false negatives (users exceeding limits)
- **SC-010**: Image generation serves as an effective upsell driver, with measurable conversion from Closet Starter to paid tiers attributed to the feature (Plus: 30/month, Pro: 100/month)

## Assumptions

- **A-001**: The existing Replicate API integration (used for background removal) is stable and can be reused for image generation with minimal modification
- **A-002**: The google/imagen-4 model on Replicate supports sufficient prompt complexity to generate multi-item outfit compositions
- **A-003**: Users understand that AI-generated images are stylized representations, not photographic reproductions of their exact items
- **A-004**: Account tier information is already tracked in the user_preferences or users table
- **A-005**: Supabase Storage has sufficient capacity for generated images (estimated 2-5 MB per image)
- **A-006**: Generated images will be stored indefinitely unless users explicitly delete them
- **A-007**: The existing prompting structure from the wardrobe item generator produces good results for complete outfit compositions (may need refinement during implementation)
- **A-008**: Users will primarily generate images from the outfit detail page, with secondary access from the outfit list view
- **A-009**: Cost per generation via Replicate's google/imagen-4 is predictable and documented
- **A-010**: The feature will launch with dedicated image generation caps (Free: 0, Plus: 30/mo, Pro: 100/mo) separate from AI outfit generation limits, and adjust based on usage data and cost analysis per 30-day review cycle

## Dependencies

- **D-001**: Replicate API integration must be functional and configured with valid API credentials
- **D-002**: Supabase Storage bucket for generated images must exist with appropriate RLS policies
- **D-003**: Account tier/subscription system must be in place to differentiate user limits (or default all users to free tier initially)
- **D-004**: Outfit data must include sufficient detail (category, color, item type) to construct meaningful prompts

## Out of Scope

- **OS-001**: Editing or customizing generated images within the app (users can download and edit externally)
- **OS-002**: Generating images of individual wardrobe items (only complete outfits are supported)
- **OS-003**: Real-time collaboration or sharing of generated images with other users
- **OS-004**: Integration with social media platforms for direct posting
- **OS-005**: Payment processing or subscription management for tier upgrades (assuming this exists elsewhere or is a future feature)
- **OS-006**: A/B testing different AI models or prompt strategies (will use google/imagen-4 exclusively for v1)
- **OS-007**: Bulk generation of images for multiple outfits at once
- **OS-008**: Custom prompt input from users (prompts are auto-generated from outfit data only)
