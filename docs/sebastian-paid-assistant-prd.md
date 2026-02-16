# Product Requirements Document: Sebastian Paid AI Assistant

**Owner**: Product + Engineering  
**Status**: Draft  
**Created**: 2026-02-16  
**Last Updated**: 2026-02-16

## 1. Overview

Sebastian is a paid AI assistant for My AI Outfit users. Sebastian will support:

1. General styling Q&A
2. Personalized recommendations based on the user's wardrobe and outfits
3. Outfit photo feedback (image + text guidance)

This PRD defines product scope, model strategy via Replicate, and guardrails implemented in the current Supabase + Netlify stack.

## 2. Goals and Non-Goals

### Goals

- Launch a paid-only AI assistant that uses user-specific context safely.
- Reuse existing billing/entitlement infrastructure (`user_subscriptions`, `usage_counters`, `resolveUserEntitlements`).
- Support text and image inputs with clear safety boundaries.
- Keep architecture incremental to current Next.js + Supabase + Netlify deployment.

### Non-Goals (V1)

- Real-time voice chat
- Cross-user social recommendations
- Fully autonomous wardrobe edits/writes without user confirmation
- Medical, mental health, or legal advice features

## 3. User Stories

### Story 1: General Styling Chat (P1)

As a paid user, I ask Sebastian style questions and get practical, brand-appropriate answers.

### Story 2: Personalized Closet Guidance (P1)

As a paid user, I ask "what goes with this item?" and Sebastian uses my wardrobe/outfit data to suggest combinations.

### Story 3: Outfit Photo Feedback (P1)

As a paid user, I upload an outfit photo and Sebastian gives constructive style feedback plus suggested alternatives from my closet.

### Story 4: Calendar/Trip-Aware Recommendations (P2)

As a paid user, I ask what to wear for an event/trip and Sebastian uses upcoming calendar and trip context.

## 4. Functional Requirements

- FR-001: System must gate Sebastian features to paid plans (`plus`, `pro`) via existing entitlements.
- FR-002: System must support text-only chat requests.
- FR-003: System must support image + text requests for outfit feedback.
- FR-004: System must fetch user-scoped context from wardrobe, outfits, calendar, and trips.
- FR-005: System must not expose data from other users.
- FR-006: System must enforce monthly and hourly AI usage limits.
- FR-007: System must provide safe fallback responses when model/provider errors occur.
- FR-008: System must log assistant requests for quality/safety auditing with sensitive fields redacted.

## 5. Success Criteria

- SC-001: >= 95% of paid users receive a successful assistant response (< 6s p95 text).
- SC-002: < 1% of assistant responses are blocked by post-response safety checks (indicates prompt quality + routing fit).
- SC-003: 0 confirmed cross-user data leaks.
- SC-004: 100% of non-paid users are blocked with upgrade CTA for assistant endpoints.
- SC-005: Photo feedback requests complete within 12s p95.

## 6. Model Strategy (Replicate)

### V1 Routing

- Default text+image model: `openai/gpt-5-mini`
- Budget fallback: `openai/gpt-4o-mini`
- Premium reasoning fallback (optional): `anthropic/claude-4.5-sonnet`

### Cost/Quality Tradeoff (for product planning)

- `gpt-4o-mini`: lowest cost, good baseline
- `gpt-5-mini`: better quality per request, moderate cost
- `claude-4.5-sonnet`: best nuanced reasoning, highest cost

### Model Routing Policy

- `plus`: `gpt-4o-mini` default, escalate to `gpt-5-mini` when complexity is high.
- `pro`: `gpt-5-mini` default, optional premium escalation to `claude-4.5-sonnet`.
- Hard per-request output token caps by plan.

## 7. Proposed Architecture (Current Stack)

### 7.1 API Layer (Next.js Route Handlers)

Add:

- `app/api/assistant/chat/route.ts` (text + optional image URL)
- `app/api/assistant/threads/[id]/route.ts` (history retrieval, optional)

Follow existing patterns from:

- `app/api/ai/generate-image/route.ts` (entitlements + usage checks)
- `app/api/upload-image/route.ts` (file validation + auth)

### 7.2 Context Builder Service

Add:

- `lib/services/assistant/context-builder.ts`

Responsibilities:

- Build minimal context pack for a request.
- Read only user-owned records (RLS-backed) from:
  - `wardrobe_items`
  - `outfits`
  - `calendar_entries`
  - `trips`, `trip_days`, `trip_pack_items`
- Limit payload size (top N relevant items/events/trips).

### 7.3 Provider Adapter

Add:

- `lib/services/assistant/providers/replicate.ts`

Responsibilities:

- Centralize Replicate API calls and model routing.
- Retry policy for transient errors.
- Standard response shape for UI.

### 7.4 Data Model Additions (Supabase)

Add migrations for:

- `assistant_threads`
  - `id`, `user_id`, `title`, `created_at`, `updated_at`
- `assistant_messages`
  - `id`, `thread_id`, `user_id`, `role` (`user|assistant|system`), `content`, `metadata_json`, `created_at`
- `assistant_inference_events`
  - `id`, `user_id`, `thread_id`, `model`, `latency_ms`, `status`, `input_tokens`, `output_tokens`, `cost_estimate_usd`, `safety_flags_json`, `created_at`

RLS:

- Same ownership pattern as existing calendar/trip tables: `auth.uid() = user_id` or thread-owner join checks.

### 7.5 Usage Limits

Reuse `usage_counters` with new metrics:

- `ai_stylist_messages` (monthly)
- `ai_stylist_vision_messages` (monthly)
- `ai_stylist_requests_hourly` (hourly burst)

Integrate with existing helpers in:

- `lib/services/billing/entitlements.ts`
- `lib/services/billing/plans.ts`

### 7.6 Netlify + Runtime Configuration

Set in Netlify env:

- `REPLICATE_API_TOKEN`
- `REPLICATE_DEFAULT_MODEL`
- `REPLICATE_FALLBACK_MODEL`

Update `netlify.toml` CSP `connect-src` to allow Replicate API domain.

## 8. Guardrails and Implementation

### 8.1 Access and Authorization Guardrails

- Enforce auth on all assistant endpoints via Supabase server client.
- Enforce paid entitlement before model call.
- Depend on RLS for table reads; never bypass with service role in user-facing chat path.

Implementation:

- Same auth pattern as `/app/api/ai/generate-image/route.ts`.
- Same RLS policy style used in calendar/trip migrations.

### 8.2 Data Minimization Guardrails

- Build context pack with only required fields (`id`, `name`, `color`, `category`, `season`, dates, destination).
- Do not send raw internal metadata or unrelated user profile data.
- Clip historical context to bounded windows (e.g., next 14 days events, top 50 relevant items).

Implementation:

- Context builder applies strict selects and limits before provider call.

### 8.3 Prompt Injection and Tool-Use Guardrails

- Use fixed system prompt for Sebastian behavior.
- Do not allow model to execute arbitrary tools.
- Tool/action allowlist only:
  - `get_wardrobe_items`
  - `get_recent_outfits`
  - `get_calendar_window`
  - `get_trip_context`
- Reject model-requested actions outside allowlist.

Implementation:

- Route handler validates tool calls against local enum before executing.

### 8.4 Content Safety Guardrails

- Input checks:
  - profanity/abuse classifier
  - image safety screen for nudity/graphic content
- Output checks:
  - block disallowed content categories
  - refuse medical/legal instructions
  - avoid body-shaming language

Implementation:

- Pre-model moderation step and post-model moderation step in `assistant/chat` route.
- Return policy-safe refusal templates with actionable alternatives.

### 8.5 Privacy and Retention Guardrails

- Do not store raw image bytes in chat tables.
- Store uploaded image in Supabase Storage with user-scoped path and short retention for inference copies.
- Redact PII/secrets in logs.

Implementation:

- Reuse file validation approach from `/app/api/upload-image/route.ts`.
- Add scheduled cleanup job (Netlify Scheduled Function or Supabase scheduled task) for inference-temp images.

### 8.6 Rate Limit and Abuse Guardrails

- Enforce plan monthly quotas + hourly burst.
- Add per-IP soft limit on assistant endpoint (defense-in-depth).
- Deduplicate repeated identical prompts within short window to reduce abuse cost.

Implementation:

- Reuse `usage_counters` logic and hour-key pattern from image AI route.

### 8.7 Operational Guardrails

- Circuit breaker: disable premium model if error rate exceeds threshold; auto-fallback.
- Timeouts: hard timeout per request (e.g., 20s end-to-end).
- Safe failure responses without leaking upstream payloads.

Implementation:

- Provider adapter returns normalized error codes (`UPSTREAM_TIMEOUT`, `UPSTREAM_5XX`, `SAFETY_BLOCKED`).

## 9. API Contract (V1)

### POST `/api/assistant/chat`

Request:

```json
{
  "threadId": "optional-uuid",
  "message": "What should I wear with my navy blazer?",
  "imageUrl": "optional-supabase-storage-url",
  "contextHints": {
    "focusItemId": "optional-wardrobe-item-id",
    "eventDate": "optional-YYYY-MM-DD",
    "tripId": "optional-trip-id"
  }
}
```

Response:

```json
{
  "threadId": "uuid",
  "assistantMessage": "Response text...",
  "citations": [
    { "type": "wardrobe_item", "id": "uuid" },
    { "type": "trip", "id": "uuid" }
  ],
  "usage": {
    "model": "openai/gpt-5-mini",
    "inputTokens": 1200,
    "outputTokens": 320
  },
  "safety": {
    "blocked": false,
    "flags": []
  }
}
```

## 10. Rollout Plan

### Phase 1 (Internal)

- Text chat only
- Paid gating + quotas
- Logging + safety checks

### Phase 2 (Beta Paid Users)

- Add outfit photo feedback
- Add trip/calendar context pack
- Add model routing by plan

### Phase 3 (GA)

- Full observability dashboard
- Quality scoring loop and prompt improvements
- Optional premium reasoning route for Pro

## 11. Open Questions

- Should Free users get a limited teaser (e.g., 3 messages/month), or strict paid-only from day one?
- Should image feedback be `plus` only or `plus/pro` with different monthly caps?
- Do we want assistant chat history export/deletion controls in Settings at launch?

## 12. Engineering Checklist

- [ ] Add assistant API route handlers
- [ ] Add provider adapter for Replicate
- [ ] Add context builder service
- [ ] Add Supabase migrations + RLS for assistant tables
- [ ] Extend billing plan limits/features for stylist metrics
- [ ] Update usage counter enforcement paths
- [ ] Add moderation pipeline (pre and post)
- [ ] Add storage retention cleanup job for inference images
- [ ] Add monitoring metrics and alert thresholds
- [ ] Add CSP update for Replicate domain in `netlify.toml`
