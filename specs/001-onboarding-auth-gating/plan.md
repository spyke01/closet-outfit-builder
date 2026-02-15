# Implementation Plan: Onboarding Gating & Auth Flow Wiring

**Branch**: `001-onboarding-auth-gating` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-onboarding-auth-gating/spec.md`

## Summary

Implement onboarding as the mandatory first-run path for users with
empty wardrobes. Wire all auth entry points (OAuth callback, email
confirmation, password login) to a centralized wardrobe readiness
check that redirects empty-wardrobe users to onboarding. Gate all
app pages except settings behind the same check. Fix the onboarding
item persistence by including `user_id` in the insert payload to
satisfy RLS INSERT policy.

## Technical Context

**Language/Version**: TypeScript 5.5+ (strict mode)
**Primary Dependencies**: Next.js (App Router), React 19, Supabase JS
**Storage**: Supabase PostgreSQL with RLS
**Testing**: Vitest + Testing Library
**Target Platform**: Web (Netlify deployment)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Wardrobe readiness check < 10ms (indexed query)
**Constraints**: No new database migrations; application-level changes only
**Scale/Scope**: Single-user query per page load; negligible overhead

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | PASS | New helper uses typed Supabase client; no user input to validate |
| II. Test-Driven Quality | PASS | Tests planned for readiness helper, auth routing, page gating, persister fix |
| III. Security by Default | PASS | RLS fix ensures user_id present; middleware protects /onboarding; server-side auth checks preserved |
| IV. Simplicity & YAGNI | PASS | No new tables, no cached flags, no feature flags; minimal server-side checks |
| Tech Stack | PASS | Uses existing Next.js, Supabase, TypeScript stack only |
| Theming | N/A | No UI changes |
| Component Architecture | PASS | Server Components for page gating; new helper uses named exports |
| Bundle Optimization | PASS | No new client-side dependencies; server-only helper |
| Performance Standards | PASS | Single `LIMIT 1` query; no waterfall introduced |
| Accessibility | N/A | No UI changes |
| Codebase Maintenance | PASS | Removing seed-user calls reduces dead code; no demo components |

## Project Structure

### Documentation (this feature)

```text
specs/001-onboarding-auth-gating/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity and state model
├── quickstart.md        # Testing and verification guide
├── contracts/           # API contracts
│   └── wardrobe-readiness.md
├── checklists/          # Quality checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
lib/
├── server/
│   └── wardrobe-readiness.ts    # NEW: readiness check + routing helper
├── services/
│   └── onboarding-persister.ts  # MODIFIED: add user_id to insert
├── supabase/
│   └── middleware.ts            # MODIFIED: add /onboarding to protected
└── types/
    └── database.ts              # MODIFIED: add user_id to CreateWardrobeItemInput

app/
├── auth/
│   ├── callback/route.ts        # MODIFIED: onboarding-aware redirect
│   └── confirm/route.ts         # MODIFIED: onboarding-aware redirect
├── today/page.tsx               # MODIFIED: empty wardrobe redirect
├── wardrobe/page.tsx            # MODIFIED: empty wardrobe redirect
├── outfits/page.tsx             # MODIFIED: empty wardrobe redirect
└── anchor/[category]/page.tsx   # MODIFIED: empty wardrobe redirect

components/
├── login-form.tsx               # MODIFIED: redirect target to /today
└── sign-up-form.tsx             # MODIFIED: redirect target to /today
```

**Structure Decision**: Existing Next.js App Router structure. New
`lib/server/` directory for server-only helpers (follows existing
pattern of `lib/supabase/server.ts`). No new app routes needed.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
