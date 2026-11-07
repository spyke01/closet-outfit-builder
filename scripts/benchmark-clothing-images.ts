#!/usr/bin/env tsx
/** Explicit, bounded provider evaluation. Never imports application/database clients. */
import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import sharp from "sharp";
import { buildWardrobeItemPrompt } from "../supabase/functions/_shared/wardrobe-item-prompt-builder";

const { combinedEnv } = nextEnv.loadEnvConfig(process.cwd(), false, {
  info() {},
  error() {},
});
const out = path.resolve("docs/ai-image-comparison-2026-11-06");
const originals = path.resolve("tmp/image-model-benchmark-2026-11-06");
const runPaid = process.argv.includes("--run");
const budgetUsd = 5;
const cleanupVersion =
  "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";
const cases = [
  {
    id: "navy-tee",
    name: "T-Shirt",
    category: "Tops",
    color: "navy",
    material: "cotton jersey",
  },
  {
    id: "white-blouse",
    name: "long-sleeve button-front Blouse",
    category: "Tops",
    color: "ivory white",
    material: "silk",
  },
  {
    id: "striped-shirt",
    name: "button-down Shirt with narrow vertical stripes",
    category: "Tops",
    color: "red and cream striped",
    material: "cotton poplin",
  },
  {
    id: "checked-blazer",
    name: "two-button Blazer with a subtle windowpane check",
    category: "Outerwear",
    color: "navy with light blue checks",
    material: "wool",
  },
  {
    id: "white-sneakers",
    name: "matching pair of low-top Sneakers",
    category: "Shoes",
    color: "white",
    material: "leather with white rubber soles",
  },
  {
    id: "brown-belt",
    name: "Belt with one silver rectangular buckle",
    category: "Accessories",
    color: "brown",
    material: "leather",
  },
  {
    id: "green-dress",
    name: "sleeveless Midi Dress with a V neckline",
    category: "Dresses",
    color: "forest green",
    material: "satin",
  },
  {
    id: "silver-watch",
    name: "analog wrist Watch with a round black dial and metal bracelet",
    category: "Accessories",
    color: "silver and black",
    material: "stainless steel",
  },
];
const models = [
  {
    id: "imagen4",
    slug: "google/imagen-4",
    label: "Imagen 4 (current)",
    ceiling: 0.08,
    rate: 0.04,
    input: { aspect_ratio: "1:1", image_size: "1K", output_format: "png" },
  },
  {
    id: "imagen4fast",
    slug: "google/imagen-4-fast",
    label: "Imagen 4 Fast",
    ceiling: 0.04,
    rate: 0.02,
    input: { aspect_ratio: "1:1", output_format: "png" },
  },
  {
    id: "pimage",
    slug: "prunaai/p-image",
    label: "Pruna P-Image",
    ceiling: 0.01,
    rate: 0.005,
    input: {
      aspect_ratio: "custom",
      width: 1024,
      height: 1024,
      seed: 1106,
      prompt_upsampling: false,
    },
  },
  {
    id: "klein",
    slug: "black-forest-labs/flux-2-klein-4b",
    label: "FLUX.2 Klein 4B",
    ceiling: 0.005,
    rate: 0.001,
    input: {
      aspect_ratio: "1:1",
      output_megapixels: "1",
      output_format: "png",
      seed: 1106,
      go_fast: false,
    },
  },
  {
    id: "flare",
    slug: "gpt-image-2.6-flare",
    label: "GPT Image 2.6 Flare · low",
    ceiling: 0.3,
    rate: null,
    input: {
      size: "1024x1024",
      quality: "low",
      complexity: "low",
      background: "opaque",
      output_format: "png",
      n: 1,
    },
  },
  {
    id: "schnell",
    slug: "black-forest-labs/flux-schnell",
    label: "FLUX.1 Schnell",
    ceiling: 0.01,
    rate: 0.003,
    input: {
      aspect_ratio: "1:1",
      megapixels: "1",
      num_outputs: 1,
      num_inference_steps: 4,
      output_format: "png",
      seed: 1106,
      go_fast: true,
    },
  },
  {
    id: "banana2",
    slug: "google/nano-banana-2",
    label: "Nano Banana 2",
    ceiling: 0.12,
    rate: 0.067,
    input: {
      aspect_ratio: "1:1",
      resolution: "1K",
      output_format: "png",
      google_search: false,
      image_search: false,
    },
  },
];
type Phase = {
  state: string;
  reservedUsd: number;
  id?: string;
  providerSeconds?: number;
  wallSeconds?: number;
  predictSeconds?: number;
  estimatedUsd?: number | null;
  usage?: unknown;
  error?: string;
};
type Row = {
  caseId: string;
  modelId: string;
  rawPath?: string;
  cleanedPath?: string;
  dimensions?: { width: number; height: number };
  alpha?: { transparentFraction: number; foregroundTouchesEdge: boolean };
  generate?: Phase;
  cleanup?: Phase;
};
type Ledger = {
  startedAt: string;
  updatedAt: string;
  budgetUsd: number;
  rows: Row[];
  unavailableModels?: Record<string, string>;
  lastReplicateCreateAt?: number;
};
await fs.mkdir(path.join(out, "images"), { recursive: true });
await fs.mkdir(originals, { recursive: true });
let ledger: Ledger;
try {
  ledger = JSON.parse(
    await fs.readFile(path.join(out, "results.json"), "utf8"),
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  ledger = {
    startedAt: new Date().toISOString(),
    updatedAt: "",
    budgetUsd,
    rows: [],
  };
}
const save = async () => {
  ledger.updatedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(out, "results.json"),
    JSON.stringify(
      {
        ...ledger,
        methodology:
          "Eight synthetic clothing prompts, one sample per model per prompt. Identical production prompt builder, square ~1MP output, identical pinned background remover. OpenAI uses explicit low quality/complexity. No account/wardrobe/database writes. Prices are estimates, not reconciled provider invoices.",
        models,
        cases: cases.map((c) => ({ ...c, prompt: buildWardrobeItemPrompt(c) })),
      },
      null,
      2,
    ) + "\n",
  );
};
function reserved() {
  return ledger.rows.reduce(
    (n, row) =>
      n + (row.generate?.reservedUsd || 0) + (row.cleanup?.reservedUsd || 0),
    0,
  );
}
async function reserve(
  row: Row,
  phase: "generate" | "cleanup",
  ceiling: number,
) {
  if (!runPaid) throw Error("Use --run to authorize provider inference");
  if (reserved() + ceiling > budgetUsd + 1e-8)
    throw Error("Evaluation budget ceiling reached");
  row[phase] = { state: "submitting", reservedUsd: ceiling };
  await save(); // Persist before POST; an uncertain submission is never repeated.
}
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
class ProviderError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`Provider HTTP ${status}: ${detail}`);
  }
}
async function jsonRequest(
  url: string,
  init: RequestInit = {},
  timeout = 30_000,
) {
  for (let attempt = 0; attempt < 6; attempt++) {
    if (
      init.method === "POST" &&
      url.startsWith("https://api.replicate.com/") &&
      !url.endsWith("/cancel")
    ) {
      await pause(
        Math.max(0, (ledger.lastReplicateCreateAt || 0) + 12_000 - Date.now()),
      );
      ledger.lastReplicateCreateAt = Date.now();
      await save();
    }
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeout),
    });
    const data = await response.json();
    if (response.ok) return data;
    let detail = String(
      data.error?.code ||
        data.error?.message ||
        data.detail ||
        data.title ||
        "Request rejected",
    );
    for (const name of ["OPENAI_API_KEY", "REPLICATE_API_TOKEN"])
      if (combinedEnv[name])
        detail = detail.split(combinedEnv[name]!).join("[REDACTED]");
    if (
      response.status === 429 &&
      !/quota|credit|balance|billing/i.test(detail) &&
      attempt < 5
    ) {
      await pause(
        Math.min(
          60_000,
          Math.max(
            12_000,
            Number(
              response.headers.get("retry-after") || data.retry_after || 12,
            ) * 1000,
          ),
        ),
      );
      continue; // A rejected rate-limit request created no prediction.
    }
    throw new ProviderError(response.status, detail.slice(0, 500));
  }
  throw Error("Rate limit retry limit reached");
}
function outputUrl(output: unknown): string {
  const value =
    typeof output === "string"
      ? output
      : Array.isArray(output)
        ? output.find((x) => typeof x === "string")
        : null;
  if (!value || !/^https:\/\/[^/]*replicate\.delivery\//.test(value))
    throw Error("Unexpected output host");
  return value;
}
async function download(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw Error(`Image download HTTP ${r.status}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > 20 * 1024 * 1024)
    throw Error("Image download exceeds evaluation limit");
  return bytes;
}
async function replicate(
  row: Row,
  phase: "generate" | "cleanup",
  model: string,
  input: object,
  ceiling: number,
  version?: string,
): Promise<Buffer> {
  const key = combinedEnv.REPLICATE_API_TOKEN;
  if (!key) throw Error("Replicate is not configured");
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const started = Date.now();
  if (!row[phase]) {
    await reserve(row, phase, ceiling);
    const data = await jsonRequest(
      version
        ? "https://api.replicate.com/v1/predictions"
        : `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: "POST",
        headers: { ...headers, "Cancel-After": "60s" },
        body: JSON.stringify({ ...(version ? { version } : {}), input }),
      },
    );
    row[phase]!.id = data.id;
    row[phase]!.state = data.status;
    await save();
  }
  const entry = row[phase]!;
  if (!entry.id)
    throw Error("Uncertain submission; refusing automatic paid retry");
  const endpoint =
    "https://api.replicate.com/v1/predictions/" + encodeURIComponent(entry.id);
  while (Date.now() - started < 150_000) {
    const data = await jsonRequest(endpoint, { headers });
    entry.state = data.status;
    if (["succeeded", "failed", "canceled"].includes(data.status)) {
      entry.wallSeconds = (Date.now() - started) / 1000;
      entry.providerSeconds =
        data.created_at && data.completed_at
          ? (Date.parse(data.completed_at) - Date.parse(data.created_at)) / 1000
          : undefined;
      entry.predictSeconds = data.metrics?.predict_time;
      if (phase === "cleanup")
        entry.estimatedUsd =
          typeof data.metrics?.predict_time === "number"
            ? data.metrics.predict_time * 0.000225
            : null;
      await save();
      if (data.status !== "succeeded") throw Error(`Prediction ${data.status}`);
      return download(outputUrl(data.output));
    }
    await pause(1200);
  }
  await jsonRequest(endpoint + "/cancel", { method: "POST", headers }).catch(
    () => undefined,
  );
  throw Error(
    "Prediction timed out; cancellation requested; no retry submitted",
  );
}
async function generate(
  row: Row,
  model: (typeof models)[number],
  prompt: string,
): Promise<Buffer> {
  if (model.id !== "flare")
    return replicate(
      row,
      "generate",
      model.slug,
      { prompt, ...model.input },
      model.ceiling,
    );
  if (row.generate)
    throw Error(
      "OpenAI submission already recorded; refusing automatic paid retry",
    );
  const key = combinedEnv.OPENAI_API_KEY;
  if (!key) throw Error("OpenAI is not configured");
  await reserve(row, "generate", model.ceiling);
  const started = Date.now();
  const result = await jsonRequest(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: model.slug, prompt, ...model.input }),
    },
    180_000,
  );
  row.generate!.state = "succeeded";
  row.generate!.wallSeconds = (Date.now() - started) / 1000;
  row.generate!.usage = result.usage ?? null;
  const usage = result.usage;
  row.generate!.estimatedUsd =
    typeof usage?.output_tokens === "number" &&
    typeof usage?.input_tokens_details?.text_tokens === "number"
      ? (usage.input_tokens_details.text_tokens * 5 +
          (usage.input_tokens_details.image_tokens || 0) * 8 +
          usage.output_tokens * 30) /
        1_000_000
      : null;
  await save();
  if (!result.data?.[0]?.b64_json)
    throw Error("OpenAI did not return image bytes");
  return Buffer.from(result.data[0].b64_json, "base64");
}
async function asset(row: Row, bytes: Buffer, kind: "raw" | "cleaned") {
  const stem = `${row.caseId}-${row.modelId}-${kind}`;
  await fs.writeFile(
    path.join(originals, stem + ".png"),
    await sharp(bytes).png().toBuffer(),
  );
  const relative = `images/${stem}.webp`;
  await sharp(bytes)
    .resize({
      width: 768,
      height: 768,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 94, alphaQuality: 100 })
    .toFile(path.join(out, relative));
  if (kind === "raw") {
    row.rawPath = relative;
    const meta = await sharp(bytes).metadata();
    row.dimensions = { width: meta.width!, height: meta.height! };
    const model = models.find((m) => m.id === row.modelId)!;
    if (model.rate !== null)
      row.generate!.estimatedUsd =
        model.rate *
        (model.id === "klein" ? (meta.width! * meta.height!) / 1_000_000 : 1);
  } else {
    row.cleanedPath = relative;
    const { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let clear = 0,
      edge = false;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        const alpha =
          data[(y * info.width + x) * info.channels + info.channels - 1];
        if (alpha < 16) clear++;
        if (
          (x === 0 ||
            y === 0 ||
            x === info.width - 1 ||
            y === info.height - 1) &&
          alpha > 128
        )
          edge = true;
      }
    row.alpha = {
      transparentFraction: clear / (info.width * info.height),
      foregroundTouchesEdge: edge,
    };
  }
  await save();
}
await save();
if (!runPaid) {
  console.log(
    JSON.stringify({
      mode: "dry-run",
      models: models.length,
      cases: cases.length,
      generationRequests: models.length * cases.length,
      cleanupRequests: models.length * cases.length,
      plannedReservationUsd:
        cases.length *
        models.reduce((sum, model) => sum + model.ceiling + 0.02, 0),
      budgetUsd,
    }),
  );
} else {
  for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
    const target = cases[caseIndex];
    // Rotate order across cases so one provider isn't always measured first.
    const ordered = [
      ...models.slice(caseIndex % models.length),
      ...models.slice(0, caseIndex % models.length),
    ];
    for (const model of ordered) {
      let row = ledger.rows.find(
        (r) => r.caseId === target.id && r.modelId === model.id,
      );
      if (!row) {
        row = { caseId: target.id, modelId: model.id };
        ledger.rows.push(row);
      }
      if (row.cleanedPath) continue;
      if (row.generate?.error || row.cleanup?.error) continue;
      if (ledger.unavailableModels?.[model.id]) {
        row.generate = {
          state: "unavailable",
          reservedUsd: 0,
          error: ledger.unavailableModels[model.id],
        };
        await save();
        continue;
      }
      try {
        if (!row.rawPath)
          await asset(
            row,
            await generate(row, model, buildWardrobeItemPrompt(target)),
            "raw",
          );
        const raw = await fs.readFile(
          path.join(originals, `${row.caseId}-${row.modelId}-raw.png`),
        );
        const clean = await replicate(
          row,
          "cleanup",
          "851-labs/background-remover",
          {
            image: "data:image/png;base64," + raw.toString("base64"),
            format: "png",
            background_type: "rgba",
          },
          0.02,
          cleanupVersion,
        );
        await asset(row, clean, "cleaned");
        console.log(
          JSON.stringify({
            case: target.id,
            model: model.id,
            status: "complete",
            generationSeconds:
              row.generate?.providerSeconds ?? row.generate?.wallSeconds,
            cleanupSeconds: row.cleanup?.providerSeconds,
            estimatedUsd:
              (row.generate?.estimatedUsd ?? 0) +
              (row.cleanup?.estimatedUsd ?? 0),
            reservationUsd: reserved(),
          }),
        );
      } catch (error) {
        const phase = row.rawPath ? "cleanup" : "generate";
        if (row[phase])
          row[phase]!.error =
            error instanceof Error ? error.message : "Evaluation failed";
        if (error instanceof ProviderError && !row[phase]?.id) {
          row[phase]!.state = "rejected";
          row[phase]!.reservedUsd = 0;
          if (
            phase === "generate" &&
            /discontinued|disabled|quota|credit_balance|no credits/i.test(
              error.detail,
            )
          ) {
            ledger.unavailableModels ||= {};
            ledger.unavailableModels[model.id] = error.message;
          }
        }
        await save();
        console.log(
          JSON.stringify({
            case: target.id,
            model: model.id,
            status: "failed",
            phase,
            error: row[phase]?.error,
          }),
        );
      }
    }
  }
}
console.log(
  JSON.stringify({
    completed: ledger.rows.filter((r) => r.cleanedPath).length,
    rows: ledger.rows.length,
    reservationUsd: reserved(),
    reportDirectory: out,
  }),
);
