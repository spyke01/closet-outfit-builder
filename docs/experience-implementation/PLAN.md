# Signed-in experience and AI protections

Implementation started November 6, 2026, from the reviewed revision 4 concept and the AI security/cost review. Branch: `codex/signed-in-experience-and-ai-protections`.

## Outcome

Deliver the approved look and workflows in the real Next.js application, backed by existing account data. Preserve the blue palette, light/dark themes, account utilities, paid-plan access, and existing URLs. Prepare additive database migrations, tests, and a deployment checklist. Do not deploy or change live provider/account settings during development.

## Implementation sequence

1. **Establish the baseline.** Run type checks and tests; map existing components, account ownership, calendar records, subscriptions, and upload/provider paths. Keep the local concept as a visual reference, not application data.
2. **Make spending enforcement authoritative.** Remove user writes to billing counters and trusted inference metadata. Fix first-row reservation races. Apply server-authorized quotas, shared budgets, durable jobs, bounded attempts, idempotency, and provider deadlines to every billable entry point. Preserve existing paid allowances; do not silently change subscription prices or terms.
3. **Ship the shared application frame.** Persistent desktop sidebar, five mobile destinations, compact header with clickable weather, persistent Sebastian conversation, account utilities, and contextual assistant entry points. Keep administrative access and impersonation restrictions intact. Avoid duplicate headers and per-page chat instances.
4. **Implement the reviewed user journeys.** Compact Today greeting and outfit introduction; explicit occasion previews; consistent save/swap/build-around actions; calmer wardrobe and outfit collections; a shorter essentials-first onboarding path with the full setup still available. Preserve current scores and business rules behind progressive detail.
5. **Improve clothing images.** Separate camera, photo-library, and ready-made default-image choices. Preserve original photos privately, distinguish preparation status from upload success, support review/recovery, and poll an existing provider prediction instead of creating duplicate jobs. Add explicit, reviewable photo detail suggestions through the protected vision allowance. Do not substitute a generated garment for a real photo without the user choosing it.
6. **Complete planning and analytics.** Calendar previews show main pieces plus the full count. Selected entries expose all base layers, outerwear, and accessories. Preserve multiple entries per date and planned/worn distinctions. Trips retain outfit-to-packing behavior. Analytics uses confirmed calendar wears, supports time periods and drill-down, and never treats saved combinations as wears. Cost per wear requires an optional recorded purchase price and lifetime wear counts.
7. **Validate and hand off.** Run focused tests after each change, then the full suite, type check, lint, production build, SQL/concurrency checks where a local database is available, and browser checks with synthetic fixtures. Verify accessibility, themes, responsive layouts, ownership, counter bypasses, retries, and failures. Document migration/function/application deployment order, configuration, rollback, and any checks that require the deployed environment.

## Adversarial pass: changes made to the initial plan

| Challenge                                                                   | Required improvement / acceptance condition                                                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A user bypasses the website and calls an Edge function directly.            | Enforce authorization and reservations at the billable operation itself. Next.js-only checks do not count as protection.                                                                               |
| An authenticated user resets their usage or forges job metadata.            | Client reads may remain; metering, provider handles, and authoritative audit writes require trusted server code.                                                                                       |
| Two requests create the first counter row together.                         | Serialize creation/reservation in one transaction; test the missing-row case as well as an existing counter.                                                                                           |
| A timeout hides a still-running provider job.                               | Store the provider ID, resume it, apply provider-side deadlines, and include active reservations in spending caps. Never refund merely because the browser stopped waiting.                            |
| Repeated courtesy retries create unlimited paid work.                       | Bind retries to an original job and consume a finite allowance atomically. A pending job is resumed, not regenerated.                                                                                  |
| A deployment applies database restrictions before compatible code.          | Provide explicit migration/function/app ordering and fail-closed behavior. Do not restore unsafe client writes as a rollback shortcut.                                                                 |
| A new model name changes schema, tool access, or billing.                   | Use task-specific adapters, explicit output/reasoning limits, and server allowlists. Keep tools disabled unless a defined task requires them. Do not claim paid quality/latency benchmarks from mocks. |
| An arbitrary URL is forwarded for vision or a private photo becomes public. | Resolve owned storage objects, validate format/size, and use short-lived URLs. Keep existing public assets working during migration.                                                                   |
| The redesign drops paid features, admin tools, or calendar entries.         | Retain existing routes and gates. Use the production model's multiple entries per date, not the prototype's one-entry simplification.                                                                  |
| Analytics reports attractive but false numbers.                             | Count confirmed wears only, deduplicate items within an entry, exclude future dates, preserve unknown prices, and label partial price coverage.                                                        |
| The shorter onboarding creates duplicate or partial wardrobes.              | Use a bounded, idempotent persistence path, ownership checks, clear errors, and resumable choices. Keep the longer setup available.                                                                    |
| A successful build masks a disconnected experience.                         | Exercise real application components/routes with synthetic data in a browser, including save/reload and error states. Keep fixture mode isolated from production.                                      |

## Completion evidence

All seven implementation stages are complete locally. The final source review also added calendar deletion confirmation, labeled support fields, complete outfit-image exports, explicit photo detail review, per-phase image audit records, and production environment checks.

The adversarial checks caught and corrected a mobile header overflow, older AI workers overwriting newer clothing choices, non-atomic calendar edits, a context shortlist that omitted selected pieces, duplicate retry paths, and a transparent export background. The browser suite now checks the generated PNG's pixels as well as its download.

Validation: 2,360 passing tests with four existing skips; strict lint with zero warnings; type checking; production build; three Deno Edge entry-point checks; 21 PostgreSQL concurrency/ownership/rollback checks; and 31 browser checks across desktop and ten mobile screens. The exact local private credential scan found no matches in the built browser assets.

Use [HANDOFF.md](./HANDOFF.md) for the implementation summary, deployment order, seven migrations, configuration, staging acceptance steps, operational limits, and rollback instructions. Machine-readable results and screenshots are in this directory. Production, paid-provider quality/latency, and a full hosted-schema migration rehearsal remain deployment acceptance checks, not claimed local results.

## Follow-up: local weather and Trips simplification

The local testing feedback adds two connected changes: keep weather visible and actionable in the shared header, and replace Trips' stacked planner with an overview, weather/date strip, one selected day's looks, and a separate packing workspace.

The follow-up adversarial pass requires preserving multiple looks per date, every clothing piece, packed/manual items, existing saved outfits, and calendar-sync options. It also requires confirmation before deleting a trip/look or shortening dates that remove looks, accurate forecast versus unavailable/past-date labeling, no inferred 60°/70° weather presented as a forecast, and no AI requests or database writes merely to render the packing list. Generation remains the existing local outfit algorithm; calendar syncing becomes an explicit option. Test both workspaces on phones and verify saves/reloads with synthetic I/O before rebuilding the user's local production preview.

The follow-up is complete locally. The shared browser suite passes 34 checks; the dedicated Trips suite passes six checks for selection, saved outfits, packed-state persistence, multi-look days, destructive-action safeguards, and mobile layouts. All 2,373 tests pass with four existing skips. Strict lint, types, and the production build pass. Screenshots were reviewed for desktop and phone layouts. The local weather route was checked without calling its provider. No additional migrations or hosted changes were needed.
