#!/usr/bin/env tsx
/** Operator-only, resumable refresh of bundled defaults. No account/database access. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import sharp from "sharp";
import { ONBOARDING_CATEGORIES } from "../lib/data/onboarding-categories";
import { COLOR_OPTIONS } from "../lib/data/color-options";
import { buildWardrobeItemPrompt } from "../supabase/functions/_shared/wardrobe-item-prompt-builder";
import {
  DEFAULT_WARDROBE_IMAGE_MODEL,
  DETAILED_WARDROBE_IMAGE_MODEL,
  resolveWardrobeImageModel,
  wardrobeImageInput,
} from "../supabase/functions/_shared/wardrobe-image-model";
import {
  assetRetryDelay,
  canSubmitAssetPhase,
  canWaitForAssetCredit,
  reserveAssetPhase,
  reservedAssetCost,
} from "./lib/asset-batch-guards";

const root = process.cwd(),
  staging = path.resolve("tmp/wardrobe-refresh-2026-11-06");
const assetRoot = path.resolve("public/images/wardrobe/generated/onboarding");
const evidence = path.resolve("docs/wardrobe-image-refresh-2026-11-06");
const paid = process.argv.includes("--run"),
  pilot = process.argv.includes("--pilot");
const limit = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || Infinity,
);
const budgetUsd = 70;
const autoReload = process.argv.includes("--auto-reload");
const workers = Number(
  process.argv.find((a) => a.startsWith("--workers="))?.split("=")[1] || 2,
);
if (!Number.isInteger(workers) || workers < 1 || workers > 8) {
  throw Error("Invalid worker count");
}
const cleanupVersion =
  "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";
const { combinedEnv: env } = nextEnv.loadEnvConfig(root, false, {
  info() {},
  error() {},
});
const hash = (v: Buffer | string) =>
  createHash("sha256").update(v).digest("hex");
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sampleColors: Record<string, string> = {
  "T-Shirt": "navy",
  Polo: "navy",
  OCBD: "light-blue",
  "Dress Shirt": "white",
  Blouse: "ivory",
  "Tank Top": "white",
  Sweater: "grey",
  Cardigan: "grey",
  Hoodie: "grey",
  "Quarter Zip": "navy",
  Jeans: "denim",
  Chinos: "khaki",
  Trousers: "charcoal",
  Shorts: "khaki",
  Skirt: "navy",
  Leggings: "black",
  Sneakers: "white",
  Loafers: "brown",
  Boots: "brown",
  "Dress Shoes": "black",
  Heels: "black",
  Flats: "black",
  Sandals: "tan",
  Blazer: "navy",
  Sportcoat: "grey",
  Jacket: "olive",
  Coat: "camel",
  "Mini Dress": "navy",
  "Midi Dress": "forest",
  "Maxi Dress": "navy",
  "Cocktail Dress": "burgundy",
  "Casual Dress": "blue",
  Belt: "brown",
  Tie: "burgundy",
  Watch: "grey",
  Scarf: "grey",
};
const compareTypes = new Set([
  "Jeans",
  "Sweater",
  "Coat",
  "Loafers",
  "Tie",
  "Scarf",
]);
type Phase = {
  state: string;
  reservedUsd: number;
  id?: string;
  version?: string;
  error?: string;
  predictSeconds?: number;
  estimatedUsd?: number;
  output?: string;
};
type Row = {
  file: string;
  key: string;
  category: string;
  name: string;
  color: string;
  model: string;
  prompt: string;
  originalHash: string;
  pilot: boolean;
  alternate?: boolean;
  retryOf?: string;
  generate?: Phase;
  cleanup?: Phase;
  rawPath?: string;
  preparedPath?: string;
  qa?: {
    passed: boolean;
    reasons: string[];
    transparentFraction: number;
    touchesEdge: boolean;
  };
  review?: { accepted: boolean; reason: string; preparedHash: string };
  appliedHash?: string;
};
type Ledger = {
  startedAt: string;
  updatedAt: string;
  budgetUsd: number;
  rows: Row[];
  stopReason?: string;
  rateGapMs: number;
  nextCreateAt: number;
  lastThrottle?: { at: string; detail: string; retryAfterMs: number };
};
await fs.mkdir(staging, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
const ledgerFile = path.join(staging, "ledger.json");
const lockPath = path.join(staging, "run.lock");
if (paid) {
  const lock = await fs.open(lockPath, "wx");
  await lock.writeFile(String(process.pid));
  await lock.close();
}
try {
  let ledger: Ledger;
  try {
    ledger = JSON.parse(await fs.readFile(ledgerFile, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    ledger = {
      startedAt: new Date().toISOString(),
      updatedAt: "",
      budgetUsd,
      rows: [],
      rateGapMs: 1000,
      nextCreateAt: 0,
    };
    const files = new Set<string>(
      JSON.parse(
        await fs.readFile("public/clothing-image-options.json", "utf8"),
      ),
    );
    for (const category of ONBOARDING_CATEGORIES) {
      for (const sub of category.subcategories) {
        for (
          const color of COLOR_OPTIONS.filter((c) => c.value)
        ) {
          const file = `${slug(category.key)}-${
            slug(sub.name)
          }-${color.value}.png`;
          if (!files.has(file)) {
            throw Error("Catalog inventory mismatch: " + file);
          }
          const model = resolveWardrobeImageModel("auto", {
            name: sub.name,
            category: category.key,
          });
          const details: string[] = [
            "Photorealistic commercial clothing photograph with visible real fabric weave, stitching, natural material grain, subtle folds and dimensional construction. This must look like a photographed physical product, not an illustration, vector, flat drawing, game asset, plastic render, or airbrushed mockup.",
            `Color target: ${color.label}${
              color.hex
                ? ` (approximate fabric color reference ${color.hex})`
                : ""
            }. Preserve that color under neutral light; never print the reference code. Do not add patterns, logos, labels, words, watermarks, other garments or accessories.`,
            "Fit the ENTIRE product within the center 78% of the square canvas. Leave generous pure-white space on ALL four sides. Every sleeve, hem, toe, heel, buckle, strap, and loose end must remain fully visible. No part may touch an image edge.",
          ];
          if (category.key === "Shoes") {
            details.push(
              "Show exactly one matching left-and-right pair, fully visible in a realistic three-quarter product view. Both shoes stand upright with soles on the same horizontal surface and toes pointing the same way. No opposing vertical soles, extra shoes or floating fragments. Keep both shoes on the same scale; no feet, socks or shoe trees.",
            );
          } else if (sub.name === "Belt") {
            details.push(
              "Show one complete ADULT WAIST BELT arranged in a compact horizontal oval coil. Both the single metal buckle and the long tapered belt end must be visible. It is a long waist belt, never a short watch strap. No white holding bands, clips, stands, hands, or props.",
            );
          } else if (sub.name === "Watch") {
            details.push(
              `Show a realistic silver stainless-steel wristwatch with a ${color.label} dial and matching silver bracelet. Complete round watch face and full bracelet are visible. No brand text or invented lettering.`,
            );
          } else if (sub.name === "Tie") {
            details.push(
              "Show one complete necktie with a neat knot and full pointed end, front view, no shirt, neck, person, or collar.",
            );
          } else if (sub.name === "Scarf") {
            details.push(
              "Show one complete wool scarf draped in a compact natural fold, with both ends fully visible. No mannequin or neck.",
            );
          } else {details.push(
              "Show the complete garment from the front on an invisible form, with natural volume. No visible body, mannequin, hanger, hands, person, stand or props.",
            );}
          const prompt = buildWardrobeItemPrompt({
            name: sub.name,
            category: category.key,
            color: color.label,
          }) + "\n\n### Photographic finish and category requirements\n" +
            details.map((v) => "- " + v).join("\n");
          const originalHash = hash(
            await fs.readFile(path.join(assetRoot, file)),
          );
          const row: Row = {
            file,
            key: file.slice(0, -4),
            category: category.key,
            name: sub.name,
            color: color.value,
            model,
            prompt,
            originalHash,
            pilot: color.value === sampleColors[sub.name],
          };
          ledger.rows.push(row);
          if (
            row.pilot && compareTypes.has(sub.name) &&
            !(category.key === "Layers" && sub.name === "Cardigan")
          ) {
            ledger.rows.push({
              ...row,
              key: row.key + "-alternate",
              model: model === DEFAULT_WARDROBE_IMAGE_MODEL
                ? DETAILED_WARDROBE_IMAGE_MODEL
                : DEFAULT_WARDROBE_IMAGE_MODEL,
              alternate: true,
            });
          }
        }
      }
    }
  }
  if (ledger.budgetUsd !== budgetUsd) {
    throw Error("Existing ledger budget mismatch");
  }
  if (paid) {
    if (
      ledger.stopReason?.startsWith("Awaiting provider credit:") &&
      !process.argv.includes("--resume-funded")
    ) {
      throw Error(
        "Credit confirmation required: add provider credit, then resume with --resume-funded.",
      );
    }
    if (
      process.argv.includes("--resume-funded") &&
      ledger.stopReason?.startsWith("Awaiting provider credit:")
    ) delete ledger.stopReason;
    const requestedPace = Number(
      process.argv.find((a) => a.startsWith("--pace-ms="))?.split("=")[1] ||
        1250,
    );
    if (
      !Number.isFinite(requestedPace) || requestedPace < 500 ||
      requestedPace > 30000
    ) throw Error("Invalid batch pacing");
    ledger.rateGapMs = requestedPace;
    if (
      ledger.stopReason ===
        "Operator interrupted; accepted work remains resumable"
    ) delete ledger.stopReason;
  }
  let saving = Promise.resolve();
  function save() {
    ledger.updatedAt = new Date().toISOString();
    const contents = JSON.stringify(ledger, null, 2) + "\n";
    saving = saving.then(async () => {
      const tmp = ledgerFile + ".next";
      await fs.writeFile(tmp, contents);
      await fs.rename(tmp, ledgerFile);
    });
    return saving;
  }
  const reserved = () => reservedAssetCost(ledger.rows);
  function summary() {
    const assets = ledger.rows.filter((r) => !r.alternate),
      nano = assets.filter((r) =>
        r.model === DETAILED_WARDROBE_IMAGE_MODEL
      ).length;
    return {
      assets: assets.length,
      nano,
      klein: assets.length - nano,
      pilotRows: ledger.rows.filter((r) => r.pilot).length,
      estimatedGenerationAndCleanupUsd: nano * 0.067 +
        (assets.length - nano) * 0.001048576 + assets.length * 0.00043,
      budgetUsd,
      reservedUsd: reserved(),
      prepared: assets.filter((r) => r.preparedPath).length,
      structurallyPassed: assets.filter((r) => r.qa?.passed).length,
      approved: assets.filter((r) => r.review?.accepted).length,
      stopReason: ledger.stopReason || null,
    };
  }
  if (!paid) {
    try {
      await fs.access(lockPath);
      console.log(
        JSON.stringify({ mode: "read-only: worker active", ...summary() }),
      );
      process.exit(0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  await save();
  await fs.writeFile(
    path.join(evidence, "plan.json"),
    JSON.stringify(
      {
        createdAt: ledger.startedAt,
        ...summary(),
        choices: ONBOARDING_CATEGORIES.flatMap((c) =>
          c.subcategories.map((s) => ({
            category: c.key,
            type: s.name,
            model: resolveWardrobeImageModel("auto", {
              name: s.name,
              category: c.key,
            }),
          }))
        ),
        limits: [
          "Only bundled defaults; no user photos, personal wardrobes, database rows, or branded legacy assets.",
          "All files remain staged until structural and visual review.",
          "Original PNG paths remain stable so saved references continue working.",
          "No unbounded retries, expensive model substitution, automatic top-ups, or uncertain POST resubmission.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  if (!paid) {
    console.log(JSON.stringify({ mode: "dry-run", ...summary() }));
    process.exit(0);
  }
  if (!env.REPLICATE_API_TOKEN) throw Error("REPLICATE_API_TOKEN is missing");
  let halted = false, createQueue = Promise.resolve();
  process.on("SIGTERM", () => {
    halted = true;
    ledger.stopReason = "Operator interrupted; accepted work remains resumable";
  });
  const headers = {
    Authorization: "Bearer " + env.REPLICATE_API_TOKEN,
    "Content-Type": "application/json",
  };
  function safeError(error: unknown) {
    return String(error instanceof Error ? error.message : error).split(
      env.REPLICATE_API_TOKEN!,
    ).join("[REDACTED]").slice(0, 400);
  }
  async function createPrediction(
    row: Row,
    kind: "generate" | "cleanup",
    input: object,
  ) {
    const phase = row[kind]!;
    const work = createQueue.then(async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        if (halted) throw Error("Batch halted");
        await sleep(Math.max(0, ledger.nextCreateAt - Date.now()));
        if (halted) throw Error("Batch halted before provider submission");
        ledger.nextCreateAt = Date.now() + ledger.rateGapMs;
        phase.state = "submitting";
        await save();
        const response = await fetch(
          kind === "generate"
            ? "https://api.replicate.com/v1/models/" + row.model +
              "/predictions"
            : "https://api.replicate.com/v1/predictions",
          {
            method: "POST",
            headers: {
              ...headers,
              "Cancel-After": kind === "cleanup" ? "20s" : "60s",
            },
            body: JSON.stringify({
              ...(kind === "cleanup" ? { version: cleanupVersion } : {}),
              input,
            }),
            signal: AbortSignal.timeout(30_000),
          },
        );
        const body = await response.json();
        if (response.ok) {
          phase.id = body.id;
          phase.version = body.version;
          phase.state = body.status;
          await save();
          return;
        }
        const detail = safeError(
          String(
            body.detail || body.error?.code || body.error?.message ||
              body.error || body.title || "Provider rejected request",
          ),
        );
        if (canWaitForAssetCredit(response.status, detail, autoReload)) {
          phase.state = "awaiting_credit";
          const retryAfterMs = Math.max(
            30000,
            assetRetryDelay(
              response.headers.get("retry-after") || body.retry_after,
              detail,
              attempt,
            ),
          );
          ledger.nextCreateAt = Date.now() + retryAfterMs;
          ledger.lastThrottle = {
            at: new Date().toISOString(),
            detail,
            retryAfterMs,
          };
          await save();
          console.log(
            JSON.stringify({
              event: "waiting_for_configured_auto_reload",
              retryAfterMs,
            }),
          );
          if (attempt === 9) {
            halted = true;
            ledger.stopReason =
              "Awaiting provider credit: configured auto reload did not complete within bounded retries.";
            await save();
            throw Error(ledger.stopReason);
          }
          continue;
        }
        if (
          response.status === 429 &&
          !/exhausted|insufficient.credit/i.test(detail)
        ) {
          phase.state = "rate_limited";
          const retryAfterMs = assetRetryDelay(
            response.headers.get("retry-after") || body.retry_after,
            detail,
            attempt,
          );
          ledger.nextCreateAt = Date.now() + retryAfterMs;
          ledger.lastThrottle = {
            at: new Date().toISOString(),
            detail,
            retryAfterMs,
          };
          if (/less than\s+\$5/i.test(detail)) {
            halted = true;
            ledger.stopReason =
              "Awaiting provider credit: Replicate reports less than $5. Holding new batch work to preserve production credit.";
            await save();
            throw Error(ledger.stopReason);
          }
          console.log(
            JSON.stringify({ event: "throttled", detail, retryAfterMs }),
          );
          await save();
          continue;
        }
        phase.state = "rejected";
        phase.error = `HTTP ${response.status}: ${detail}`.slice(0, 400);
        if (
          [401, 402, 403].includes(response.status) ||
          /exhausted|insufficient.credit/i.test(detail)
        ) {
          halted = true;
          ledger.stopReason = phase.error;
        }
        await save();
        throw Error(phase.error);
      }
      throw Error(
        "Provider rate-limit retries exhausted; no prediction accepted",
      );
    });
    createQueue = work.catch(() => {});
    await work;
  }
  async function phase(row: Row, kind: "generate" | "cleanup", input: object) {
    let entry = row[kind];
    if (!entry) {
      if (halted) throw Error("Batch halted");
      const ceiling = kind === "cleanup"
        ? 0.005
        : row.model === DETAILED_WARDROBE_IMAGE_MODEL
        ? 0.07
        : 0.002;
      try {
        entry = reserveAssetPhase(ledger.rows, row, kind, ceiling, budgetUsd);
      } catch (error) {
        halted = true;
        ledger.stopReason = "Batch admission budget reached";
        throw error;
      }
      await save();
      await createPrediction(row, kind, input);
    } else if (canSubmitAssetPhase(entry)) {
      await createPrediction(row, kind, input);
    }
    if (!entry.id) {
      throw Error(
        "Uncertain or rejected submission; refusing another paid POST",
      );
    }
    const started = Date.now();
    while (Date.now() - started < 160_000) {
      const r = await fetch(
        "https://api.replicate.com/v1/predictions/" +
          encodeURIComponent(entry.id),
        { headers, signal: AbortSignal.timeout(20_000) },
      );
      if (r.status === 429 || r.status >= 500) {
        await sleep(3000);
        continue;
      }
      if (!r.ok) throw Error("Prediction poll HTTP " + r.status);
      const d = await r.json();
      entry.state = d.status;
      entry.predictSeconds = d.metrics?.predict_time;
      if (["failed", "canceled", "cancelled", "aborted"].includes(d.status)) {
        entry.error = String(d.error || d.status).slice(0, 400);
        await save();
        throw Error(entry.error);
      }
      if (d.status === "succeeded") {
        const output = typeof d.output === "string"
          ? d.output
          : Array.isArray(d.output)
          ? d.output.find((s: unknown) => typeof s === "string")
          : null;
        if (
          !output || !/^https:\/\/([^/]+\.)?replicate\.delivery\//.test(output)
        ) {
          entry.error = "Missing or unapproved provider output URL";
          await save();
          throw Error(entry.error);
        }
        entry.output = output;
        entry.estimatedUsd = kind === "cleanup"
          ? (entry.predictSeconds || 0) * 0.000225
          : row.model === DETAILED_WARDROBE_IMAGE_MODEL
          ? 0.067
          : 0.001048576;
        await save();
        const image = await fetch(output, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!image.ok) throw Error("Image download HTTP " + image.status);
        if (Number(image.headers.get("content-length")) > 20_000_000) {
          throw Error("Provider image too large");
        }
        const bytes = Buffer.from(await image.arrayBuffer());
        if (bytes.length > 20_000_000) throw Error("Provider image too large");
        return bytes;
      }
      await sleep(1200);
    }
    throw Error("Prediction still pending; resume its saved handle");
  }
  async function inspect(bytes: Buffer) {
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    let clear = 0, solid = 0, touchesEdge = false;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const a =
          data[(y * info.width + x) * info.channels + info.channels - 1];
        if (a < 16) clear++;
        if (a > 180) solid++;
        if (
          (x < 3 || y < 3 || x >= info.width - 3 || y >= info.height - 3) &&
          a > 128
        ) touchesEdge = true;
      }
    }
    const transparentFraction = clear / (info.width * info.height),
      reasons = [];
    if (info.width !== 1024 || info.height !== 1024) {
      reasons.push("Unexpected output dimensions");
    }
    if (
      transparentFraction < 0.2 || transparentFraction > 0.97 || solid < 5000
    ) {
      reasons.push("Invalid foreground/alpha coverage");
    }
    if (touchesEdge) {
      reasons.push(
        "Foreground touches image boundary; possible cropped product",
      );
    }
    return {
      passed: reasons.length === 0,
      reasons,
      transparentFraction,
      touchesEdge,
    };
  }
  async function prepare(row: Row) {
    try {
      if (!row.rawPath) {
        const bytes = await phase(
          row,
          "generate",
          wardrobeImageInput(row.model, row.prompt),
        );
        const m = await sharp(bytes).metadata();
        if (m.width !== 1024 || m.height !== 1024) {
          throw Error("Unexpected generation dimensions");
        }
        row.rawPath = path.join(staging, row.key + "-raw.png");
        await fs.writeFile(row.rawPath, bytes);
        await save();
      }
      if (!row.preparedPath) {
        const bytes = await fs.readFile(row.rawPath),
          cutout = await phase(row, "cleanup", {
            image: "data:image/png;base64," + bytes.toString("base64"),
            format: "png",
            background_type: "rgba",
          });
        row.qa = await inspect(cutout);
        row.preparedPath = path.join(staging, row.key + "-prepared.png");
        await sharp(cutout).png({ compressionLevel: 9 }).toFile(
          row.preparedPath,
        );
        await save();
      }
      console.log(
        JSON.stringify({
          file: row.key,
          model: row.model,
          qa: row.qa?.passed,
          prepared: summary().prepared,
          reservedUsd: Number(reserved().toFixed(3)),
        }),
      );
    } catch (error) {
      console.log(JSON.stringify({ file: row.key, error: safeError(error) }));
      await save();
    }
  }
  try {
    const queue = ledger.rows.filter((r) =>
      (!pilot || r.pilot) && (!r.alternate || pilot) && !r.preparedPath &&
      !r.generate?.error && !r.cleanup?.error
    ).sort((a, b) =>
      // Finish already accepted work before admitting another generation.
      Number(Boolean(b.rawPath || b.generate?.id)) -
        Number(Boolean(a.rawPath || a.generate?.id)) ||
      Number(b.pilot) - Number(a.pilot)
    ).slice(0, limit);
    let index = 0;
    await Promise.all(Array.from({ length: workers }, async () => {
      while (index < queue.length && !halted) {
        const row = queue[index++];
        await prepare(row);
      }
    }));
    await save();
    console.log(
      JSON.stringify({ mode: pilot ? "pilot" : "bulk", ...summary() }),
    );
    if (halted) process.exitCode = 1;
  } finally {
    await saving;
  }
} finally {
  if (paid) await fs.rm(lockPath, { force: true });
}
