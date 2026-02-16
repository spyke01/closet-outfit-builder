# Implementation Plan: Sebastian Paid AI Assistant (Chat + Vision)

**Branch**: `003-sebastian-paid-assistant` | **Date**: 2026-02-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-sebastian-paid-assistant/spec.md`

## Summary

Build paid-only Sebastian chat with text + vision support through Replicate, personalized by user wardrobe/outfit/calendar/trip context. Reuse current Supabase billing entitlements (`resolveUserEntitlements`), usage counters, and RLS patterns. Implement guardrails at API, context, model, and observability layers.

## Technical Context

**Language/Version**: TypeScript 5.5+ (strict mode), SQL migrations (Supabase PostgreSQL)
**Primary Dependencies**: Next.js App Router, Supabase SSR client, Supabase Postgres + RLS, Replicate HTTP API, Zod
**Storage**: Supabase PostgreSQL + Supabase Storage (image references only in chat rows)
**Testing**: Vitest + route tests + integration tests for usage gating and RLS
**Target Platform**: Web app (Next.js on Netlify)
**Project Type**: Full-stack web application (Next.js API routes + Supabase backend)
**Performance Goals**: p95 text latency < 6s, p95 image feedback latency < 12s
**Constraints**: Paid-only launch, strict data isolation, deterministic quota enforcement
**Scale/Scope**: Initial paid cohort; moderate request volume with hourly burst controls

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | PASS | Request/response and provider payloads defined with Zod + strict TS types |
| II. Test-Driven Quality | PASS | Route tests for auth/gating/quota/safety and integration tests for context boundaries |
| III. Security by Default | PASS | Server-only provider access, RLS-only reads, strict ownership checks, redacted logs |
| IV. Simplicity & YAGNI | PASS | Extend current billing/usage patterns and API architecture; no new backend runtime |
| Tech Stack Constraints | PASS | Uses approved Next.js + Supabase + Netlify + existing service patterns |
| Theming Standard | PASS | No major UI system change in this phase |
| Component Architecture | PASS | Server routes + thin client; no unnecessary client-side provider logic |
| Bundle Optimization | PASS | Provider logic remains server-side; no heavy new browser deps |
| Accessibility Standards | PASS | UI follow-up will preserve keyboard/screen reader interaction in chat input |

No constitutional violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/003-sebastian-paid-assistant/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── assistant-chat.md
│   ├── assistant-threads.md
│   ├── context-pack.md
│   └── persona-prompt.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
└── api/
    └── assistant/
        ├── chat/route.ts                 # New: main assistant endpoint
        └── threads/[id]/route.ts         # New: thread retrieval endpoint

lib/
├── services/
│   └── assistant/
│       ├── context-builder.ts            # New: user-scoped context assembly
│       ├── moderation.ts                 # New: pre/post safety pipeline
│       ├── persona.ts                    # New: Sebastian persona + system prompt assembly
│       ├── types.ts                      # New: request/response/domain types
│       └── providers/
│           └── replicate.ts              # New: provider adapter + routing/fallback
└── services/billing/
    ├── entitlements.ts                   # Update: add new usage metrics helpers
    └── plans.ts                          # Update: add assistant feature/limits by plan

supabase/
└── migrations/
    ├── 20260216xxxxxx_create_assistant_tables.sql
    └── 20260216xxxxxx_add_assistant_usage_limits.sql
```

**Structure Decision**: Keep request handling in Next.js API routes for consistency with existing billing and AI endpoint patterns. Keep assistant state in Supabase tables protected by RLS.

## Complexity Tracking

No additional complexity exemptions required.
