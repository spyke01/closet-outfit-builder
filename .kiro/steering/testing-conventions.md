# Testing Conventions

## File placement
- Put test files in colocated `__tests__/` directories.
- Use filename suffixes `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx`.
- Reserve `lib/test/` for test utilities only (setup files, helpers, factories), not runnable tests.

## Examples
- `components/sizes/__tests__/pinned-card.test.tsx`
- `app/about/__tests__/page.test.tsx`
- `lib/hooks/__tests__/use-categories.test.tsx`

## Why
- Predictable discovery and ownership by feature area.
- Easier maintenance and faster triage of failures.
- Cleaner separation between helpers (`lib/test`) and actual tests (`__tests__`).
