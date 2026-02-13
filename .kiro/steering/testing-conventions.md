# Testing Conventions

## File placement
- Put test files in colocated `__tests__/` directories.
- Use filename suffixes `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx`.
- Reserve `lib/test/` for test utilities only (setup files, helpers, factories), not runnable tests.

## Runtime boundaries
- Vitest tests must not import from `https://` URLs or Deno std libs.
- Deno-only tests must run in Deno contexts, not in the Vitest suite.
- Next.js client tests should mock framework-only runtime behavior (for example `next/image`, `next/link` click navigation) when it produces non-user-facing test noise.

## Command conventions
- Use `npm run test:run` for non-interactive runs, CI, and agent execution.
- Use `npm run test` only for local watch mode.
- If the suite appears stuck, run targeted subsets with `npm run test:run -- <path>` to isolate failures quickly.
- Run `npm run test:structure` when moving or adding tests to enforce colocated `__tests__/` placement.

## Assertion conventions
- Prefer role/label-based selectors over exact text when punctuation can vary (`...` vs `…`).
- Avoid asserting exact class chains unless behavior depends on them.
- Do not assert on implementation-only framework output when user-visible behavior is already covered.
- For themed UI, prefer semantic token assertions (for example `bg-card`, `text-foreground`, `border-border`) over palette scale assertions (`text-blue-*`, `dark:text-gray-*`).

## Fixture conventions
- Use realistic, schema-valid fixtures (for UUID-backed fields, use valid UUID strings).
- Keep test data aligned with current component contracts (required props and hook exports must be fully mocked).
- Prefer centralized factories in `lib/test/` for repeated object shapes.

## Teardown conventions
- Every test file that creates long-lived resources must clean them in `afterEach` or component unmount:
  - timers/intervals,
  - event listeners/subscriptions,
  - outstanding async tasks/promises,
  - custom global/window mutations,
  - query clients or caches.
- If a test creates a `QueryClient`, clear it after each test to avoid worker hangs.
- Component code that performs async state updates must guard against updates after unmount.

## Performance test conventions
- Avoid strict wall-clock micro-benchmarks in unit tests.
- If timing assertions are needed, use broad thresholds and compare relative behavior only.
- Never fail tests based on differences that are within expected CI noise.

## Property test conventions
- Use `fc.asyncProperty` for async test bodies.
- Keep generators within valid domain constraints (do not generate values that violate schema unless explicitly testing rejection).
- Keep `numRuns` low by default and increase only for critical logic with stable runtime.

## Examples
- `components/sizes/__tests__/pinned-card.test.tsx`
- `app/about/__tests__/page.test.tsx`
- `lib/hooks/__tests__/use-categories.test.tsx`

## Why
- Predictable discovery and ownership by feature area.
- Easier maintenance and faster triage of failures.
- Cleaner separation between helpers (`lib/test`) and actual tests (`__tests__`).
