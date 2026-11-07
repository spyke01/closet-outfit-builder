# Signed-in experience: testing and deployment handoff

November 6, 2026 · Branch `codex/signed-in-experience-and-ai-protections`

Initial acceptance testing was local. The November 6 model evaluation and release section below records the subsequent live comparison and hosted rollout. Provider billing balances have not been changed.

## What changed

| Area                     | Result                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared frame             | Desktop sidebar and five mobile destinations. Account menu keeps settings, membership, sizes, exports, support, theme, administration, and sign-out accessible. Administrative pages retain their dedicated navigation.                                                                                                                                                     |
| Today and weather        | One compact greeting and outfit introduction. Shared, clickable weather retains location, icons, high/low temperatures, rain, and detailed conditions. Occasion previews explain how to request another kind of look. Save, swap, wear, and plan remain separate actions.                                                                                                   |
| Sebastian                | A conversation stays mounted between pages. Sidebar/mobile access opens general chat. Contextual buttons prepare editable drafts about an item, outfit, date, or trip. A selected item is loaded independently of the bounded wardrobe shortlist.                                                                                                                           |
| Wardrobe and outfits     | Calmer collections, flat clothing cards by default, optional category grouping, existing filters and alternate outfit visualization. Sizes and fuller setup remain available.                                                                                                                                                                                               |
| Onboarding               | Confirm three essentials, or a dress and shoes, then open Today. Nothing is preselected as owned. Choices survive reload. The longer wizard remains available. A batch saves atomically and retries do not duplicate it.                                                                                                                                                    |
| Add clothing             | Explicit camera, photo library, and ready-made default AI image choices. Name/category come first; other details are optional. Save and add another supports repeated entry. Default assets use no generation allowance.                                                                                                                                                    |
| Clothing photos          | Validated, resized photos use private storage. Originals stay available. Background removal produces a candidate for review. Users choose original or cleaned. A newer photo or item edit detaches older image work. One complete piece per photo is the supported intake; there is no multi-garment segmentation or in-app crop editor.                                    |
| Photo detail suggestions | Explicit paid vision action suggests name, category, and color from an owned photo. Suggestions stay in review until applied. They use the existing vision allowance and durable AI jobs. Brand, fabric, and size remain user-entered.                                                                                                                                      |
| Planner and trips        | Upcoming, Calendar, and Trips tabs. Calendar thumbnails show three pieces and an overflow count; details expose every layer/accessory. Multiple entries per date remain supported. Entry/piece edits save in one transaction. Custom plans stay separate from saved outfits. Deletion requires confirmation. Trip packing behavior remains connected to its planned pieces. |
| Analytics                | Overview, Clothing, Wear history, and Cost per wear. Period, category, search, and history drill-down use confirmed calendar wears. Prices are optional; cost per wear uses lifetime wears and keeps currencies separate.                                                                                                                                                   |
| Export and support       | Outfit PNGs contain all pieces. Sharing sends an image file or downloads one for the user to share. Support fields have persistent associated labels. The Pro export gate remains.                                                                                                                                                                                          |

Subscription prices, paid monthly allowances, existing main URLs, ownership checks, and impersonation restrictions are preserved. Later experiments from the review—laundry/availability tracking, batch clothing capture, packing optimization, public outfit links, and autonomous assistant edits—are not part of this release.

## AI protections and routing

All active billable entry points reserve an operation before calling a provider. The shared PostgreSQL job ledger owns metering, idempotency, budgets, and trusted handles. Authenticated clients cannot reset counters, call the reservation RPC, or forge trusted assistant/job records. Direct Edge calls enforce the same ownership and paid-plan rules.

- The source default for text/vision is direct OpenAI `gpt-6-luna`. The explicit allowlist also permits `gpt-6.1-terra`. There is no automatic escalation to a more expensive model.
- Responses use no tools, reasoning effort `none`, bounded prompts/history, and 1,024 output tokens by default, with a configuration maximum of 2,048. Background responses provide a resumable handle; the application attempts deletion after persisting a terminal result.
- Replicate text routing remains an explicit rollback option. A polling failure reuses the known prediction; it does not restart a paid POST. Capacity/account-limit failures do not trigger uncontrolled provider switching.
- Wardrobe illustration uses one Imagen 4 output followed by background removal. Photo cleanup uses `851-labs/background-remover`. The example configuration pins its version. Each image phase records its model, version, handle, and completion state. Replicate predictions have a provider-side 60-second cancellation deadline.
- Courtesy regeneration is limited to one eligible retry of an original successful wardrobe-image job within five minutes. It still consumes a spending reservation and burst allowance. Pending work resumes its original prediction.
- New AI reservations stop at the configured daily/monthly application and per-user budgets. Failed or uncertain provider attempts keep their reservation. A browser timeout does not prove that a charge was avoided.
- Vision accepts validated, owned storage images and short-lived URLs. It rejects unrelated hosts, another user's files, invalid formats, oversized files, and excessive dimensions. Provider outputs must come from the approved delivery host and pass bounded download checks.
- Normal uploads still work when AI is disabled or the AI spending budget is full, subject to a separate finite upload allowance. Background cleanup can fall back to the original photo.
- Unused outfit-image endpoints return HTTP 410. Deploy the retired Edge stub so an older unprotected function does not remain callable.
- Private credentials stay in trusted runtime configuration. Secret-dependent modules have `server-only` boundaries; logging redacts credential fields and values. The build environment check rejects missing AI credentials, invalid spending configuration, and known private credentials named with `NEXT_PUBLIC_`.

The default application budgets are **$25/day, $250/calendar month globally, $150/calendar month per user, and two active AI jobs per user**. These are conservative admission controls based on reserved estimates, not provider invoices. The current reservation ceilings are $0.02 for routine text, $0.05 for Terra text, $0.15 for vision, $0.10 for a wardrobe illustration, and $0.05 for photo cleanup. They intentionally reserve more than an ordinary request should cost. Actual provider cost remains unknown unless independently reconciled; the application does not label reservations as billed cost.

Photo cleanup allowances are 100/500/2,000 per month for Free/Plus/Pro. Non-AI uploads have separate 200/1,000/4,000 allowances. These paths share a 20-per-hour abuse limit. Paid AI operation allowances and their existing plan burst limits remain in force.

These controls cover calls made through this application. Existing provider charges and other scripts/keys are outside the ledger. Configure provider-side project/organization spending controls separately. Those account settings were not inspected or changed. Keep production and evaluation billing contexts separate.

The new job ledger retains server-side result data to support retry/recovery. Account deletion scrubs user-associated result text, image references, handles, and fingerprints while retaining anonymous spending totals. The existing `cleanup_assistant_data` helper does not schedule itself or prune the new ledger. This release does not add a new timed retention policy; review administrative retention together with provider/account retention before promising a specific expiry period.

Model compatibility was checked through official documentation and a read-only model metadata request. Provider failure/retry behavior is covered with mocks. Real wardrobe-photo accuracy, first-response latency, and billed cost still need a small staging evaluation. No benchmark or percentage savings claim is made.

Sources: [OpenAI Luna model](https://developers.openai.com/api/docs/models/gpt-6-luna), [OpenAI background responses](https://developers.openai.com/api/docs/guides/background), [OpenAI spending controls](https://developers.openai.com/api/docs/guides/spend-limits), [Replicate prediction deadlines](https://replicate.com/docs/topics/predictions/create-a-prediction), [Imagen 4](https://replicate.com/google/imagen-4), [background remover](https://replicate.com/851-labs/background-remover).

## Local verification and preview

The implementation plan and initial adversarial pass are in [PLAN.md](./PLAN.md). Machine-readable evidence is beside this file:

- `verification.json`: final build, type, lint, test, and Edge-check results.
- `database-validation.json`: 21 real PostgreSQL checks, including first-row races, duplicate requests, budget caps, grants, storage restrictions, account deletion, atomic onboarding, atomic calendar saves, injected rollback failures, and stale image workers.
- `browser-validation.json`: browser workflow checks and responsive coverage using real components with explicit synthetic I/O.
- `client-secret-validation.json`: exact local private credential values compared with built browser assets; counts and matching file names only.
- `browser-evidence/`: desktop/mobile screenshots and the actual PNG produced by the export component.

The browser preview is [the local component preview](http://127.0.0.1:4180/docs/experience-implementation/browser/). It uses real application components, synthetic account/wardrobe records, browser-local saves, and mocked backend/provider responses. It does not authenticate against Supabase or run AI. This boundary makes the visual and interaction checks repeatable without spending or changing a real account.

```sh
npm run verify:env
npm run typecheck
npm run lint:strict
npm run test:run
npm run build
node scripts/check-client-secrets.mjs
DENO_DIR=/tmp/closet-deno-cache deno check --no-lock supabase/functions/process-image/index.ts supabase/functions/generate-wardrobe-item-image/index.ts supabase/functions/generate-outfit-image/index.ts
node scripts/build-experience-fixtures.mjs
node scripts/serve-experience-fixtures.mjs
```

Run the browser checks in another terminal with a local Playwright installation:

```sh
node scripts/check-experience-browser.mjs
```

`PLAYWRIGHT_MODULE` can point to an existing Playwright module, and `CHROME_EXECUTABLE_PATH` can select a Chrome binary. On macOS the script defaults to installed Google Chrome; elsewhere it uses Playwright's browser. The fixture server binds only to loopback.

The SQL runner accepts only a container with its exact test label. It never reads the application environment or connects to a hosted database. To reproduce in an isolated disposable PostgreSQL 16 container:

```sh
docker run --detach --rm --name closet-experience-20261106-ada4 --label codex.task=closet-experience-20261106 --network none --memory 512m --cpus 2 --env POSTGRES_PASSWORD=local-fixture-only postgres:16
docker exec closet-experience-20261106-ada4 pg_isready -U postgres
node scripts/test-ai-database.mjs
docker stop closet-experience-20261106-ada4
```

Wait for PostgreSQL to report ready before running the tests. The runner recreates only `closet_ai_tests` inside that labeled container. This repository lacks a complete baseline Supabase schema/configuration, so the test harness supplies minimal prerequisite tables and roles. It validates the seven new migrations and their invariants; it is not a rehearsal against a full production database clone.

## Deployment order

Use a staging Supabase project and a matching application deployment first. The local fixture preview cannot verify a real login, deployed RLS, hosted Edge worker lifetime, native phone camera, or provider billing.

1. **Back up and inventory the target.** Record its migration history, plan catalog, function deployments, storage policies, and provider configuration. Check for existing custom tables/policies before applying the new migrations. Keep the current build available.
2. **Prepare runtime configuration.** Put server credentials in the application runtime and Supabase function secrets, never in `NEXT_PUBLIC_` variables. Set `AI_ENABLED=false` in both application and Edge environments for the cutover. Confirm provider-side spending controls before enabling inference.
3. **Replace the Edge entry points during a short, coordinated intake/AI maintenance window.** Deploy `process-image`, `generate-wardrobe-item-image`, and the retired `generate-outfit-image` stub from this branch. Before the database update, new handlers fail closed if the reservation schema is absent. Uploads and AI may be unavailable until the application cutover finishes. This also removes the older direct-function bypass. Preserve required gateway JWT verification and the handlers' own `getUser` checks.
4. **Apply these seven migrations in timestamp order:**

   ```text
   20261106090000_authoritative_ai_jobs.sql
   20261106091000_private_clothing_images.sql
   20261106092000_idempotent_today_outfits.sql
   20261106093000_atomic_onboarding.sql
   20261106094000_ai_audit_and_policy_alignment.sql
   20261106095000_atomic_calendar_entries.sql
   20261106100000_preserve_newer_clothing_choices.sql
   ```

   Use the project's established migration process and the verified target project. Do not run the fixture setup SQL against staging or production.

5. **Deploy the Next.js application.** The Netlify build runs `verify:env` before `build`. Keep the application and Edge functions on the same reviewed policy values. Test private-image reads and original uploads while AI remains disabled.
6. **Run the staging acceptance checks below.** Then enable AI in staging with a small explicit evaluation budget and check one request for each task. Observe the job, operation counter, provider handle, completion, and actual provider usage. Refresh/retry each request and verify that it does not create another prediction.
7. **Repeat the same cutover in production after acceptance.** Enable production AI only when the deployed functions, migrations, application version, keys, and policy settings agree. Verify one owned private image and one bounded AI operation after release.

### Configuration locations

| Setting                          | Application runtime                                                         | Supabase Edge secrets                                                 |
| -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Supabase URL and publishable key | Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase runtime values                                               |
| Privileged database access       | `SUPABASE_SERVICE_ROLE_KEY`                                                 | `SUPABASE_SERVICE_ROLE_KEY` supplied by Supabase                      |
| Direct text/vision               | `AI_TEXT_PROVIDER=openai`, `OPENAI_TEXT_MODEL=gpt-6-luna`, `OPENAI_API_KEY` | Not used by image workers                                             |
| Replicate image work             | `REPLICATE_API_TOKEN` for compatible server routing/configuration           | `REPLICATE_API_TOKEN`, `REPLICATE_BG_MODEL`, `REPLICATE_BG_VERSION`   |
| Spending and kill switch         | All `AI_*` policy values from `.env.example`                                | `AI_ENABLED`, daily/monthly/user budgets, max in-flight policy values |
| Browser origins                  | Existing application URL/origin configuration                               | `PRODUCTION_URL` and any applicable preview origin                    |

`AI_ENABLED=false` stops new AI reservations. Already accepted provider work can finish; its reserved cost remains counted. Non-AI originals continue through the validated upload path. Neither deleting an application job nor closing a browser cancels a provider bill.

New originals and generated clothing images use the private bucket and authenticated `/api/clothing-images/...` route. Existing public clothing images remain accessible to avoid breaking saved wardrobes. Moving historical public images into private storage is a separate migration; this release does not retroactively make old URLs private. Exporting a PNG deliberately copies the user's selected outfit into a file they can share.

### Staging acceptance checks

- Use fresh Free, Plus, and Pro accounts. Confirm plan gates, allowances, and account utilities. Exercise admin navigation and read-only impersonation, including job status polling.
- Complete both quick-start templates, reload an unfinished setup, use the full wizard, and retry a save after interrupting its response. Confirm no invented ownership, duplicate items, or partial batch.
- Take a phone photo against a real room/background, choose a library photo, and select a default image. Save before cleanup completes. Compare original/cutout; choose either and reload. Replace the photo while an earlier job is pending and confirm the newer choice remains.
- Run one photo detail suggestion. Check that it consumes one vision operation, uses only the account's categories, leaves uncertain fields editable, and applies nothing until requested. Retry the same request and inspect the same job ID.
- Switch Today occasions, see another look, swap one piece, save, record a wear, and plan another date. Test both separates and dress wardrobes.
- Put two outfits on one date. Edit only notes, then one accessory, and confirm the recorded pieces remain correct. Cancel deletion, then confirm deletion. Test a local date near a UTC day boundary.
- Plan a trip, change an outfit slot, and check its packing list. Verify packed-item state and duplicate-piece behavior.
- Add an optional price, log a real wear, and check Analytics history and lifetime cost per wear. Keep an unknown price blank and verify multiple currencies remain separate. Saved/planned outfits must not increase wear totals.
- Export a seven-piece outfit, inspect the PNG, and test native image sharing on a phone. A recipient should receive the image file.
- From a normal user session, try direct counter writes and reservation RPC calls, direct free-account image generation, another user's photo/job/item, exhausted budgets, repeated request IDs, and concurrent requests. Verify denial before provider creation. Do this only in the staging project.
- Verify provider failures, network interruptions, quota errors, and worker resumption. Inspect application/Edge logs for safe error codes, and compare job counts with provider predictions and billed usage.

### Operations and rollback

Use provider dashboards for billed usage. For application admission totals, query `ai_jobs` through a trusted administrative connection and group `coalesce(actual_cost_micros,reserved_cost_micros)` by task and day. Keep unknown actual costs labeled as unknown. Do not reduce reservations merely because a request failed locally.

If a release problem appears, set `AI_ENABLED=false` in both runtimes and keep normal wardrobe/planning available where possible. Prefer a compatible application rollback or forward fix. The old application expects client metering writes and public image behavior; restoring it alone is not a safe rollback. Do not restore counter/message write grants, remove the spending ledger, make the private bucket public, or redeploy the old unprotected Edge functions. The new schema is additive; preserve user data and investigate with the database backup available.

## Local-testing follow-up: weather and Trips

The November 6 follow-up keeps weather in the shared header when preferences are loading, disabled, or unavailable. The detail dialog can enable weather or retry the preference query. Weather data now uses `/api/weather`, backed by the same handler as Netlify, so plain `next dev` and `next start` work without a Netlify-only URL. The local server was rebuilt and restarted on port 3000. An invalid-coordinate request confirmed the real route returns HTTP 400 without a provider call.

Trips now has a compact selector/overview, a date strip with forecast status, one selected day and look, and separate **Outfits by day** and **Packing list** workspaces. Multiple daily looks and every piece remain available. Packing derives from planned pieces, deduplicates shared clothing, retains packed/manual entries, and saves checkbox changes normally. It needs no separate rebuild action. Showing the list does not write to the database.

Forecast cards show the selected destination/date, high/low, rain, and a clothing suggestion. Past dates and dates outside the forecast window are labeled clearly; neutral 60°/70° planning defaults are not presented as actual weather. Contextual Sebastian drafts carry the selected destination forecast, or an explicit unavailable source.

Trip creation and details use dialogs. Deletion requires confirmation. Shortening dates identifies planned looks that would be removed and requires a checkbox before saving. Cancel discards detail edits. Existing looks are kept by default when planning; calendar syncing is an explicit option. New combinations still use the existing local algorithm and consume no AI credits. This follow-up needs no additional database migration.

The follow-up browser suite is `scripts/check-trips-browser.mjs`; its six checks and four screenshots are recorded in `trips-browser-validation.json` and `browser-evidence/`. The shared suite now has 34 checks, including phone header off/loading/error states. The full test suite has 2,373 passing tests and four existing skips. Types, strict lint, and the production build pass. These workflow checks use real components with synthetic persisted I/O; actual-account acceptance remains the user's local/staging test.

## November 6 model evaluation and release

The live comparison in `../ai-image-comparison-2026-11-06/report.html` produced 32 finished images across four runnable models for an estimated $0.617 including background removal. Imagen 4 and Imagen 4 Fast rejected inference as discontinued despite successful metadata reads. GPT Image 2.6 Flare rejected inference because the direct OpenAI account had no credits. These availability failures supersede the earlier model-catalog-only assessment.

Clothing illustration jobs now reserve an explicit supported model and resume with that stored model. The new default is `black-forest-labs/flux-2-klein-4b`, with `prunaai/p-image` as an explicitly configurable alternative through `REPLICATE_WARDROBE_MODEL`. There is no automatic model substitution. The conservative $0.10 image admission reservation remains in place. Photo cleanup still uses the pinned 851 background-remover version.

The production release preserves the existing Replicate text provider using `openai/gpt-5-mini`, verified with a tiny synthetic readiness request. `REPLICATE_FALLBACK_MODEL` is set to the same model. Direct GPT-6 Luna remains a source-supported option once OpenAI credits are available. Neither the official model catalog nor this account exposes GPT-6.1 Luna.

Release preparation saved schema/data and deployed-function backups in the ignored, restricted `tmp/` directory, recorded the prior Netlify deployment, and rehearsed all seven migrations against the hosted schema in a transaction ending in ROLLBACK. A first-use preferences fix removes an obsolete `account_tier` column from database writes; the schema parser still supplies its legacy UI default. The calendar link test now uses a local date to match the page after UTC midnight.

Deployment completion and hosted acceptance evidence will be recorded separately when the release checks finish. No provider billing balance was changed.
