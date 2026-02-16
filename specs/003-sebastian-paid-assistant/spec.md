# Feature Specification: Sebastian Paid AI Assistant (Chat + Vision)

**Feature Branch**: `003-sebastian-paid-assistant`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Scope a paid feature where users chat with Sebastian via Replicate, including styling Q&A, wardrobe-aware recommendations, and outfit photo feedback; include cost/functionality tradeoffs plus guardrails in Supabase + Netlify stack"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Paid User Can Chat with Sebastian for General Styling Advice (Priority: P1)

A paid user opens Sebastian chat and asks broad styling questions (for example, "what shoes work with cream chinos?"). Sebastian responds with useful, concise styling guidance in the app.

**Why this priority**: This is the foundational value proposition for the paid assistant. Without reliable base chat, personalized and image features are not useful.

**Independent Test**: As a paid user, send a text-only prompt and receive a successful response within target latency.

**Acceptance Scenarios**:

1. **Given** an authenticated paid user, **When** they submit a text message to Sebastian, **Then** the system returns a style-focused assistant response.
2. **Given** an authenticated free-tier user, **When** they submit a message to Sebastian, **Then** the system returns a paid-feature gating response with upgrade context.
3. **Given** the model provider is temporarily unavailable, **When** a paid user submits a message, **Then** the system returns a safe fallback error without exposing provider internals.

---

### User Story 2 - Sebastian Recommends Outfits from User Wardrobe Data (Priority: P1)

A paid user asks what items in their own wardrobe work with a specific piece. Sebastian retrieves relevant wardrobe and outfit context and recommends combinations based on that user's data.

**Why this priority**: Personalized recommendations are the strongest paid differentiator versus generic style chat.

**Independent Test**: Seed a user's wardrobe with known items, ask for pairings with an anchor item, and verify recommendations only reference that user's items.

**Acceptance Scenarios**:

1. **Given** a paid user with wardrobe data, **When** they ask for suggestions with a specific item, **Then** Sebastian references compatible items from that same user's wardrobe.
2. **Given** a paid user has no relevant wardrobe items, **When** they ask for pairing suggestions, **Then** Sebastian responds with a graceful fallback and asks clarifying questions.
3. **Given** two users with different wardrobes, **When** each asks similar prompts, **Then** each response references only the requesting user's data.

---

### User Story 3 - Paid User Uploads Outfit Photo and Gets Feedback (Priority: P1)

A paid user uploads an outfit photo and receives constructive, safe feedback plus suggestions for improving the look using wardrobe items they own.

**Why this priority**: Image feedback is a premium capability users explicitly requested and justifies paid plan value.

**Independent Test**: Paid user submits image + text prompt and receives feedback response with no policy violations.

**Acceptance Scenarios**:

1. **Given** a paid user uploads an image with a style question, **When** Sebastian processes the request, **Then** the system returns outfit feedback and suggested improvements.
2. **Given** an image fails validation or safety checks, **When** user submits it, **Then** the system returns a clear rejection with allowed next steps.
3. **Given** model/image processing fails, **When** user submits the request, **Then** the system fails gracefully and does not lose the active thread context.

---

### User Story 4 - Sebastian Uses Calendar and Trip Context for Planning (Priority: P2)

A paid user asks what to wear for upcoming events or trips. Sebastian uses calendar entries and trip records to make context-aware recommendations.

**Why this priority**: This extends personalization depth and aligns with existing calendar/trip product areas.

**Independent Test**: Create a future event and trip, ask Sebastian for planning recommendations, verify response includes event/trip-aware suggestions.

**Acceptance Scenarios**:

1. **Given** a paid user has upcoming calendar entries, **When** they ask "what should I wear this week?", **Then** Sebastian includes event-aware guidance.
2. **Given** a paid user has trip data, **When** they ask for packing help, **Then** Sebastian includes destination/date-aware suggestions.
3. **Given** no calendar/trip data exists, **When** user asks planning questions, **Then** Sebastian asks for missing context and still provides general guidance.

---

### Edge Cases

- User submits prompt injection text attempting to override Sebastian system instructions.
- User submits unsafe or disallowed image content.
- User exceeds monthly quota or hourly burst limit.
- User asks for medical/legal advice, body-shaming content, or disallowed unsafe guidance.
- Provider timeout or 5xx occurs after context is assembled.
- User attempts to access another user's thread ID via direct API call.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide Sebastian chat only to authenticated users on paid plans (`plus`, `pro`).
- **FR-002**: System MUST reject free-tier Sebastian requests with a clear paid-feature response.
- **FR-003**: System MUST support text-only Sebastian prompts.
- **FR-004**: System MUST support image + text prompts for outfit feedback.
- **FR-005**: System MUST build user-scoped context from wardrobe items and outfits for personalization.
- **FR-006**: System MUST support optional calendar/trip context retrieval for planning prompts.
- **FR-007**: System MUST enforce monthly usage limits for Sebastian requests by plan.
- **FR-008**: System MUST enforce hourly burst limits for Sebastian requests by plan.
- **FR-009**: System MUST persist chat threads and messages for authenticated users.
- **FR-010**: System MUST apply pre-request safety checks for user prompts and images.
- **FR-011**: System MUST apply post-response safety checks before returning assistant output.
- **FR-012**: System MUST prevent assistant/tool access to data outside the requesting user's scope.
- **FR-013**: System MUST return stable normalized error codes for quota, auth, safety, and upstream failures.
- **FR-014**: System MUST redact sensitive tokens/PII from assistant observability logs.
- **FR-015**: System MUST support model routing policy by plan and fallback model on provider failure.
- **FR-016**: System MUST enforce request timeout budget and fail gracefully when exceeded.
- **FR-017**: System MUST provide policy-safe refusal responses for disallowed requests.
- **FR-018**: System MUST store image references (URLs/paths) for chat context but MUST NOT store raw image bytes in chat message rows.
- **FR-019**: System MUST apply a consistent Sebastian persona (tone, response structure, and refusal style) defined in `docs/sebastian-personality.md`.

### Key Entities

- **Assistant Thread**: User-owned conversation container with metadata (title, timestamps).
- **Assistant Message**: User or assistant message bound to a thread, with role, content, and metadata.
- **Assistant Inference Event**: Auditable record of each model call, including model, latency, token usage, cost estimate, and safety flags.
- **Context Pack**: Request-scoped payload derived from user-owned wardrobe, outfit, calendar, and trip data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of paid text-only assistant requests complete successfully (2xx) within 6 seconds p95.
- **SC-002**: 95% of paid image-feedback assistant requests complete successfully within 12 seconds p95.
- **SC-003**: 100% of free-tier requests to Sebastian endpoints are denied with paid-gating response.
- **SC-004**: 0 confirmed incidents of cross-user data exposure from Sebastian endpoints.
- **SC-005**: 100% of requests over quota return deterministic `USAGE_LIMIT_EXCEEDED` or `BURST_LIMIT_EXCEEDED` errors.
- **SC-006**: 100% of blocked safety cases return policy-safe responses (no unsafe output leakage).

## Clarifications

### Session 2026-02-16

- Q: Can Sebastian tie recommendations to user wardrobe/outfits/calendar/trips data? → A: Yes, via user-scoped context retrieval and tool/function contract.
- Q: Which model strategy should we use first on Replicate? → A: Start with `openai/gpt-5-mini`, fallback to `openai/gpt-4o-mini`, optional premium path to `anthropic/claude-4.5-sonnet`.
- Q: Should this be paid-only at launch? → A: Yes, gate to paid plans using existing entitlements and quota counters.
- Q: Which stack should implement guardrails? → A: Next.js API routes + Supabase RLS/Storage + Netlify env/CSP controls.
- Q: How should Sebastian's behavior align to brand/image? → A: Use the style contract in `docs/sebastian-personality.md` (calm, refined, recommendation-first, respectful refusals).

## Assumptions

- Existing `user_subscriptions`, `usage_counters`, and entitlement logic remain the source of truth for plan gating.
- Current Supabase auth + RLS architecture is retained and extended for assistant tables.
- Replicate is called server-side only (never directly from client).
- Existing wardrobe/calendar/trip schemas are sufficiently complete for V1 context assembly.
- Production logging infrastructure can accept additional assistant event payloads with redaction.
