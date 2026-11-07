import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const staging = path.resolve("tmp/wardrobe-refresh-2026-11-06");
const target = path.resolve("public/images/wardrobe/generated/onboarding");
const evidence = path.resolve("docs/wardrobe-image-refresh-2026-11-06");
const ledgerPath = path.join(staging, "ledger.json");
const apply = process.argv.includes("--apply");
const lockPath = path.join(staging, "run.lock");
if (apply) {
  const lock = await fs.open(lockPath, "wx");
  await lock.writeFile(String(process.pid));
  await lock.close();
} else {
  try {
    await fs.access(lockPath);
    throw Error(
      "Wait for the generation process to finish before applying reviewed assets",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
try {
  const ledger = JSON.parse(await fs.readFile(ledgerPath, "utf8"));
  try {
    const decisions = JSON.parse(
      await fs.readFile(path.join(staging, "reviews.json"), "utf8"),
    );
    for (const row of ledger.rows) {
      if (decisions[row.key]) row.review = decisions[row.key];
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const sha = (b) => createHash("sha256").update(b).digest("hex");
  const approved = ledger.rows.filter((r) =>
    !r.alternate && r.review?.accepted && r.qa?.passed && r.preparedPath
  );
  if (new Set(approved.map((r) => r.file)).size !== approved.length) {
    throw Error("Duplicate approved target filenames");
  }
  const applied = [];
  const catalog = JSON.parse(
    await fs.readFile("public/clothing-image-options.json", "utf8"),
  );
  // Keep the original PNGs as rollback sources and serve compact WebP derivatives.
  // Build a fallback for every option, including retained or rejected candidates.
  if (apply) {
    for (const file of catalog) {
      if (!/^[a-z0-9-]+\.png$/.test(file)) {
        throw Error("Invalid catalog filename");
      }
      const derivative = path.join(target, file.replace(/\.png$/, ".webp"));
      try {
        await fs.access(derivative);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await sharp(path.join(target, file)).webp({
          quality: 95,
          alphaQuality: 100,
          effort: 6,
        }).toFile(derivative);
      }
    }
  }
  for (const row of approved) {
    if (!/^[a-z0-9-]+\.png$/.test(row.file)) {
      throw Error("Invalid target filename");
    }
    if (!path.resolve(row.preparedPath).startsWith(staging + path.sep)) {
      throw Error("Candidate escaped staging directory");
    }
    const bytes = await fs.readFile(row.preparedPath),
      meta = await sharp(bytes).metadata(),
      newHash = sha(bytes);
    if (row.review.preparedHash !== newHash) {
      throw Error("Candidate bytes changed after visual review: " + row.file);
    }
    if (
      meta.format !== "png" || meta.width !== 1024 || meta.height !== 1024 ||
      !meta.hasAlpha
    ) throw Error("Invalid reviewed PNG: " + row.file);
    const original = path.join(target, row.file),
      current = await fs.readFile(original),
      currentHash = sha(current);
    if (currentHash !== row.originalHash) {
      throw Error("Existing asset changed since inventory: " + row.file);
    }
    const webp = await sharp(bytes).webp({
      quality: 95,
      alphaQuality: 100,
      effort: 6,
    }).toBuffer();
    const renderedFile = row.file.replace(/\.png$/, ".webp"),
      renderedHash = sha(webp);
    if (apply) {
      const backup = path.join(staging, "originals", row.file);
      await fs.mkdir(path.dirname(backup), { recursive: true });
      if (currentHash === row.originalHash) {
        try {
          await fs.copyFile(original, backup, constants.COPYFILE_EXCL);
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
        }
      }
      if (sha(await fs.readFile(backup)) !== row.originalHash) {
        throw Error("Original backup mismatch: " + row.file);
      }
      const destination = path.join(target, renderedFile),
        temporary = destination + ".refresh";
      await fs.writeFile(temporary, webp);
      await fs.rename(temporary, destination);
      row.appliedHash = renderedHash;
    }
    applied.push({
      file: row.file,
      renderedFile,
      category: row.category,
      type: row.name,
      color: row.color,
      model: row.model,
      oldHash: row.originalHash,
      generatedPngHash: newHash,
      renderedHash,
      pngBytes: bytes.length,
      webpBytes: webp.length,
      review: row.review.reason,
    });
  }
  if (apply) {
    const temporary = ledgerPath + ".next";
    await fs.writeFile(temporary, JSON.stringify(ledger, null, 2) + "\n");
    await fs.rename(temporary, ledgerPath);
  }
  await fs.mkdir(evidence, { recursive: true });
  const held = ledger.rows.filter((r) =>
    !r.alternate && !(apply ? r.appliedHash : approved.includes(r))
  ).map((r) => ({
    file: r.file,
    reason: r.review?.reason || r.qa?.reasons?.join(", ") || "Not yet approved",
  }));
  await fs.writeFile(
    path.join(
      evidence,
      apply ? "replacement-manifest.json" : "replacement-dry-run.json",
    ),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        applied: apply,
        count: applied.length,
        images: applied,
        held,
        reservedUsd: ledger.rows.reduce(
          (n, r) =>
            n + (r.generate?.reservedUsd || 0) + (r.cleanup?.reservedUsd || 0),
          0,
        ),
        estimatedProviderUsd: ledger.rows.reduce(
          (n, r) =>
            n + (r.generate?.estimatedUsd || 0) +
            (r.cleanup?.estimatedUsd || 0),
          0,
        ),
        costNote:
          "Provider estimates and admission reservations are not reconciled invoices. Original PNG bytes are archived in ignored staging/originals.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      mode: apply ? "applied" : "dry-run",
      approved: approved.length,
      held: held.length,
    }),
  );
} finally {
  if (apply) await fs.rm(lockPath, { force: true });
}
