# Wardrobe default-image refresh

**1,199 reviewed replacements are applied and validated.** Publication status and deployment evidence are recorded in [verification.json](verification.json).

The refresh covers all 1,258 solid-color defaults across 37 catalog clothing types. All targets produced a structurally valid candidate. Visual review retained 59 originals because their replacements had color drift, extra clothing or shoe fragments, an unclear view, an unsuitable style, or an awkward pair arrangement. The 37 multicolor defaults also remain unchanged until their patterns have a separate brief. Pruna and Schnell are excluded from new work.

| Clothing | Selected model |
| --- | --- |
| Plain tops, cardigans, hoodies, quarter zips | Klein 4B |
| Blouses, buttoned shirts, knit sweaters | Nano Banana 2 |
| Chinos, trousers, shorts, skirts, leggings | Klein 4B |
| Jeans | Nano Banana 2 |
| Tailored layers and dresses | Nano Banana 2 |
| Loafers | Klein 4B |
| Other footwear | Nano Banana 2 |
| Ties and watches | Klein 4B |
| Belts and scarves | Nano Banana 2 |

The 43-output pilot covered every clothing type and compared both models for six types. Final choices reflect that pilot, the preceding eight-piece comparison, and the full color review. These are visual screening judgments. [Category decisions](category-decisions.json) records the choices; [review holds](color-review.json) records each retained candidate and reason.

## Assets and quality

The logical catalog retains all 1,295 PNG names. Every entry has a WebP counterpart. Reviewed new derivatives replace their corresponding defaults; retained entries keep their original appearance. The app requests versioned derivatives to avoid stale browser caches. Legacy PNG requests resolve to the matching WebP. No existing account photos, private wardrobe rows, or branded legacy assets were replaced.

The approved 1,024px images occupy **173.71 MB as WebP**, compared with **1421.21 MB** for the generated PNG sources. WebP uses quality 95 with full alpha quality. Original catalog PNGs remain unchanged, and full-resolution generated sources and backups remain in ignored workspace staging.

[The self-contained comparison](selected-preview.html) shows the original and selected image for all 37 types, with category filters, dark backgrounds, model labels, and zoom. It needs no server. [The replacement manifest](replacement-manifest.json) binds each published derivative to its exact reviewed source hash, model, and rendered hash.

## Cost and controls

Completed prediction usage is estimated at **$51.14**, separate from provider invoices. Accepted failed phases without a returned usage estimate retain another **$0.220** in conservative ceilings. Total admission reservations are **$60.188** against the unchanged **$70 cap**. Failed, canceled, and uncertain attempts remain counted. The user added credit and configured auto reload; the agent made no billing-setting changes.

The batch held one exclusive writer, persisted intent before every paid POST, resumed known prediction IDs with GET, honored provider retry windows, and bounded worker count, outputs, downloads, and cancellation deadlines. Two cleanup retries reused their saved generated images. Three known terminal empty/failed generations received one explicit retry each. Earlier attempts and costs remain in the ledger. Unknown POST outcomes were never repeated. Application requests retain their separate per-user allowances, global spending reservations, and concurrency limits. Ready-made library choices require no new image-generation call.

## Verification and deployment

- The full suite passed 2,402 tests, with four existing skips. The final focused checks passed 27 tests, including added routing and approval checks. Strict lint and types pass.
- The local production build passed through Webpack. Local Turbopack worker-port binding remains an environment limitation. The application source has not changed since that successful build; hosted publication performs a fresh production build.
- All 1,295 WebPs decode correctly at 1,024px with alpha. All original catalog PNGs remain unchanged. All 1,199 replacements match their approved source and derivative hashes.
- Local legacy PNG and versioned WebP requests pass for all 37 clothing types. Thirty-seven white pieces were inspected against a dark background; visual review also covered every candidate against its original.
- Nine private local credential values were checked against 198 built browser assets: zero matches. This is a scoped bundle check.
- A real Nano job completed through hosted category routing in an isolated temporary Plus account, including cleanup, private storage, and replay without another reservation. The account and owned storage were removed. [Hosted routing evidence](production-routing-validation.json) records the check.
- The updated generation and processing functions are deployed to project ahjwzpyammiqelloazvn. Routing uses the owned item and its category, supports the reviewed Klein/Nano models, and preserves each saved job's model. The 34 local and hosted migrations match; this image refresh needs no new SQL.

## Reproducibility

[The plan](PLAN.md) includes the adversarial pass. The operator scripts are refresh-wardrobe-library.ts, render-wardrobe-refresh-review.mjs, and apply-wardrobe-refresh.mjs under scripts/. Future application prompts are in supabase/functions/_shared/wardrobe-photo-prompt.ts. Generation and editing used the user-selected Replicate API models and the pinned 851-labs background remover. Exact per-image prompts, accepted handles, raw PNGs, prepared PNGs, review decisions, and prior attempts remain under ignored tmp/wardrobe-refresh-2026-11-06/. Preserve that ledger when resuming; never reset prediction IDs or reservations.

Pricing references: [Klein 4B](https://replicate.com/black-forest-labs/flux-2-klein-4b), [Nano Banana 2](https://replicate.com/google/nano-banana-2), [background removal](https://replicate.com/851-labs/background-remover).
