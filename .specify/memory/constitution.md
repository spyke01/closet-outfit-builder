<!--
  Sync Impact Report
  ==================
  Version change: 1.0.0 → 1.1.0 (MINOR - new sections and expanded
  principles from Kiro steering documents)
  Modified principles:
    - II. Test-Driven Quality: expanded with lean testing philosophy,
      behavior-over-implementation mandate, 5-minute fix-or-remove rule,
      property test guardrails, and testing conventions
    - IV. Simplicity & YAGNI: expanded with codebase maintenance rules
      (no demo components, no enhanced duplicates, artifact cleanup)
  Added sections:
    - Theming Standard
    - Component Architecture
    - Bundle Optimization
    - Filtering UX Contract
    - Codebase Maintenance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ no update needed
    - .specify/templates/spec-template.md — ✅ no update needed
    - .specify/templates/tasks-template.md — ✅ no update needed
  Follow-up TODOs: None
  Source: Kiro steering documents at .kiro/steering/
-->

# My AI Outfit Constitution

## Core Principles

### I. Type Safety First

All code MUST use strict TypeScript with no `any` types permitted.
Use `unknown` with Zod validation instead. Zod schemas MUST
validate all data at system boundaries: API responses, form
inputs, URL parameters, and environment variables. Shared types
MUST be defined in `lib/types/` and reused across client and
server code. Type assertions (`as`) MUST be avoided unless
accompanied by a runtime guard or explicit justification comment.

Server Actions MUST validate all input with Zod before
processing:

1. Validate input with schema
2. Authenticate the session
3. Authorize the user
4. Execute the operation

**Rationale**: Type safety eliminates an entire class of runtime
errors, improves refactoring confidence, and serves as living
documentation of data contracts.

### II. Test-Driven Quality

All new features MUST include tests written with Vitest and
Testing Library before merging. Tests MUST be deterministic —
no flaky tests are permitted in the main branch.

**Lean testing philosophy**:

- Every test MUST answer: "If this breaks, would a user notice
  or data be at risk?" If no, remove the test
- Test behavior, not implementation. Use role-based and
  label-based selectors (`getByRole`, `getByLabelText`), never
  internal class names or component state
- Minimize mocking. Mock only external dependencies (Supabase,
  APIs). If a test requires 5+ mocks, it is testing at the
  wrong level — refactor or remove
- Tests MUST complete in <100ms each, <10s total suite
- Use `npm run test:run` for CI and automation, never watch mode
- Flaky tests MUST be fixed immediately or removed. Do not skip
- If a failing test cannot be fixed in 5 minutes, remove it
- Test coverage MUST NOT decrease on any PR

**Testing conventions**:

- Test files in colocated `__tests__/` directories
- Suffix: `.test.ts` or `.test.tsx`
- `lib/test/` for utilities and factories only, not tests
- Use typed factory functions for test data
- Clean up timers, subscriptions, QueryClients in `afterEach`
- Restore all mocks with `vi.restoreAllMocks()` in `afterEach`

**Property-based tests** (fast-check): Use sparingly for
critical business logic with complex input spaces only. Keep
`numRuns` at 3-5. Test pure functions, never UI rendering.

**Accessibility testing**: Axe integration tests MUST validate
all interactive components. Keyboard navigation and ARIA
attributes MUST be tested for interactive patterns.

**Rationale**: A small suite of high-confidence tests beats a
large suite of brittle tests. Testing user-facing behavior
ensures refactoring freedom without false failures.

### III. Security by Default

Supabase Row Level Security (RLS) MUST be enabled on every
table containing user data. All data-mutating operations MUST
verify authentication server-side via Server Actions or API
routes — never trust client-side auth state alone. Secrets and
API keys MUST NOT appear in client bundles or be committed to
version control. All user input MUST be sanitized before
rendering. OWASP Top 10 vulnerabilities MUST be actively
prevented.

Server Actions MUST follow the validate-authenticate-authorize-
execute pattern. API keys for external services (OpenWeatherMap)
MUST be proxied through Netlify Functions or server-side routes.

**Rationale**: A wardrobe app handles personal data and images.
Security is not optional — breaches destroy user trust
irreversibly.

### IV. Simplicity & YAGNI

Build only what is needed for the current requirement. Prefer
three similar lines of code over a premature abstraction.
Do not add configuration, feature flags, or extension points
unless there is a concrete, immediate need. Complexity MUST be
justified in PR descriptions when introduced. Favor deleting
unused code over commenting it out.

**Codebase maintenance rules**:

- NEVER create demo/example components (`lib/examples/`,
  `app/test-*`). All components MUST serve the production app
- NEVER create `Enhanced*`, `Optimized*`, or `Responsive*`
  duplicates — consolidate functionality into the original
- Remove unused components, hooks, and utilities immediately
  after refactoring
- Implementation summary files (`*_IMPLEMENTATION.md`,
  `*_SUMMARY.md`) MUST NOT be committed to root
- Development-only scripts and build artifacts MUST be cleaned
  up before merge

**Rationale**: Unnecessary complexity and dead code slow
development, obscure intent, and increase the surface area
for bugs.

## Tech Stack Constraints

The following technology choices are mandatory and MUST NOT be
replaced without a constitution amendment:

- **Framework**: Next.js (App Router) with React and TypeScript
- **Database & Auth**: Supabase (PostgreSQL + Auth + RLS +
  Storage + Edge Functions on Deno runtime)
- **Styling**: Tailwind CSS 4 + Radix UI primitives + next-themes
- **State Management**: TanStack Query for server state, Immer
  for immutable client state updates
- **Validation**: Zod schemas at all system boundaries
- **Testing**: Vitest + Testing Library + Axe + fast-check
  (sparingly)
- **Icons**: Lucide React (direct imports only)
- **Deployment**: Netlify (with Netlify Functions for API proxy)
- **PWA**: Custom service worker + web app manifest

Adding new dependencies MUST be justified. Prefer built-in
platform capabilities (Web APIs, Next.js features, Supabase
features) over third-party libraries when functionality overlaps.

## Theming Standard

This project uses a semantic token-first theming system. CSS
variables are defined in `app/globals.css` and exposed via
Tailwind `@theme inline`.

**Required token usage for all app UI**:

- Surfaces: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Primary: `bg-primary`, `text-primary-foreground`
- Secondary: `bg-secondary`, `text-secondary-foreground`
- Focus: `ring-ring`
- Destructive: `text-destructive`, `bg-destructive/10`

**Prohibited patterns**:

- Neutral scale classes (`slate-*`, `stone-*`, `gray-*`) for
  app UI theming
- Hardcoded `bg-white`, `text-white`, `border-gray-*` for
  primary surfaces
- Conflicting dual surface classes on one element (`bg-white
  bg-card`, `bg-muted bg-card`)
- Redundant `dark:*` overrides when semantic tokens already
  handle both themes

**Component recipes**:

- Page shell: `bg-background text-foreground`
- Cards: `bg-card border border-border rounded-lg`
- Inputs: `bg-background border border-border text-foreground
  focus:ring-2 focus:ring-ring`
- Primary button: `bg-primary text-primary-foreground
  hover:opacity-90`
- Nav bar: `bg-card border-b border-border`
- Skeletons/fallbacks: `bg-muted` (prevents white flash during
  route transitions)

**Suspense rule**: Any Suspense fallback that replaces themed UI
MUST use the same semantic token surfaces as the final component.

**Test alignment**: UI tests MUST assert semantic class names
(`bg-card`, `text-foreground`), never legacy palette classes.

## Component Architecture

**Server Components by default**: All components MUST be Server
Components unless interactivity requires `'use client'`.

**Naming conventions**:

- Components: PascalCase (`OutfitCard.tsx`)
- Hooks: camelCase with `use` prefix (`useWardrobeItems.ts`)
- Schemas: camelCase with `Schema` suffix
- Tests: same name as source with `.test.tsx`
- Edge Functions: kebab-case directory names

**Import patterns**:

- Use `@/` path alias for all cross-directory imports
- Prefer named exports over default exports
- Use relative paths only within the same directory

**Component patterns**:

- Each component exports its own `Props` interface
- Event handlers prefixed with `on` (`onItemSelect`)
- Early returns for loading/error states
- Mobile-first responsive design with Tailwind breakpoints
- Minimum 44px touch targets for interactive elements

**Hook responsibilities**: Keep complex business logic in hooks,
not components. TanStack Query for data fetching, Immer for
immutable state updates, Zod for validation in mutation hooks.

## Bundle Optimization

**Direct imports are mandatory** for tree-shaking:

- Lucide icons MUST use direct imports
  (`lucide-react/dist/esm/icons/<name>`), never barrel imports
  (`import { Icon } from 'lucide-react'`)
- Configure `optimizePackageImports` in `next.config.js` for
  Radix UI and other large packages

**Dynamic imports**: Components exceeding 50KB MUST use
`next/dynamic` with loading fallbacks. Analytics and monitoring
MUST load after hydration with `ssr: false`.

**Bundle size limits**:

- Total bundle: < 500KB gzipped
- First Load JS: < 200KB
- Individual chunks: < 100KB

**Eliminate request waterfalls**: Independent async operations
MUST use `Promise.all()`, never sequential `await`. Use
Suspense boundaries to stream non-critical content.

**Memoization**: Filtered result computations MUST use
`useMemo`. Non-urgent UI updates SHOULD use `startTransition`.
Hoist static JSX outside component functions. Use `Map` for
O(1) lookups instead of `Array.find()`.

**Immutable operations**: Use `.toSorted()`, `.toReversed()`
instead of mutating `.sort()`, `.reverse()`.

## Filtering UX Contract

All filter/search interfaces MUST follow this pattern:

**Toolbar structure** (two-layer model):

1. Primary toolbar (always visible): search input + quick
   filter facets
2. Advanced filters: behind a toggle with `aria-expanded`,
   in a bordered card surface

**Active filter feedback**:

- Show removable active-filter chips near the toolbar
- Provide a single "Clear all" action
- Users MUST NOT need to reopen advanced controls to see
  current filter state

**URL state contract**:

- Filter state MUST be reflected in URL query params
  (shareable, bookmarkable)
- Read from `useSearchParams()`, write with
  `router.replace(...)` and `{ scroll: false }`
- Remove params for default values (no noisy defaults in URL)

**Accessibility**: Every filter input/select needs a
programmatic label. Toggle buttons MUST have `aria-label` and
`aria-expanded`. Facet buttons MUST expose `aria-pressed`.
Interactive chips MUST be keyboard operable.

## Performance Standards

The application MUST meet the following Core Web Vitals:

- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100 milliseconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.5 seconds on 4G

Images MUST be served via Next.js Image optimization with
appropriate `sizes` and lazy loading. Route-level code splitting
MUST be maintained. Server Components MUST be the default;
Client Components are permitted only when interactivity requires
it. Use passive event listeners for scroll handlers. Use
`content-visibility: auto` for long lists. Use `React.cache()`
for server-side request deduplication.

## Accessibility Standards

The application MUST conform to WCAG 2.1 Level AA:

- All interactive elements MUST be keyboard navigable
- All images MUST have meaningful `alt` text (or `alt=""` for
  decorative)
- Color contrast MUST meet AA ratio (4.5:1 normal, 3:1 large)
- Focus indicators MUST be visible (`focus-visible` with ring)
- Screen reader announcements for dynamic content (live regions)
- Radix UI primitives MUST be used for complex interactive
  patterns (dialogs, menus, dropdowns)
- Form inputs MUST have associated labels
- Semantic HTML MUST be used (`<button>` not `<div onClick>`)
- Icon-only buttons MUST have `aria-label` with icons marked
  `aria-hidden="true"`
- `prefers-reduced-motion` MUST be respected for animations

## Codebase Maintenance

**Regular maintenance tasks** (enforce during code review):

- Audit and remove unused imports and dead code
- Consolidate duplicate components — no `Enhanced*` variants
- Remove development artifacts before merge
- Keep documentation focused on application usage, not
  implementation summaries
- Update dependencies and remove unused packages

**Code review checklist**:

- No demo or example components added
- No implementation summary files in root
- No duplicate enhanced components
- All new components are used in production
- Unused imports and dead code removed
- Tests added for new production code
- Semantic HTML and ARIA labels used
- Direct imports used (no barrel imports)
- Server Actions have auth checks
- Bundle size checked

## Development Workflow

- **Branching**: Feature branches from `main`, named
  `<issue-number>-<short-description>`
- **Pull Requests**: All changes MUST go through PR review.
  PRs MUST pass linting (`npm run lint`), type checking
  (`npm run typecheck`), and tests (`npm run test:run`)
  before merge
- **Commits**: Use conventional commit format
  (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **Code Quality Gates**: ESLint and TypeScript strict mode
  MUST pass with zero errors. Warnings SHOULD be resolved
  before merge
- **Server Actions**: All backend mutations MUST use Server
  Actions with `'use server'` directive. Direct database
  calls from Client Components are prohibited
- **Test execution**: Always `npm run test:run` in CI and
  automation. Use `npm run test` only for local watch mode
- **Accessibility gates**: `npm run lint:a11y` and
  `npm run test:a11y` MUST pass before merge

## Governance

This constitution is the authoritative source for development
standards in the My AI Outfit project. It supersedes informal
practices and ad-hoc decisions.

- **Amendments**: Any change to this constitution MUST be
  documented with a version bump, rationale, and migration
  plan if existing code is affected
- **Versioning**: Constitution follows semantic versioning:
  - MAJOR: Principle removal or incompatible redefinition
  - MINOR: New principle or section added
  - PATCH: Clarification or wording improvement
- **Compliance**: All PRs MUST be verified against applicable
  principles. Violations MUST be flagged in review
- **Guidance**: Refer to `CLAUDE.md`, `.specify/` artifacts,
  and `.kiro/steering/` documents for detailed implementation
  guidance on specific topics

**Version**: 1.1.0 | **Ratified**: 2026-02-13 | **Last Amended**: 2026-02-13
