# closet-outfit-builder Development Guidelines

Last updated: 2026-03-13

## Tech Stack

- **Framework**: TypeScript 5.5+ (strict) + Next.js 16 (App Router) + React 19
- **Database**: Supabase PostgreSQL + Auth + RLS + Storage (`wardrobe-images` bucket)
- **Edge Functions**: Deno + Supabase JS
- **Billing**: Stripe Node SDK
- **State**: TanStack Query
- **UI**: Radix UI + Tailwind CSS 4 + Lucide React (direct imports)
- **Validation**: Zod
- **AI**: Replicate API (google-deepmind/imagen-4)

## Project Structure

```text
app/              # Next.js App Router pages and API routes
components/       # React components (ui/ for Radix primitives)
lib/
  actions/        # Server Actions ('use server')
  hooks/          # Custom React hooks
  services/       # Domain services (billing, assistant, etc.)
  supabase/       # DB clients (client.ts browser, server.ts SSR, admin.ts)
  schemas/        # Zod validation schemas
  types/          # TypeScript type definitions
  utils/          # Utility functions
supabase/
  migrations/     # SQL migrations
  functions/      # Deno edge functions
specs/            # Feature specs, plans, tasks, contracts
```

## Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run test:run     # Vitest (all tests, no watch)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm audit            # Security audit
```

## Phase Completion Workflow

**Run all of these before committing at the end of each implementation phase:**

1. `npm run typecheck` — zero errors required
2. `npm run lint` — zero errors required
3. `npm run test:run` — all tests pass
4. `npm run build` — production build succeeds
5. `npm audit --audit-level=moderate` — zero vulnerabilities
6. Security review of new API routes, server actions, and auth flows (see checklist below)
7. Commit with a descriptive message per phase (format: `feat(NNN): Phase N (USX) — short summary`)
8. **Do not push** until all phases are committed and reviewed

### Security Checklist for New Code

For each new API route or server action, verify:
- [ ] Auth: `supabase.auth.getUser()` called before any data access
- [ ] Authorization: RLS active or explicit `user_id` filter on every query
- [ ] Input validation: Zod schema on all user-supplied fields
- [ ] CSRF: `requireSameOrigin(request)` on mutation routes
- [ ] Secrets: no env vars logged or returned to client
- [ ] Admin routes: `hasAdminPermission()` + step-up auth + rate limit
- [ ] Stripe webhooks: `verifyStripeWebhookSignature()` before parsing body
- [ ] `ssr: false` with `next/dynamic` only in Client Components (not Server Components)

## Code Style

- Semantic CSS variables only — no hardcoded hex colors (`#RRGGBB`)
- Lucide React: always use direct named imports (e.g., `import { Shirt } from 'lucide-react'`)
- Server Actions: `'use server'` directive, validate input with Zod, authenticate before acting
- Client Components: `'use client'` directive, use TanStack Query for server state
- `next/dynamic` with `ssr: false` must live in a Client Component, not a Server Component

## UI Alert Styling Standard

Use `Alert` + `AlertDescription` from `@/components/ui/alert` for all user feedback.

| Situation | Variant | Icon |
|-----------|---------|------|
| Success confirmation | `"success"` | `CheckCircle` |
| Recoverable warning | `"warning"` | `AlertCircle` |
| Error / failure | `"destructive"` | `AlertCircle` |
| Informational notice | `"info"` | `AlertCircle` |

Never render feedback as plain `<p>` text.

## Entitlement Gating Pattern

Free-tier users see blurred previews with upgrade CTA, not hard redirects:
```tsx
// Server component: fetch tier and pass as prop
const entitlements = await resolveUserEntitlements(supabase, user.id);
// Client component: blur + overlay for gated sections
{!isPaid && <UpgradeGate />}
```

Use `resolveUserEntitlements()` from `lib/services/billing/entitlements.ts` as the single source of truth for plan/feature access.
