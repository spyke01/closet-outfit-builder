# Research: Sebastian Paid AI Assistant (Chat + Vision)

## Decision 1: Primary Model Routing on Replicate

**Decision**: Use `openai/gpt-5-mini` as default, `openai/gpt-4o-mini` as budget fallback, and optional `anthropic/claude-4.5-sonnet` for premium routing.

**Rationale**: `gpt-5-mini` gives the best quality/cost balance for mixed styling + context-heavy reasoning. `gpt-4o-mini` provides lower-cost resilience for fallback and lower tiers. `claude-4.5-sonnet` remains optional for highest-quality reasoning on premium scenarios.

**Alternatives considered**:
- Single-model-only architecture: simpler but weaker resilience on outages/cost spikes
- Open-source community-only models: lower direct cost but higher variability and operational risk

## Decision 2: Next.js API Route as Orchestrator (Not direct client -> Replicate)

**Decision**: All assistant inference calls run through server-side Next.js routes.

**Rationale**: This preserves provider secret management, lets us enforce entitlements and usage counters atomically, and centralizes moderation + audit logic.

**Alternatives considered**:
- Client-side direct provider calls: rejected for security and quota enforcement risk
- Supabase Edge Function as main orchestrator: viable, but current codebase patterns for billing/AI gating are already in Next.js routes

## Decision 3: Context Retrieval Strategy

**Decision**: Build a bounded "context pack" per request using strict selects from existing tables (`wardrobe_items`, `outfits`, `calendar_entries`, `trips`, `trip_days`, `trip_pack_items`).

**Rationale**: Minimal, bounded context reduces token cost and privacy risk while preserving personalization quality.

**Alternatives considered**:
- Send full user data each turn: expensive and unnecessary
- No personalization in V1: would undercut paid value proposition

## Decision 4: Guardrail Pipeline Placement

**Decision**: Apply moderation checks both before provider call (input safety) and after provider response (output safety), plus tool-call allowlisting.

**Rationale**: Layered controls prevent avoidable unsafe calls and block unsafe output leakage.

**Alternatives considered**:
- Output-only safety checks: misses abusive inputs and wasteful provider spend
- Prompt-only guardrails without runtime checks: insufficient for safety/compliance

## Decision 5: Assistant Data Persistence and Retention

**Decision**: Persist threads/messages/events in Supabase with user ownership and metadata redaction; store only image references in chat records.

**Rationale**: Retains product value (history/context) while reducing privacy exposure and storage bloat.

**Alternatives considered**:
- Stateless chat only: simplest, but weak UX and no thread continuity
- Full raw payload retention: rejected due to privacy/security risks

## Decision 6: Usage Metering and Entitlements Integration

**Decision**: Reuse `usage_counters` with new assistant-specific metric keys and enforce monthly + hourly limits via existing entitlement flow.

**Rationale**: Avoids parallel billing systems and keeps policy consistent with current AI image generation controls.

**Alternatives considered**:
- New dedicated usage table for assistant only: unnecessary duplication
- No hourly burst limit: increases abuse/cost volatility risk
