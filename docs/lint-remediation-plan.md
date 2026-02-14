# Lint Remediation Plan

## Objective

Drive repository lint findings to zero so that workflow lint checks are fully reliable and block regressions.

## Baseline (Captured 2026-02-14)

- Total findings: 662
- Errors: 5
- Warnings: 657

### Top Rules

1. `@typescript-eslint/no-explicit-any`: 368
2. `@typescript-eslint/no-unused-vars`: 179
3. `jsx-a11y/label-has-associated-control`: 20
4. `react-hooks/exhaustive-deps`: 18
5. `react/no-unescaped-entities`: 14
6. `react-refresh/only-export-components`: 14

### Top Directories

1. `lib`: 330
2. `components`: 188
3. `app`: 70
4. `__tests__`: 63

## Workstreams

1. Remove all blocking lint errors first.
2. Eliminate `no-explicit-any` findings, prioritizing `lib`, then `components`, then `app`, then `__tests__`.
3. Eliminate `no-unused-vars`.
4. Resolve accessibility and hooks violations.
5. Resolve all remaining rules and enforce strict lint CI.

## CI Ratchet

1. Stage 1: Keep `npm run lint` in CI and publish machine-readable lint summary artifacts (`.lint-report.json`, `.lint-summary.json`).
2. Stage 2: After the baseline reaches zero warnings, switch lint CI to `npm run lint:strict`.
