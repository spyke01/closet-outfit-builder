# Clothing image comparison — November 6, 2026

The live comparison produced 32 finished synthetic clothing images: eight prompts across P-Image, FLUX.2 Klein 4B, FLUX Schnell, and Nano Banana 2. Imagen 4 and Imagen 4 Fast rejected inference as discontinued. GPT Image 2.6 Flare rejected inference because the configured OpenAI account has no credits. Metadata access alone did not establish inference availability.

Open `report.html` for the interactive comparison. Switch pieces, compare original/cutout versions, and use light/dark backgrounds. `results.json` records inputs, provider prediction IDs, timings, estimated charges, and the local admission ledger. `review.json` contains the subjective visual review. Full-resolution original PNGs are retained in the ignored `tmp/image-model-benchmark-2026-11-06/` directory.

The primary comparison used the production prompt builder and the same pinned background remover, with no model-specific prompt rewrites or paid regeneration. Initial rate-limit rejections were retried with pacing; accepted predictions were reused. Unknown submission outcomes are never retried automatically. No real wardrobe records or photos were sent.

Estimated total for the 32 outputs and cleanup is $0.617. The admission ledger reserved $1.80 against a $5 ceiling. These are estimates and conservative reservations, not provider invoice totals. A separate tiny Replicate chat readiness probe is not included in the image estimate.

To resume an interrupted evaluation, use `node --import tsx scripts/benchmark-clothing-images.ts --run`. The default without `--run` performs no inference. To refresh the report, use `node scripts/render-clothing-comparison.mjs`. Inspect the ledger before starting a new evaluation; do not remove accepted prediction handles merely to retry.

The reviewed default is FLUX.2 Klein 4B for inexpensive representative images. It has clear detail-following limits, documented beside each image. A user's own photograph plus background removal remains the best source for their actual garment.

Current pricing references: [Klein](https://replicate.com/black-forest-labs/flux-2-klein-4b), [P-Image](https://replicate.com/prunaai/p-image), [Schnell](https://replicate.com/black-forest-labs/flux-schnell), [Nano Banana 2](https://replicate.com/google/nano-banana-2), [background removal](https://replicate.com/851-labs/background-remover).
