#!/usr/bin/env tsx

import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type Provider = 'auto' | 'tinypng' | 'pngquant';
type ResolvedProvider = 'tinypng' | 'pngquant';

type CompressStatus = 'compressed' | 'skipped-existing' | 'failed';

type CompressionEntry = {
  inputPath: string;
  outputPath: string;
  status: CompressStatus;
  provider: ResolvedProvider;
  inputBytes: number;
  outputBytes?: number;
  savingsBytes?: number;
  savingsPct?: number;
  error?: string;
};

type TinyPngErrorResponse = {
  error?: string;
  message?: string;
};

const DEFAULT_INPUT_DIR = 'tmp/wardrobe-image-manifest/all-combinations';
const DEFAULT_OUTPUT_DIR = 'tmp/wardrobe-image-manifest/all-combinations-compressed';
const DEFAULT_CONCURRENCY = 1;

function runCommand(command: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stderr });
    });
  });
}

async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await runCommand(command, ['--version']);
    return result.code === 0;
  } catch {
    return false;
  }
}

async function walkPngFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkPngFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function ensureDirForFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function compressWithPngQuant(params: { inputPath: string; outputPath: string }): Promise<void> {
  await ensureDirForFile(params.outputPath);
  const result = await runCommand('pngquant', [
    '--quality=65-85',
    '--speed',
    '1',
    '--strip',
    '--skip-if-larger',
    '--output',
    params.outputPath,
    '--force',
    '--',
    params.inputPath,
  ]);

  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || `pngquant failed with exit code ${result.code}`);
  }
}

async function compressWithTinyPng(params: {
  inputPath: string;
  outputPath: string;
  apiKey: string;
}): Promise<void> {
  await ensureDirForFile(params.outputPath);

  const inputBuffer = await fs.readFile(params.inputPath);
  const auth = Buffer.from(`api:${params.apiKey}`).toString('base64');

  const shrinkResponse = await fetch('https://api.tinify.com/shrink', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'image/png',
    },
    body: inputBuffer,
  });

  if (!shrinkResponse.ok) {
    let message = `TinyPNG shrink failed with HTTP ${shrinkResponse.status}`;
    try {
      const json = (await shrinkResponse.json()) as TinyPngErrorResponse;
      if (json.message) {
        message = json.message;
      }
    } catch {
      // ignore JSON parse failure and keep default message
    }
    throw new Error(message);
  }

  const resultUrl = shrinkResponse.headers.get('location');
  if (!resultUrl) {
    throw new Error('TinyPNG response missing compressed file URL');
  }

  const downloadResponse = await fetch(resultUrl, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!downloadResponse.ok) {
    throw new Error(`TinyPNG download failed with HTTP ${downloadResponse.status}`);
  }

  const outBuffer = Buffer.from(await downloadResponse.arrayBuffer());
  await fs.writeFile(params.outputPath, outBuffer);
}

async function resolveProvider(provider: Provider, tinifyApiKey?: string): Promise<ResolvedProvider> {
  if (provider === 'tinypng') {
    if (!tinifyApiKey) {
      throw new Error('TINIFY_API_KEY is required when --provider=tinypng');
    }
    return 'tinypng';
  }

  if (provider === 'pngquant') {
    const hasPngQuant = await commandExists('pngquant');
    if (!hasPngQuant) {
      throw new Error('pngquant is not installed or not available in PATH');
    }
    return 'pngquant';
  }

  if (tinifyApiKey) {
    return 'tinypng';
  }

  const hasPngQuant = await commandExists('pngquant');
  if (hasPngQuant) {
    return 'pngquant';
  }

  throw new Error(
    'No compression provider available. Set TINIFY_API_KEY for TinyPNG or install pngquant.'
  );
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('compress-wardrobe-images')
    .option('input-dir', {
      type: 'string',
      default: DEFAULT_INPUT_DIR,
      describe: 'Input directory containing generated PNG files',
    })
    .option('output-dir', {
      type: 'string',
      default: DEFAULT_OUTPUT_DIR,
      describe: 'Output directory for compressed PNG files',
    })
    .option('provider', {
      type: 'string',
      default: 'auto',
      choices: ['auto', 'tinypng', 'pngquant'],
      describe: 'Compression provider to use',
    })
    .option('concurrency', {
      type: 'number',
      default: DEFAULT_CONCURRENCY,
      describe: 'Parallel workers for compression tasks',
    })
    .option('overwrite', {
      type: 'boolean',
      default: false,
      describe: 'Overwrite output files if they already exist',
    })
    .option('limit', {
      type: 'number',
      describe: 'Process only the first N PNG files',
    })
    .option('dry-run', {
      type: 'boolean',
      default: false,
      describe: 'Plan compression without writing output files',
    })
    .strict()
    .help()
    .parseAsync();

  const inputDir = path.resolve(argv['input-dir']);
  const outputDir = path.resolve(argv['output-dir']);
  const tinifyApiKey = process.env.TINIFY_API_KEY?.trim();

  const provider = await resolveProvider(argv.provider as Provider, tinifyApiKey);
  const allPngFiles = (await walkPngFiles(inputDir)).sort();
  const selectedFiles = typeof argv.limit === 'number' ? allPngFiles.slice(0, argv.limit) : allPngFiles;

  if (selectedFiles.length === 0) {
    throw new Error(`No PNG files found in ${inputDir}`);
  }

  await fs.mkdir(outputDir, { recursive: true });

  const reportPath = path.resolve(outputDir, '_compression-report.json');
  const entries: CompressionEntry[] = [];

  let cursor = 0;
  const workerCount = Math.max(1, Math.floor(argv.concurrency));

  console.log(`Input directory: ${inputDir}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Provider: ${provider}`);
  console.log(`Files to process: ${selectedFiles.length}`);
  console.log(`Dry run: ${argv['dry-run'] ? 'yes' : 'no'}`);

  const persistReport = async (): Promise<void> => {
    const totals = entries.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        acc.inputBytes += item.inputBytes;
        acc.outputBytes += item.outputBytes ?? 0;
        return acc;
      },
      { compressed: 0, 'skipped-existing': 0, failed: 0, inputBytes: 0, outputBytes: 0 }
    );

    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          inputDir,
          outputDir,
          provider,
          totalFiles: selectedFiles.length,
          completed: entries.length,
          remaining: selectedFiles.length - entries.length,
          totals: {
            compressed: totals.compressed,
            skippedExisting: totals['skipped-existing'],
            failed: totals.failed,
            inputBytes: totals.inputBytes,
            outputBytes: totals.outputBytes,
            savingsBytes: Math.max(0, totals.inputBytes - totals.outputBytes),
            savingsPct:
              totals.inputBytes > 0
                ? Number((((totals.inputBytes - totals.outputBytes) / totals.inputBytes) * 100).toFixed(2))
                : 0,
          },
          options: {
            overwrite: argv.overwrite,
            dryRun: argv['dry-run'],
            concurrency: workerCount,
            limit: argv.limit ?? null,
          },
          files: entries,
        },
        null,
        2
      ),
      'utf-8'
    );
  };

  await persistReport();

  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= selectedFiles.length) {
        return;
      }

      const inputPath = selectedFiles[index];
      const rel = path.relative(inputDir, inputPath);
      const outputPath = path.resolve(outputDir, rel);
      const prefix = `[${index + 1}/${selectedFiles.length}]`;

      const inputStat = await fs.stat(inputPath);
      const inputBytes = inputStat.size;

      try {
        const outputExists = await fs
          .access(outputPath)
          .then(() => true)
          .catch(() => false);

        if (outputExists && !argv.overwrite) {
          console.log(`${prefix} skip existing: ${rel}`);
          entries.push({
            inputPath,
            outputPath,
            status: 'skipped-existing',
            provider,
            inputBytes,
          });
          await persistReport();
          continue;
        }

        if (argv['dry-run']) {
          console.log(`${prefix} dry-run: ${rel}`);
          entries.push({
            inputPath,
            outputPath,
            status: 'compressed',
            provider,
            inputBytes,
            outputBytes: inputBytes,
            savingsBytes: 0,
            savingsPct: 0,
          });
          await persistReport();
          continue;
        }

        if (provider === 'tinypng') {
          await compressWithTinyPng({
            inputPath,
            outputPath,
            apiKey: tinifyApiKey as string,
          });
        } else {
          await compressWithPngQuant({ inputPath, outputPath });
        }

        const outputStat = await fs.stat(outputPath);
        const outputBytes = outputStat.size;
        const savingsBytes = inputBytes - outputBytes;
        const savingsPct = Number(((savingsBytes / inputBytes) * 100).toFixed(2));

        console.log(`${prefix} compressed: ${rel} (${savingsPct}% smaller)`);
        entries.push({
          inputPath,
          outputPath,
          status: 'compressed',
          provider,
          inputBytes,
          outputBytes,
          savingsBytes,
          savingsPct,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${prefix} failed: ${rel} -> ${message}`);
        entries.push({
          inputPath,
          outputPath,
          status: 'failed',
          provider,
          inputBytes,
          error: message,
        });
      }

      await persistReport();
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  await persistReport();

  const failed = entries.filter((entry) => entry.status === 'failed').length;
  const compressed = entries.filter((entry) => entry.status === 'compressed').length;

  console.log(`Done. Report: ${reportPath}`);
  console.log(`Compressed: ${compressed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
