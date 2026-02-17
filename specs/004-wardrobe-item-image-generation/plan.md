# Implementation Plan: Wardrobe Item Image Generation

**Branch**: `004-wardrobe-item-image-generation` | **Date**: 2026-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-wardrobe-item-image-generation/spec.md`

## Summary

Add AI-powered wardrobe item image generation using google-deepmind/imagen-4 via Replicate API. Users on paid tiers (Closet Plus: 30/month, Closet Pro: 100/month) can generate product-style images of individual wardrobe items based on their attributes (name, category, color, brand, material). The generated image directly replaces the item's `image_url` — no image history or gallery needed.

Users have three ways to get a wardrobe item image:
1. **Upload a photo** (existing via 002-mobile-camera-bg-removal)
2. **Premade image** (existing, matched during onboarding)
3. **AI generation** (NEW - this feature)

Key design decisions:
- Reuse existing `wardrobe-images` Storage bucket (no new bucket)
- Generated images overwrite at deterministic path `{user_id}/generated/{item_id}.webp`
- Usage tracked via existing `usage_counters` table + `entitlements.ts` service
- Square (1:1) aspect ratio for all categories
- Concurrent generation blocked per item (only one at a time)
- Free-tier users see locked button with upgrade prompt

## Technical Context

**Language/Version**: TypeScript 5.5+ (strict mode) + Deno (Edge Functions)
**Primary Dependencies**: Next.js (App Router), React 19, Supabase JS, Replicate API (google-deepmind/imagen-4), TanStack Query
**Storage**: Supabase PostgreSQL + Supabase Storage (existing `wardrobe-images` bucket)
**Testing**: Vitest + Testing Library + Axe
**Target Platform**: Web (PWA, mobile-first responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Image generation < 30 seconds end-to-end; UI remains responsive during generation
**Constraints**: Edge Function 60s timeout; Replicate model latency 5-15s; max 5 generations/hour burst limit; one concurrent generation per item
**Scale/Scope**: Per-user quotas (Plus: 30/month, Pro: 100/month); ~$0.04-0.08 per generation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | PASS | All new types in `lib/types/database.ts`, Zod schemas for all boundaries, Server Actions follow validate-authenticate-authorize-execute |
| II. Test-Driven Quality | PASS | Tests planned for hooks, server actions, prompt builder; behavior-focused with role-based selectors; colocated `__tests__/` directories |
| III. Security by Default | PASS | RLS on generation_log; API key in Edge Function only (Deno env); quota enforcement server-side; auth verification in Server Actions and Edge Function |
| IV. Simplicity & YAGNI | PASS | Reuses existing bucket, usage_counters, and Edge Function pattern; no new tables for image records; no gallery/history complexity; no new dependencies |
| Theming Standard | PASS | All new UI uses semantic tokens (`bg-card`, `text-foreground`, `bg-primary`, etc.) |
| Component Architecture | PASS | Server Components default; `'use client'` only for interactive generation UI; hooks for business logic; PascalCase components, camelCase hooks |
| Bundle Optimization | PASS | Direct Lucide imports (`lucide-react/dist/esm/icons/<name>`); generation UI can be dynamically imported; `Promise.all()` for independent async ops |
| Accessibility | PASS | Generate button with `aria-label`; progress indicator with `aria-live="polite"` and `role="status"`; keyboard-navigable; 44px touch targets; icon-only buttons have `aria-label` |
| Performance Standards | PASS | Image generation is async (doesn't block UI); Next.js Image optimization for display; lazy loading |
| Filtering UX Contract | N/A | No filter/search interfaces in this feature |
| Codebase Maintenance | PASS | No demo components; no duplicate enhanced variants; all new components serve production |

**Post-Phase 1 re-check**: All gates still pass. No new dependencies introduced. One new table (`generation_log`) follows existing RLS pattern. Edge Function follows established `process-image` pattern. Storage reuses existing `wardrobe-images` bucket.

## Project Structure

### Documentation (this feature)

```text
specs/004-wardrobe-item-image-generation/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technology decisions and rationale
├── data-model.md        # Phase 1: Database schema, types, Zod schemas
├── quickstart.md        # Phase 1: Setup and architecture overview
├── contracts/           # Phase 1: API contracts
│   ├── server-actions.md
│   ├── edge-function.md
│   └── hooks.md
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# New files for this feature
supabase/
├── migrations/
│   └── YYYYMMDD_add_wardrobe_item_image_generation.sql  # DB migration (generation_log only)
└── functions/
    └── generate-wardrobe-item-image/
        └── index.ts                                      # Edge Function

lib/
├── actions/
│   └── wardrobe-item-images.ts                           # Server Actions
├── hooks/
│   └── use-wardrobe-item-image-generation.ts             # React hook (TanStack Query)
├── types/
│   └── database.ts                                       # + GenerationLogEntry type
├── schemas/
│   └── index.ts                                          # + Generation Zod schemas
└── utils/
    └── wardrobe-item-prompt-builder.ts                   # Prompt construction for single item

# Modified files
app/wardrobe/[id]/                                        # Add Generate Image button to detail view
[wardrobe item create/edit form]                          # Add Generate with AI option near upload

# New components
components/
└── wardrobe-item-image-generator.tsx                     # Generate button + progress + quota display

# Test files
lib/hooks/__tests__/
└── use-wardrobe-item-image-generation.test.ts

lib/actions/__tests__/
└── wardrobe-item-images.test.ts

lib/utils/__tests__/
└── wardrobe-item-prompt-builder.test.ts
```

**Structure Decision**: Follows existing Next.js App Router layout. New files integrate into existing directories (`lib/actions/`, `lib/hooks/`, `supabase/functions/`). No new top-level directories needed.

## Complexity Tracking

No constitution violations. All design decisions use existing patterns:
- Edge Function pattern from `process-image`
- TanStack Query hooks from existing hooks in `lib/hooks/`
- Server Actions from `lib/actions/wardrobe.ts`
- Supabase Storage from existing `wardrobe-images` bucket
- Zod schemas from `lib/schemas/index.ts`
- Usage tracking from existing `usage_counters` + `entitlements.ts`

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
