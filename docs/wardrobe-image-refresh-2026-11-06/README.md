# Wardrobe default-image refresh

The category choices and replacement pipeline are implemented. **68 reviewed replacements are applied locally; the full batch and production deployment are waiting for Replicate credit.**

The API reports that account `spyke01` has less than $5 credit and is restricted to six prediction starts per minute. The selected 1,258-image refresh is estimated at $51.19 including background removal. Its separate operator admission ceiling is $70. About $1.68 of provider usage is estimated so far; this is not an invoice reconciliation. New paid batch work is held to preserve remaining production credit. The user was asked to add $75 prepaid credit; unused credit remains available to the site. Billing and auto-reload settings were not changed.

| Clothing | Selected route |
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

The 43-image pilot covers all 37 clothing types, with both models for six types. Choices reflect the pilot plus the preceding eight-piece comparison. They are a visual screening judgment, not a statistical ranking. Pruna and Schnell are excluded from new work. The Nano tie clipped its top; the complete Klein version was selected. One purple T-shirt variant was held because its color was too pale and blue. Unsubmitted color prompts now include the palette's approximate hex reference. Accepted provider inputs and handles were not changed.

`selected-preview.html` is a self-contained, zoomable comparison of the original and selected image for all 37 types. It includes every image and needs no local server. `category-decisions.json` records the routes and reasons. `replacement-manifest.json` records the 68 locally applied files and their reviewed source/rendered hashes. `PLAN.md` contains the implementation and adversarial pass.

## Asset behavior

The logical catalog retains all 1,295 original PNG names. The 37 multicolor assets remain unchanged pending a pattern-specific brief. Original PNGs remain available as rollback sources. Every catalog entry has a WebP counterpart; approved new WebPs replace the corresponding old derivative. The app requests these derivatives with a release version so browser caches do not hide the refresh. A before-files rewrite keeps saved PNG references working. No account photos, private images, user wardrobe rows, or branded legacy assets were changed.

Generated 1,024px PNGs are retained under ignored `tmp/wardrobe-refresh-2026-11-06/`. The site uses WebP at quality 95 with preserved alpha. The 68 approved images occupy about 8.28 MB as WebP compared with 77.35 MB for their generated PNG sources. Their original PNGs are also backed up under the staging directory.

## Verification

- 2,397 tests pass, with four existing skips. Strict lint and application types pass.
- The Next.js production build passes through the repository's Webpack path. Local Turbopack worker-port binding is blocked by the environment; no application workaround was shipped for that environment limitation.
- All three protected Edge entry points pass Deno checks. The new Nano route has been tested through provider inference and shared routing tests, but is not deployed yet.
- The 34 real-component browser checks pass with synthetic I/O. Local production requests verify that legacy PNG and new versioned WebP URLs return matching image bytes.
- Nine local private credential values were compared with 198 built browser assets: no matches. This is a scoped build check, not a historical credential audit.
- Spending, ambiguous POSTs, definite rate-limit retries, exclusive writer locks, publication locks, and the explicit funding hold have regression coverage. Structural checks inspect output dimensions, transparency, foreground coverage, and edge cropping. Visual decisions bind to the exact reviewed PNG hash.

## Resume after funding

Confirm credit was added to account `spyke01` before issuing new paid requests. Keep the current ledger; it contains accepted prediction handles, saved originals, reservations, and review decisions.

```sh
node --import tsx scripts/refresh-wardrobe-library.ts
node --import tsx scripts/refresh-wardrobe-library.ts --run --resume-funded --pace-ms=1250
node scripts/render-wardrobe-refresh-review.mjs --full --pending --screenshots
```

The first command is a dry run. The funded resume reuses existing handles and resumes the pending lavender T-shirt cleanup without generating that piece again. New intent is persisted before POST; unknown submissions are not repeated. A definite 429 honors the provider's retry window. If Replicate again reports less than $5, the batch stops rather than consuming the remaining wallet. The $70 ceiling includes failed and uncertain reservations and cannot be raised by a command-line argument. No automatic credit purchase, auto-reload change, paid-model substitution, or unbounded regeneration is supported.

Review the new sheets, store exact candidate-hash decisions in staging `reviews.json`, and apply only approved results after generation finishes:

```sh
node scripts/apply-wardrobe-refresh.mjs --apply
node scripts/render-selected-wardrobe-preview.mjs
```

The apply command holds the same exclusive lock as the generation writer. It preserves original PNGs and atomically replaces approved WebP derivatives. Complete the remaining visual review and catalog integrity checks before pushing the production release. Deploy the updated `generate-wardrobe-item-image` function first while its existing explicit Klein override remains valid, then set its `REPLICATE_WARDROBE_MODEL` secret to `auto`. Existing jobs retain their reserved model. No new database migration is required for this refresh.

Pricing/model references: [Klein 4B](https://replicate.com/black-forest-labs/flux-2-klein-4b), [Nano Banana 2](https://replicate.com/google/nano-banana-2), [background removal](https://replicate.com/851-labs/background-remover), and [Replicate rate limits](https://replicate.com/docs/topics/predictions/rate-limits).
