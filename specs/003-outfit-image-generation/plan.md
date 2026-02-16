# Implementation Plan: Outfit Image Generation

**Branch**: `003-outfit-image-generation` | **Date**: 2026-02-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-outfit-image-generation/spec.md`

## Summary

Add AI-powered outfit image generation using google-deepmind/imagen-4 via Replicate API. Users on paid tiers (Closet Plus: 30/month, Closet Pro: 100/month) can generate flat-lay style images of their outfits from the outfit detail page. The feature reuses the existing Supabase Edge Function pattern for Replicate API calls, stores images in a dedicated Storage bucket, and enforces per-user quotas with hourly burst protection (5/hour). Free-tier users see the feature locked with an upgrade prompt.

## Technical Context

**Language/Version**: TypeScript 5.5+ (strict mode) + Deno (Edge Functions)
**Primary Dependencies**: Next.js (App Router), React 19, Supabase JS, Replicate API (google-deepmind/imagen-4), TanStack Query
**Storage**: Supabase PostgreSQL + Supabase Storage (`outfit-generated-images` bucket)
**Testing**: Vitest + Testing Library + Axe
**Target Platform**: Web (PWA, mobile-first responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Image generation < 30 seconds end-to-end; UI remains responsive during generation
**Constraints**: Edge Function 60s timeout; Replicate model latency 5-15s; max 5 generations/hour burst limit
**Scale/Scope**: Per-user quotas (Plus: 30/month, Pro: 100/month); ~$0.04-0.08 per generation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | PASS | All new types in `lib/types/database.ts`, Zod schemas for all boundaries, Server Actions follow validate-authenticate-authorize-execute |
| II. Test-Driven Quality | PASS | Tests planned for hooks, server actions, prompt builder; behavior-focused with role-based selectors |
| III. Security by Default | PASS | RLS on all new tables; API key in Edge Function only; quota enforcement server-side; auth verification in Server Actions and Edge Function |
| IV. Simplicity & YAGNI | PASS | Reuses existing Edge Function pattern; no new dependencies; synchronous flow avoids webhook complexity |
| Theming Standard | PASS | All new UI uses semantic tokens (`bg-card`, `text-foreground`, etc.) |
| Component Architecture | PASS | Server Components default; `'use client'` only for interactive generation UI; hooks for business logic |
| Bundle Optimization | PASS | Direct Lucide imports; generation UI can be dynamically imported |
| Accessibility | PASS | Generate button with aria-label; progress indicator with live region; keyboard-navigable gallery |

**Post-Phase 1 re-check**: All gates still pass. No new dependencies introduced. Three new tables follow existing RLS pattern. Edge Function follows established `process-image` pattern.

## Project Structure

### Documentation (this feature)

```text
specs/003-outfit-image-generation/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions and rationale
├── data-model.md        # Phase 1: Database schema, types, Zod schemas
├── quickstart.md        # Phase 1: Setup and architecture overview
├── contracts/           # Phase 1: API contracts
│   ├── server-actions.md
│   ├── edge-function.md
│   └── hooks.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# New files for this feature
supabase/
├── migrations/
│   └── YYYYMMDD_add_outfit_image_generation.sql   # DB migration
└── functions/
    └── generate-outfit-image/
        └── index.ts                                # Edge Function

lib/
├── actions/
│   └── outfit-images.ts                            # Server Actions
├── hooks/
│   └── use-outfit-images.ts                        # React hooks (TanStack Query)
├── types/
│   └── database.ts                                 # + GeneratedOutfitImage, ImageGenerationUsage, etc.
├── schemas/
│   └── index.ts                                    # + Generation Zod schemas
└── utils/
    └── outfit-prompt-builder.ts                    # Prompt construction for multi-item flat-lay

app/outfits/[id]/
└── outfit-detail-client.tsx                        # Modified: add Generate Image button + gallery

components/
├── outfit-image-generator.tsx                      # Generate button + progress + quota display
└── outfit-image-gallery.tsx                        # Generated images gallery with actions

# Test files
lib/hooks/__tests__/
└── use-outfit-images.test.ts

lib/actions/__tests__/
└── outfit-images.test.ts

lib/utils/__tests__/
└── outfit-prompt-builder.test.ts
```

**Structure Decision**: Follows existing Next.js App Router layout. New files integrate into existing directories (`lib/actions/`, `lib/hooks/`, `supabase/functions/`). No new top-level directories needed.

## Complexity Tracking

No constitution violations. All design decisions use existing patterns:
- Edge Function pattern from `process-image`
- TanStack Query hooks from `use-outfits.ts`
- Server Actions from `lib/actions/outfits.ts`
- Supabase Storage from `wardrobe-images` bucket pattern
- Zod schemas from `lib/schemas/index.ts`

## Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](research.md) | Complete |
| Data Model | [data-model.md](data-model.md) | Complete |
| Server Action Contracts | [contracts/server-actions.md](contracts/server-actions.md) | Complete |
| Edge Function Contract | [contracts/edge-function.md](contracts/edge-function.md) | Complete |
| Hook Contracts | [contracts/hooks.md](contracts/hooks.md) | Complete |
| Quickstart | [quickstart.md](quickstart.md) | Complete |

## Next Step

Run `/speckit.tasks` to generate the task breakdown from these artifacts.
