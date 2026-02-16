#!/usr/bin/env tsx

import fs from 'node:fs/promises';
import path from 'node:path';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type ComparisonModel = {
  slug: string;
  label: string;
  estimatedCostUsdPerImage?: number;
  approximateCostDisplay?: string;
  costNote?: string;
};

type Prediction = {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: unknown;
  error?: string | null;
  created_at?: string;
  completed_at?: string;
  urls?: {
    get?: string;
  };
};

class RateLimitError extends Error {
  retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

type ResultRow = {
  model: string;
  label: string;
  status: 'succeeded' | 'failed' | 'dry-run';
  imagePath: string | null;
  outputUrl: string | null;
  estimatedCostUsdPerImage: number | null;
  approximateCostDisplay: string | null;
  costNote: string;
  elapsedSeconds: number | null;
  error: string | null;
};

const DEFAULT_OUT_DIR = 'tmp/model-comparison';
const DEFAULT_CATEGORY = 'Tops';
const DEFAULT_SUBCATEGORY = 'T-Shirt';
const DEFAULT_COLOR = 'navy';
const DEFAULT_BRAND = '';
const DEFAULT_MATERIAL = '';
const DEFAULT_TIMEOUT_SECONDS = 240;
const DEFAULT_POLL_INTERVAL_MS = 1_500;
const DEFAULT_CREATE_RETRIES = 4;
const DEFAULT_INTER_REQUEST_DELAY_MS = 11_000;

const SUBCATEGORY_MATERIAL_MAP: Record<string, string> = {
  'T-Shirt': 'cotton jersey',
  Polo: 'cotton pique',
  OCBD: 'oxford cotton',
  'Dress Shirt': 'cotton poplin',
  Blouse: 'silk blend',
  'Tank Top': 'cotton rib',
  Sweater: 'wool knit',
  Cardigan: 'knit wool blend',
  Hoodie: 'cotton fleece',
  'Quarter Zip': 'merino wool knit',
  Jeans: 'denim',
  Chinos: 'cotton twill',
  Trousers: 'wool blend',
  Shorts: 'cotton twill',
  Skirt: 'cotton blend',
  Leggings: 'stretch jersey',
  Sneakers: 'leather and mesh',
  Loafers: 'leather',
  Boots: 'leather',
  'Dress Shoes': 'polished leather',
  Heels: 'leather',
  Flats: 'leather',
  Sandals: 'leather',
  Blazer: 'wool blend',
  Sportcoat: 'textured wool',
  Jacket: 'cotton canvas',
  Coat: 'wool blend',
  'Mini Dress': 'crepe',
  'Midi Dress': 'silk blend',
  'Maxi Dress': 'lightweight cotton',
  'Cocktail Dress': 'satin blend',
  'Casual Dress': 'cotton jersey',
  Belt: 'leather',
  Tie: 'silk',
  Watch: 'stainless steel',
  Scarf: 'wool',
};

const DEFAULT_MODELS: ComparisonModel[] = [
  {
    slug: 'google/imagen-4-fast',
    label: 'Google Imagen 4 Fast',
    estimatedCostUsdPerImage: 0.02,
    approximateCostDisplay: '$0.02',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'google/imagen-4',
    label: 'Google Imagen 4',
    estimatedCostUsdPerImage: 0.04,
    approximateCostDisplay: '$0.04',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'google/imagen-4-ultra',
    label: 'Google Imagen 4 Ultra',
    estimatedCostUsdPerImage: 0.06,
    approximateCostDisplay: '$0.06',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'google/nano-banana-pro',
    label: 'Google Nano Banana Pro',
    estimatedCostUsdPerImage: 0.15,
    approximateCostDisplay: '$0.15',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'bytedance/seedream-4.5',
    label: 'Bytedance Seedream 4.5',
    estimatedCostUsdPerImage: 0.04,
    approximateCostDisplay: '$0.04',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'ideogram-ai/ideogram-v3-turbo',
    label: 'Ideogram v3 Turbo',
    estimatedCostUsdPerImage: 0.03,
    approximateCostDisplay: '$0.03',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'black-forest-labs/flux-schnell',
    label: 'FLUX.1 Schnell',
    approximateCostDisplay: 'Less than $0.01',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'black-forest-labs/flux-1.1-pro',
    label: 'FLUX 1.1 Pro',
    estimatedCostUsdPerImage: 0.04,
    approximateCostDisplay: '$0.04',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'prunaai/p-image',
    label: 'Pruna P-Image',
    approximateCostDisplay: 'Less than $0.01',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
  {
    slug: 'qwen/qwen-image',
    label: 'Qwen Image',
    estimatedCostUsdPerImage: 0.03,
    approximateCostDisplay: '$0.03',
    costNote: 'From your Replicate predictions dashboard sample.',
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toKebabCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getMaterialForSubcategory(subcategory: string, overrideMaterial?: string): string {
  if (overrideMaterial && overrideMaterial.trim().length > 0) {
    return overrideMaterial.trim();
  }

  return SUBCATEGORY_MATERIAL_MAP[subcategory] ?? 'fabric';
}

function buildPrompt(params: {
  colorLabel: string;
  material: string;
  garment: string;
  brand: string;
}): string {
  const { colorLabel, material, garment, brand } = params;
  const resolvedBrand = brand.trim();

  return [
    '## Transparent Background Garment Image Generator Prompt',
    '',
    `Create a high-resolution product-style PNG image of a **${colorLabel} ${material} ${garment}** with a fully transparent background.`,
    '',
    '### Garment Requirements',
    '',
    '- The garment must be fully visible from top to bottom',
    '- No cropping of sleeves, hems, collars, cuffs, waistbands, or edges',
    '- Centered and perfectly straight',
    '- Realistic proportions and accurate construction',
    '- Clear fabric texture and material detail',
    '- Even soft studio lighting',
    '- Clean, sharp edges suitable for compositing',
    '- No distortion',
    '',
    '### Background Requirements',
    '',
    '- Fully transparent background',
    '- No shadows touching a visible surface',
    '- No floor line',
    '- No gradient',
    '- No color backdrop',
    '- No halo artifacts',
    '',
    '### Style Requirements',
    '',
    '- Minimal, modern e-commerce aesthetic',
    '- No model',
    '- No props',
    '- No dramatic lighting',
    '- No excessive wrinkles',
    '- Clean, crisp presentation',
    '',
    '### Brand Handling (Optional)',
    '',
    `Brand provided: **${resolvedBrand || 'None'}**`,
    '- If brand is provided, include subtle, realistic styling consistent with the brand',
    '- Do not exaggerate logos',
    '- No oversized branding unless typical for the garment type',
    '',
    '### Output Specifications',
    '',
    '- Square image',
    '- Generous padding around the garment',
    '- Balanced composition suitable for grid slicing',
    '- PNG format with true transparency',
  ].join('\n');
}

function extractImageUrl(output: unknown): string | null {
  if (typeof output === 'string') {
    return output;
  }

  if (!Array.isArray(output)) {
    return null;
  }

  for (const entry of output) {
    if (typeof entry === 'string') {
      return entry;
    }

    if (entry && typeof entry === 'object') {
      const maybeUrl = (entry as { url?: unknown }).url;
      if (typeof maybeUrl === 'string') {
        return maybeUrl;
      }
    }
  }

  return null;
}

async function createPrediction(params: {
  token: string;
  model: string;
  prompt: string;
}): Promise<Prediction> {
  const [owner, modelName] = params.model.split('/');
  if (!owner || !modelName) {
    throw new Error(`Invalid model slug: ${params.model}`);
  }

  const response = await fetch(`https://api.replicate.com/v1/models/${owner}/${modelName}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        prompt: params.prompt,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let retryAfterMs: number | undefined;

    try {
      const parsed = JSON.parse(text) as { retry_after?: unknown; detail?: unknown };
      if (typeof parsed.retry_after === 'number' && Number.isFinite(parsed.retry_after)) {
        retryAfterMs = Math.max(0, parsed.retry_after * 1000);
      }
    } catch {
      // Ignore JSON parsing issues and fall back to generic error handling.
    }

    if (response.status === 429) {
      throw new RateLimitError(`Create prediction failed (${response.status}): ${text}`, retryAfterMs);
    }

    throw new Error(`Create prediction failed (${response.status}): ${text}`);
  }

  return (await response.json()) as Prediction;
}

async function createPredictionWithRetry(params: {
  token: string;
  model: string;
  prompt: string;
  maxRetries: number;
}): Promise<Prediction> {
  for (let attempt = 1; attempt <= params.maxRetries; attempt += 1) {
    try {
      return await createPrediction({
        token: params.token,
        model: params.model,
        prompt: params.prompt,
      });
    } catch (error) {
      const isLastAttempt = attempt === params.maxRetries;
      if (!(error instanceof RateLimitError) || isLastAttempt) {
        throw error;
      }

      const backoffMs = 5_000 * attempt;
      const waitMs = error.retryAfterMs ?? backoffMs;
      console.warn(
        `Rate limited on ${params.model}. Retrying in ${Math.ceil(waitMs / 1000)}s ` +
          `(attempt ${attempt}/${params.maxRetries})`
      );
      await sleep(waitMs);
    }
  }

  throw new Error('Create prediction retry loop exited unexpectedly.');
}

async function pollPrediction(params: {
  token: string;
  pollUrl: string;
  timeoutSeconds: number;
  pollIntervalMs: number;
}): Promise<Prediction> {
  const start = Date.now();

  while (true) {
    const response = await fetch(params.pollUrl, {
      headers: {
        Authorization: `Token ${params.token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Poll failed (${response.status}): ${text}`);
    }

    const prediction = (await response.json()) as Prediction;
    if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
      return prediction;
    }

    if ((Date.now() - start) / 1000 > params.timeoutSeconds) {
      throw new Error(`Polling timed out after ${params.timeoutSeconds}s`);
    }

    await sleep(params.pollIntervalMs);
  }
}

function getElapsedSeconds(prediction: Prediction): number | null {
  if (!prediction.created_at || !prediction.completed_at) {
    return null;
  }

  const created = Date.parse(prediction.created_at);
  const completed = Date.parse(prediction.completed_at);
  if (Number.isNaN(created) || Number.isNaN(completed)) {
    return null;
  }

  return Math.max(0, Number(((completed - created) / 1000).toFixed(2)));
}

function toCurrency(value: number | null): string {
  if (value === null) {
    return 'Unknown';
  }

  return `$${value.toFixed(4)}`;
}

function resolveCostDisplay(params: {
  approximateCostDisplay: string | null;
  estimatedCostUsdPerImage: number | null;
}): string {
  if (params.approximateCostDisplay) {
    return params.approximateCostDisplay;
  }
  return toCurrency(params.estimatedCostUsdPerImage);
}

function buildHtml(params: {
  generatedAtIso: string;
  prompt: string;
  outDir: string;
  rows: ResultRow[];
}): string {
  const rowCards = params.rows
    .map((row) => {
      const cost = resolveCostDisplay({
        approximateCostDisplay: row.approximateCostDisplay,
        estimatedCostUsdPerImage: row.estimatedCostUsdPerImage,
      });
      const statusClass =
        row.status === 'succeeded' ? 'ok' : row.status === 'dry-run' ? 'warn' : 'bad';
      const imageHtml = row.imagePath
        ? `<img src="${row.imagePath}" alt="${row.label}" loading="lazy" />`
        : '<div class="missing">No image generated</div>';
      const timing = row.elapsedSeconds === null ? 'n/a' : `${row.elapsedSeconds}s`;
      const errorHtml = row.error ? `<p class="error">${row.error}</p>` : '';

      return `
        <article class="card">
          <h2>${row.label}</h2>
          <p class="slug">${row.model}</p>
          <div class="media">${imageHtml}</div>
          <p><strong>Status:</strong> <span class="${statusClass}">${row.status}</span></p>
          <p><strong>Estimated cost:</strong> ${cost}</p>
          <p class="note">${row.costNote}</p>
          <p><strong>Generation time:</strong> ${timing}</p>
          ${errorHtml}
        </article>
      `;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Replicate Text-to-Image Model Comparison</title>
  <style>
    :root {
      --bg: #f5f4ef;
      --card: #ffffff;
      --text: #17212b;
      --muted: #5b6875;
      --ok: #0f8a5f;
      --warn: #8a6c0f;
      --bad: #c0352b;
      --line: #e3e1d7;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", Roboto, Arial, sans-serif;
      color: var(--text);
      background: radial-gradient(circle at top right, #fff7e5 0%, var(--bg) 38%, #ece9dd 100%);
    }
    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(1.4rem, 2vw + 1rem, 2.2rem);
    }
    .meta {
      color: var(--muted);
      margin: 0 0 18px;
    }
    details {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 18px;
    }
    details pre {
      margin: 8px 0 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.84rem;
      color: #2a3441;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
    }
    .card h2 {
      margin: 0 0 4px;
      font-size: 1rem;
    }
    .slug {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 0.8rem;
      word-break: break-word;
    }
    .media {
      border: 1px dashed var(--line);
      background: #faf9f5;
      border-radius: 8px;
      min-height: 240px;
      display: grid;
      place-items: center;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .media img {
      width: 100%;
      height: auto;
      object-fit: contain;
      display: block;
    }
    .missing {
      color: var(--muted);
      font-size: 0.9rem;
      padding: 20px;
      text-align: center;
    }
    p { margin: 6px 0; font-size: 0.9rem; }
    .note { color: var(--muted); }
    .ok { color: var(--ok); }
    .warn { color: var(--warn); }
    .bad { color: var(--bad); }
    .error {
      color: var(--bad);
      border-top: 1px solid var(--line);
      margin-top: 8px;
      padding-top: 8px;
      font-size: 0.82rem;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <main>
    <h1>Replicate Text-to-Image Comparison</h1>
    <p class="meta">Generated: ${params.generatedAtIso}</p>
    <p class="meta">Output directory: ${params.outDir}</p>
    <details>
      <summary>Prompt used</summary>
      <pre>${params.prompt.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>
    </details>
    <section class="grid">
      ${rowCards}
    </section>
  </main>
</body>
</html>`;
}

async function writeImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

function parseModelList(value?: string): Set<string> | null {
  if (!value) {
    return null;
  }

  const values = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return new Set(values);
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('compare-text-to-image-models')
    .option('out-dir', {
      type: 'string',
      default: DEFAULT_OUT_DIR,
      describe: 'Directory where images and report files are written',
    })
    .option('category', {
      type: 'string',
      default: DEFAULT_CATEGORY,
      describe: 'Category label used for metadata and filenames',
    })
    .option('subcategory', {
      type: 'string',
      default: DEFAULT_SUBCATEGORY,
      describe: 'Garment subcategory used in the prompt',
    })
    .option('color', {
      type: 'string',
      default: DEFAULT_COLOR,
      describe: 'Garment color used in the prompt',
    })
    .option('material', {
      type: 'string',
      default: DEFAULT_MATERIAL,
      describe: 'Optional material override',
    })
    .option('brand', {
      type: 'string',
      default: DEFAULT_BRAND,
      describe: 'Optional brand string added to the prompt',
    })
    .option('models', {
      type: 'string',
      describe: 'Comma-separated list of model slugs to run (subset of defaults)',
    })
    .option('timeout-seconds', {
      type: 'number',
      default: DEFAULT_TIMEOUT_SECONDS,
      describe: 'Polling timeout per model',
    })
    .option('poll-interval-ms', {
      type: 'number',
      default: DEFAULT_POLL_INTERVAL_MS,
      describe: 'Polling interval in milliseconds',
    })
    .option('create-retries', {
      type: 'number',
      default: DEFAULT_CREATE_RETRIES,
      describe: 'Max create-attempts per model when rate-limited',
    })
    .option('inter-request-delay-ms', {
      type: 'number',
      default: DEFAULT_INTER_REQUEST_DELAY_MS,
      describe: 'Delay between model create requests in milliseconds',
    })
    .option('dry-run', {
      type: 'boolean',
      default: false,
      describe: 'Only write prompt and report scaffold, no API calls',
    })
    .strict()
    .help()
    .parseAsync();

  const selectedModelSet = parseModelList(argv.models);
  const models = selectedModelSet
    ? DEFAULT_MODELS.filter((model) => selectedModelSet.has(model.slug))
    : DEFAULT_MODELS;

  if (models.length === 0) {
    throw new Error('No models selected. Check the --models list.');
  }

  const outDir = path.resolve(argv['out-dir']);
  const imageDir = path.join(outDir, 'images');
  await fs.mkdir(imageDir, { recursive: true });

  const material = getMaterialForSubcategory(argv.subcategory, argv.material);
  const prompt = buildPrompt({
    colorLabel: argv.color.toLowerCase(),
    material,
    garment: argv.subcategory,
    brand: argv.brand,
  });

  const generatedAtIso = new Date().toISOString();
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!argv['dry-run'] && !token) {
    throw new Error('Missing REPLICATE_API_TOKEN environment variable.');
  }

  console.log(`Prompt category: ${argv.category}`);
  console.log(`Prompt target: ${argv.color} ${material} ${argv.subcategory}`);
  console.log(`Models to run: ${models.length}`);
  console.log(`Output directory: ${outDir}`);
  console.log(`Dry run: ${argv['dry-run'] ? 'yes' : 'no'}`);

  const results: ResultRow[] = [];

  for (const model of models) {
    const safeName = toKebabCase(model.slug);
    const imageOutputPath = path.join(imageDir, `${safeName}.png`);
    const imageRelativePath = path.relative(outDir, imageOutputPath).replaceAll(path.sep, '/');

    if (argv['dry-run']) {
      results.push({
        model: model.slug,
        label: model.label,
        status: 'dry-run',
        imagePath: null,
        outputUrl: null,
        estimatedCostUsdPerImage: model.estimatedCostUsdPerImage ?? null,
        approximateCostDisplay: model.approximateCostDisplay ?? null,
        costNote: model.costNote ?? 'No cost note provided.',
        elapsedSeconds: null,
        error: 'dry-run (no prediction submitted)',
      });
      continue;
    }

    try {
      console.log(`Running ${model.slug}...`);
      const created = await createPredictionWithRetry({
        token: token as string,
        model: model.slug,
        prompt,
        maxRetries: argv['create-retries'],
      });

      const pollUrl = created.urls?.get;
      if (!pollUrl) {
        throw new Error('Prediction did not include poll URL.');
      }

      const finished = await pollPrediction({
        token: token as string,
        pollUrl,
        timeoutSeconds: argv['timeout-seconds'],
        pollIntervalMs: argv['poll-interval-ms'],
      });

      if (finished.status !== 'succeeded') {
        throw new Error(finished.error || `Prediction ended with status ${finished.status}`);
      }

      const imageUrl = extractImageUrl(finished.output);
      if (!imageUrl) {
        throw new Error('Prediction succeeded but no image URL was found in output.');
      }

      await writeImage(imageUrl, imageOutputPath);

      results.push({
        model: model.slug,
        label: model.label,
        status: 'succeeded',
        imagePath: imageRelativePath,
        outputUrl: imageUrl,
        estimatedCostUsdPerImage: model.estimatedCostUsdPerImage ?? null,
        approximateCostDisplay: model.approximateCostDisplay ?? null,
        costNote: model.costNote ?? 'No cost note provided.',
        elapsedSeconds: getElapsedSeconds(finished),
        error: null,
      });

      console.log(`Completed ${model.slug}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        model: model.slug,
        label: model.label,
        status: 'failed',
        imagePath: null,
        outputUrl: null,
        estimatedCostUsdPerImage: model.estimatedCostUsdPerImage ?? null,
        approximateCostDisplay: model.approximateCostDisplay ?? null,
        costNote: model.costNote ?? 'No cost note provided.',
        elapsedSeconds: null,
        error: message,
      });
      console.error(`Failed ${model.slug}: ${message}`);
    }

    if (argv['inter-request-delay-ms'] > 0 && model.slug !== models[models.length - 1].slug) {
      await sleep(argv['inter-request-delay-ms']);
    }
  }

  const reportHtml = buildHtml({
    generatedAtIso,
    prompt,
    outDir,
    rows: results,
  });

  const metadata = {
    generatedAt: generatedAtIso,
    promptInputs: {
      category: argv.category,
      subcategory: argv.subcategory,
      color: argv.color,
      material,
      brand: argv.brand,
    },
    prompt,
    models: models.map((model) => ({
      slug: model.slug,
      label: model.label,
      estimatedCostUsdPerImage: model.estimatedCostUsdPerImage ?? null,
      approximateCostDisplay: model.approximateCostDisplay ?? null,
      costNote: model.costNote ?? null,
    })),
    results,
  };

  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(metadata, null, 2), 'utf-8');
  await fs.writeFile(path.join(outDir, 'report.html'), reportHtml, 'utf-8');

  console.log(`Wrote ${path.join(outDir, 'results.json')}`);
  console.log(`Wrote ${path.join(outDir, 'report.html')}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
