# Implementation Plan: Mobile Camera Capture & Background Removal

**Branch**: `002-mobile-camera-bg-removal` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-mobile-camera-bg-removal/spec.md`

## Summary

Add mobile camera capture and photo library selection to the wardrobe item upload flow, and implement async background removal via the Replicate API (851-labs/background-remover). The existing `process-image` Edge Function already has a placeholder for background removal — this plan integrates Replicate, adds mobile-specific `<input>` capture attributes, introduces a `bg_removal_status` column for tracking, and uses Supabase Realtime to push processed images to the client without page refresh.

## Technical Context

**Language/Version**: TypeScript 5.5+ (strict mode) + Deno (Edge Functions)
**Primary Dependencies**: Next.js (App Router), React 19, Supabase JS, Replicate API, TanStack Query
**Storage**: Supabase PostgreSQL + Supabase Storage (`wardrobe-images` bucket)
**Testing**: Vitest + Testing Library + Axe
**Target Platform**: Mobile web (iOS Safari, Android Chrome) + Desktop browsers
**Project Type**: Web application (Next.js on Netlify + Supabase backend)
**Performance Goals**: Upload → wardrobe display < 10s; BG removal < 30s (95th percentile); 60s hard timeout
**Constraints**: Netlify hosting (no Docker), Supabase Edge Functions (Deno runtime), 5MB upload limit
**Scale/Scope**: Single-user personal app, low-volume processing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | PASS | All new code will use strict TS, Zod validation on Replicate responses, Edge Function inputs |
| II. Test-Driven Quality | PASS | Tests for upload hook changes, Realtime subscription hook, Edge Function processing logic |
| III. Security by Default | PASS | Replicate API key stored as Supabase secret (not in client bundle), RLS on new columns, auth checks in Edge Function |
| IV. Simplicity & YAGNI | PASS | Extending existing upload flow, not creating parallel systems. Minimal new components |
| Tech Stack Constraints | PASS | Using approved stack: Supabase Edge Functions, TanStack Query, Tailwind, Zod |
| Theming Standard | PASS | Processing indicator will use semantic tokens (`bg-muted`, `text-muted-foreground`) |
| Component Architecture | PASS | Server Components default, `'use client'` only for interactive upload + Realtime subscription |
| Bundle Optimization | PASS | Replicate SDK not needed client-side; only Edge Function changes. No new client dependencies |
| Accessibility Standards | PASS | Camera/library buttons will have proper labels, processing indicator uses aria-live |

No violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-mobile-camera-bg-removal/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── api/upload-image/route.ts          # Existing - minor updates for mobile metadata
├── wardrobe/items/add-item-client.tsx  # Existing - add mobile capture UI

components/
├── image-upload.tsx                    # Existing - add camera/library input modes
├── processing-indicator.tsx            # New - bg removal status badge

lib/
├── hooks/
│   ├── use-image-upload.ts             # Existing - handle mobile capture + status polling
│   └── use-realtime-wardrobe.ts        # New - Supabase Realtime subscription for image updates
├── types/database.ts                   # Existing - add bg_removal_status type
└── schemas/index.ts                    # Existing - add Replicate response schema

supabase/
├── functions/
│   └── process-image/index.ts          # Existing - integrate Replicate API call
└── migrations/
    └── YYYYMMDD_add_bg_removal_status.sql  # New - add status column + trigger
```

**Structure Decision**: This feature extends the existing upload pipeline. No new directories needed except one new hook file and one small component. The bulk of changes are in existing files.

## Complexity Tracking

No constitution violations to justify. The design stays within existing patterns.
