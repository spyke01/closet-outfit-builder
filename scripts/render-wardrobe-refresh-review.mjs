import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { pathToFileURL } from "node:url";

const staging = path.resolve("tmp/wardrobe-refresh-2026-11-06");
const ledger = JSON.parse(
  await fs.readFile(path.join(staging, "ledger.json"), "utf8"),
);
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
const output = path.join(staging, "review");
await fs.mkdir(output, { recursive: true });
const pilot = !process.argv.includes("--full");
const pending = process.argv.includes("--pending");
const complete = process.argv.includes("--complete");
const incompleteTypes = new Set(
  ledger.rows.filter((r) =>
    !r.alternate && !r.preparedPath &&
    !r.generate?.error && !r.cleanup?.error &&
    ![r.generate?.state, r.cleanup?.state].some((s) =>
      ["failed", "canceled", "cancelled", "aborted", "rejected"].includes(s)
    )
  ).map((r) => r.category + " · " + r.name),
);
const rows = ledger.rows.filter((r) =>
  r.preparedPath && (pilot ? r.pilot : !r.alternate) &&
  (!pending || !r.review) &&
  (!complete || !incompleteTypes.has(r.category + " · " + r.name))
);
const groups = new Map();
for (const row of rows) {
  const key = pilot ? row.category : row.category + " · " + row.name;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}
const esc = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
    '"',
    "&quot;",
  );
const cache = new Map();
async function image(file) {
  if (!cache.has(file)) {
    cache.set(
      file,
      "data:image/webp;base64," +
        (await sharp(file).resize(384, 384, {
          fit: "inside",
          withoutEnlargement: true,
        }).webp({ quality: 94, alphaQuality: 100 }).toBuffer()).toString(
          "base64",
        ),
    );
  }
  return cache.get(file);
}
const results = [];
for (const [name, items] of groups) {
  const cards = [];
  for (const row of items) {
    const old = path.resolve(
      "public/images/wardrobe/generated/onboarding",
      row.file,
    );
    cards.push(
      `<article><header><strong>${esc(row.name)} · ${
        esc(row.color)
      }</strong><p>${
        row.model.includes("klein") ? "Klein 4B" : "Nano Banana 2"
      }${row.alternate ? " · comparison alternative" : " · selected route"} · ${
        row.qa?.passed
          ? "structure passed"
          : "HOLD: " + esc(row.qa?.reasons?.join(", "))
      }</p></header><div class="pair"><figure><img src="${await image(
        old,
      )}" alt="Existing ${
        esc(row.file)
      }"><figcaption>EXISTING</figcaption></figure><figure><img src="${await image(
        row.preparedPath,
      )}" alt="New ${esc(row.key)}"><figcaption>NEW · ${
        row.model.includes("klein") ? "Klein" : "Nano"
      }</figcaption></figure></div></article>`,
    );
  }
  const stem = (pilot ? "pilot-" : "full-") +
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/g, "");
  const html =
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${
      esc(name)
    } image review</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#eef1f5;color:#17263b;font:16px Arial,sans-serif}h1{margin:0 0 8px;font-size:28px}p{margin:5px 0;font-size:14px;line-height:1.4;color:#4f6178}.grid{display:grid;grid-template-columns:repeat(${
      pilot ? 3 : 5
    },minmax(0,1fr));gap:14px;margin-top:20px}article{background:white;border:1px solid #cfd8e5;border-radius:10px;overflow:hidden}header{padding:12px;min-height:84px}header strong{font-size:17px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:#dce3ed}figure{margin:0;min-width:0;background:#f3f5f8}img{display:block;width:100%;height:${
      pilot ? 245 : 185
    }px;object-fit:contain;padding:8px}figcaption{padding:8px;text-align:center;font-size:13px;font-weight:bold;color:#455d7b;background:white}.dark figure{background:#17263b}</style><h1>${
      esc(name)
    } · ${
      pilot ? "category pilot" : "all color candidates"
    }</h1><p>Actual old and staged new assets. Review material realism, construction, full silhouettes, intended color, clean cutouts, and consistent scale. Files remain staged until approved.</p><div class="grid">${
      cards.join("")
    }</div></html>`;
  const file = path.join(output, stem + ".html");
  await fs.writeFile(file, html);
  results.push({
    name,
    count: items.length,
    file,
    png: path.join(output, stem + ".png"),
  });
}
if (process.argv.includes("--screenshots")) {
  const module = process.env.PLAYWRIGHT_MODULE ||
    "/Users/spyke01/.cache/codex-runtimes/codex-runtime-install-7fNv40/payload/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
  const { chromium } = await import(module);
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    for (const result of results) {
      const page = await browser.newPage({
        viewport: { width: pilot ? 1800 : 2200, height: 400 },
        deviceScaleFactor: 1,
      });
      await page.goto(pathToFileURL(result.file).href);
      await page.evaluate(() =>
        Promise.all([...document.images].map((i) => i.decode()))
      );
      await page.screenshot({ path: result.png, fullPage: true });
      if (pilot) {
        await page.locator("body").evaluate((el) => el.classList.add("dark"));
        await page.screenshot({
          path: result.png.replace(".png", "-dark.png"),
          fullPage: true,
        });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
await fs.writeFile(
  path.join(output, pilot ? "pilot-index.json" : "full-index.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    pilot,
    reviewedImages: rows.length,
    groups: results.length,
    output,
  }),
);
