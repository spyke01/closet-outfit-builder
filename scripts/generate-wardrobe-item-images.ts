#!/usr/bin/env tsx

/**
 * Wardrobe Item Image Generator
 *
 * Generates transparent-background product images for onboarding subcategories
 * across all configured color options.
 *
 * Usage example:
 *   OPENAI_API_KEY=... npm run generate:wardrobe-images -- --limit 10
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { COLOR_OPTIONS, type ColorOption } from '../lib/data/color-options';
import { ONBOARDING_CATEGORIES, type CategoryKey } from '../lib/data/onboarding-categories';

type CategorySubcategory = {
  category: CategoryKey;
  subcategory: string;
};

type GenerationTask = CategorySubcategory & {
  color: ColorOption;
  material: string;
  brand: string;
  prompt: string;
  outputPath: string;
};

type ManifestEntry = {
  category: CategoryKey;
  subcategory: string;
  color: string;
  material: string;
  brand: string;
  outputPath: string;
  status: 'generated' | 'skipped-existing' | 'dry-run' | 'failed';
  error?: string;
};

type ImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

type RunStatus = 'running' | 'completed' | 'stopped-insufficient-credits';

const DEFAULT_OUT_DIR = 'public/images/wardrobe/generated/onboarding';
const DEFAULT_MODEL = 'gpt-image-1.5';
const DEFAULT_SIZE = '1024x1024';
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_BASE_DELAY_MS = 2_000;

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

function buildTasks(params: {
  outDir: string;
  categories?: Set<string>;
  colors?: Set<string>;
  brand: string;
  materialOverride?: string;
}): GenerationTask[] {
  const { outDir, categories, colors, brand, materialOverride } = params;
  const selectedColors = COLOR_OPTIONS.filter(
    (color) => color.value !== '' && (!colors || colors.has(color.value))
  );

  const tasks: GenerationTask[] = [];

  for (const category of ONBOARDING_CATEGORIES) {
    if (categories && !categories.has(category.key)) {
      continue;
    }

    for (const subcategory of category.subcategories) {
      for (const color of selectedColors) {
        const material = getMaterialForSubcategory(subcategory.name, materialOverride);
        const prompt = buildPrompt({
          colorLabel: color.label.toLowerCase(),
          material,
          garment: subcategory.name,
          brand,
        });

        const filename = `${toKebabCase(category.key)}-${toKebabCase(subcategory.name)}-${toKebabCase(color.value)}.png`;
        const outputPath = path.resolve(outDir, filename);

        tasks.push({
          category: category.key,
          subcategory: subcategory.name,
          color,
          material,
          brand,
          prompt,
          outputPath,
        });
      }
    }
  }

  return tasks;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

class ImageApiError extends Error {
  status?: number;
  code?: string;
  retriable: boolean;
  insufficientCredits: boolean;
  retryAfterMs?: number;

  constructor(params: {
    message: string;
    status?: number;
    code?: string;
    retriable?: boolean;
    insufficientCredits?: boolean;
    retryAfterMs?: number;
  }) {
    super(params.message);
    this.name = 'ImageApiError';
    this.status = params.status;
    this.code = params.code;
    this.retriable = params.retriable ?? false;
    this.insufficientCredits = params.insufficientCredits ?? false;
    this.retryAfterMs = params.retryAfterMs;
  }
}

function parseRetryAfterMs(headerValue: string | null): number | undefined {
  if (!headerValue) {
    return undefined;
  }

  const asSeconds = Number(headerValue);
  if (!Number.isNaN(asSeconds)) {
    return Math.max(0, Math.floor(asSeconds * 1000));
  }

  const dateMs = Date.parse(headerValue);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

function isInsufficientCredits(params: { status?: number; code?: string; message: string }): boolean {
  const normalizedCode = (params.code ?? '').toLowerCase();
  const normalizedMessage = params.message.toLowerCase();

  if (normalizedCode === 'insufficient_quota' || normalizedCode === 'billing_hard_limit_reached') {
    return true;
  }

  return (
    normalizedMessage.includes('insufficient quota') ||
    normalizedMessage.includes('exceeded your current quota') ||
    normalizedMessage.includes('billing hard limit') ||
    normalizedMessage.includes('insufficient_quota')
  );
}

function isRetriableStatus(status?: number): boolean {
  return status === 429 || (typeof status === 'number' && status >= 500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callImageApi(params: {
  apiKey: string;
  model: string;
  prompt: string;
  size: string;
  quality: 'low' | 'medium' | 'high' | 'auto';
}): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        prompt: params.prompt,
        size: params.size,
        quality: params.quality,
        n: 1,
        background: 'transparent',
        output_format: 'png',
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ImageApiError({
      message: `Network error while calling image API: ${message}`,
      retriable: true,
    });
  }

  const json = (await response.json()) as ImageResponse;

  if (!response.ok) {
    const message = json?.error?.message ?? `HTTP ${response.status}`;
    const code = json?.error?.code;
    const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
    throw new ImageApiError({
      message,
      status: response.status,
      code,
      retriable: isRetriableStatus(response.status),
      insufficientCredits: isInsufficientCredits({ status: response.status, code, message }),
      retryAfterMs,
    });
  }

  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    throw new ImageApiError({
      message: 'Image response did not include b64_json data',
      retriable: false,
    });
  }

  return Buffer.from(b64, 'base64');
}

async function callImageApiWithRetry(params: {
  apiKey: string;
  model: string;
  prompt: string;
  size: string;
  quality: 'low' | 'medium' | 'high' | 'auto';
  maxRetries: number;
  retryBaseDelayMs: number;
  descriptor: string;
  prefix: string;
}): Promise<Buffer> {
  for (let attempt = 1; attempt <= params.maxRetries; attempt += 1) {
    try {
      return await callImageApi({
        apiKey: params.apiKey,
        model: params.model,
        prompt: params.prompt,
        size: params.size,
        quality: params.quality,
      });
    } catch (error) {
      const apiError =
        error instanceof ImageApiError
          ? error
          : new ImageApiError({
              message: error instanceof Error ? error.message : String(error),
              retriable: false,
            });

      if (apiError.insufficientCredits) {
        throw apiError;
      }

      const isFinalAttempt = attempt === params.maxRetries;
      if (!apiError.retriable || isFinalAttempt) {
        throw apiError;
      }

      const fallbackBackoff = params.retryBaseDelayMs * 2 ** (attempt - 1);
      const retryDelayMs = apiError.retryAfterMs ?? fallbackBackoff;
      console.warn(
        `${params.prefix} retrying after ${Math.ceil(retryDelayMs / 1000)}s ` +
          `(attempt ${attempt}/${params.maxRetries}) for ${params.descriptor}`
      );
      await sleep(retryDelayMs);
    }
  }

  throw new ImageApiError({
    message: 'Retry loop exited unexpectedly',
    retriable: false,
  });
}

function parseCsvSet(value?: string): Set<string> | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? new Set(items) : undefined;
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('generate-wardrobe-item-images')
    .option('out-dir', {
      type: 'string',
      default: DEFAULT_OUT_DIR,
      describe: 'Output directory for generated PNG files',
    })
    .option('model', {
      type: 'string',
      default: DEFAULT_MODEL,
      describe: 'OpenAI image model to use',
    })
    .option('size', {
      type: 'string',
      default: DEFAULT_SIZE,
      choices: ['1024x1024', '1536x1536', '2048x2048'],
      describe: 'Square output size',
    })
    .option('quality', {
      type: 'string',
      default: 'auto',
      choices: ['auto', 'low', 'medium', 'high'],
      describe: 'Image quality setting for generation',
    })
    .option('brand', {
      type: 'string',
      default: '',
      describe: 'Optional brand to include in prompt',
    })
    .option('material', {
      type: 'string',
      default: '',
      describe: 'Optional material override for all generated items',
    })
    .option('categories', {
      type: 'string',
      describe: 'Comma-separated category keys (e.g. Tops,Bottoms)',
    })
    .option('colors', {
      type: 'string',
      describe: 'Comma-separated color values from COLOR_OPTIONS (e.g. olive,navy)',
    })
    .option('limit', {
      type: 'number',
      describe: 'Generate only the first N tasks after filters',
    })
    .option('delay-ms', {
      type: 'number',
      default: 0,
      describe: 'Delay between API calls in milliseconds',
    })
    .option('max-retries', {
      type: 'number',
      default: DEFAULT_MAX_RETRIES,
      describe: 'Maximum attempts per image generation request',
    })
    .option('retry-base-delay-ms', {
      type: 'number',
      default: DEFAULT_RETRY_BASE_DELAY_MS,
      describe: 'Base delay for exponential retry backoff in milliseconds',
    })
    .option('overwrite', {
      type: 'boolean',
      default: false,
      describe: 'Overwrite existing files',
    })
    .option('dry-run', {
      type: 'boolean',
      default: false,
      describe: 'Print planned tasks without calling the API',
    })
    .strict()
    .help()
    .parseAsync();

  const outDir = path.resolve(argv['out-dir']);
  const categories = parseCsvSet(argv.categories);
  const colors = parseCsvSet(argv.colors);

  const tasks = buildTasks({
    outDir,
    categories,
    colors,
    brand: argv.brand,
    materialOverride: argv.material,
  });

  const selectedTasks = typeof argv.limit === 'number' ? tasks.slice(0, argv.limit) : tasks;

  if (selectedTasks.length === 0) {
    throw new Error('No generation tasks matched the provided filters.');
  }

  await fs.mkdir(outDir, { recursive: true });

  const manifest: ManifestEntry[] = [];
  const manifestPath = path.resolve(outDir, '_manifest.json');
  let runStatus: RunStatus = 'running';
  let stopReason: string | undefined;
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!argv['dry-run'] && !apiKey) {
    throw new Error('Missing OPENAI_API_KEY. Set it in your local environment before running.');
  }

  console.log(`Planned tasks: ${selectedTasks.length}`);
  console.log(`Output directory: ${outDir}`);
  console.log(`Model: ${argv.model}`);
  console.log(`Quality: ${argv.quality}`);
  console.log(`Dry run: ${argv['dry-run'] ? 'yes' : 'no'}`);
  console.log(`Max retries: ${argv['max-retries']}`);

  const persistManifest = async (): Promise<void> => {
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalTasks: selectedTasks.length,
          completed: manifest.length,
          remaining: selectedTasks.length - manifest.length,
          runStatus,
          stopReason: stopReason ?? null,
          options: {
            model: argv.model,
            size: argv.size,
            quality: argv.quality,
            brand: argv.brand,
            categories: argv.categories ?? null,
            colors: argv.colors ?? null,
            overwrite: argv.overwrite,
            dryRun: argv['dry-run'],
            maxRetries: argv['max-retries'],
            retryBaseDelayMs: argv['retry-base-delay-ms'],
          },
          tasks: manifest,
        },
        null,
        2
      ),
      'utf-8'
    );
  };

  await persistManifest();

  for (let index = 0; index < selectedTasks.length; index += 1) {
    const task = selectedTasks[index];
    const prefix = `[${index + 1}/${selectedTasks.length}]`;
    const descriptor = `${task.color.label} ${task.subcategory} (${task.category})`;

    const alreadyExists = await exists(task.outputPath);
    if (alreadyExists && !argv.overwrite) {
      console.log(`${prefix} skip existing: ${descriptor}`);
      manifest.push({
        category: task.category,
        subcategory: task.subcategory,
        color: task.color.value,
        material: task.material,
        brand: task.brand,
        outputPath: task.outputPath,
        status: 'skipped-existing',
      });
      await persistManifest();
      continue;
    }

    if (argv['dry-run']) {
      console.log(`${prefix} dry-run: ${descriptor} -> ${task.outputPath}`);
      manifest.push({
        category: task.category,
        subcategory: task.subcategory,
        color: task.color.value,
        material: task.material,
        brand: task.brand,
        outputPath: task.outputPath,
        status: 'dry-run',
      });
      await persistManifest();
      continue;
    }

    try {
      const pngBuffer = await callImageApiWithRetry({
        apiKey: apiKey as string,
        model: argv.model,
        prompt: task.prompt,
        size: argv.size,
        quality: argv.quality,
        maxRetries: argv['max-retries'],
        retryBaseDelayMs: argv['retry-base-delay-ms'],
        descriptor,
        prefix,
      });

      await fs.writeFile(task.outputPath, pngBuffer);
      console.log(`${prefix} generated: ${descriptor}`);

      manifest.push({
        category: task.category,
        subcategory: task.subcategory,
        color: task.color.value,
        material: task.material,
        brand: task.brand,
        outputPath: task.outputPath,
        status: 'generated',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isCreditStop = error instanceof ImageApiError && error.insufficientCredits;

      if (isCreditStop) {
        runStatus = 'stopped-insufficient-credits';
        stopReason = message;
        console.error(`${prefix} stopping: insufficient credits/quota -> ${message}`);
      } else {
        console.error(`${prefix} failed: ${descriptor} -> ${message}`);
      }

      manifest.push({
        category: task.category,
        subcategory: task.subcategory,
        color: task.color.value,
        material: task.material,
        brand: task.brand,
        outputPath: task.outputPath,
        status: 'failed',
        error: message,
      });

      await persistManifest();
      if (isCreditStop) {
        break;
      }
    }

    await persistManifest();

    if (argv['delay-ms'] > 0 && index < selectedTasks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, argv['delay-ms']));
    }
  }

  if (runStatus === 'running') {
    runStatus = 'completed';
  }
  await persistManifest();

  const failedCount = manifest.filter((entry) => entry.status === 'failed').length;
  console.log(`Done. Manifest written to ${manifestPath}`);
  if (runStatus === 'stopped-insufficient-credits') {
    console.log('Stopped early because credits/quota were insufficient.');
    process.exitCode = 2;
    return;
  }
  if (failedCount > 0) {
    console.log(`Failures: ${failedCount}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
