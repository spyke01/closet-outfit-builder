import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const directory = path.join(root, "docs/ai-image-comparison-2026-11-06");
const data = JSON.parse(await fs.readFile(path.join(directory, "results.json")));
const review = JSON.parse(await fs.readFile(path.join(directory, "review.json")));
const existingRoot = "public/images/wardrobe/generated/onboarding/";
const existing = {
  "navy-tee": ["tops-t-shirt-navy.png", "Existing navy cotton T-shirt"],
  "white-blouse": ["tops-blouse-ivory.png", "Existing ivory silk-blend blouse"],
  "striped-shirt": ["tops-ocbd-red.png", "Existing solid red OCBD; the new prompt adds stripes"],
  "checked-blazer": ["layers-blazer-navy.png", "Existing plain navy blazer; the new prompt adds checks"],
  "white-sneakers": ["shoes-sneakers-white.png", "Existing white sneaker default"],
  "brown-belt": ["accessories-belt-brown.png", "Existing brown leather belt"],
  "green-dress": ["dresses-midi-dress-forest.png", "Existing forest midi dress; the new prompt specifies satin and a V neck"],
  "silver-watch": ["accessories-watch-grey.png", "Existing grey watch; the new prompt specifies a black dial and silver bracelet"],
};
const titles = {
  "navy-tee": "Navy T-shirt",
  "white-blouse": "Ivory blouse",
  "striped-shirt": "Striped shirt",
  "checked-blazer": "Checked blazer",
  "white-sneakers": "White sneakers",
  "brown-belt": "Brown belt",
  "green-dress": "Green midi dress",
  "silver-watch": "Silver watch",
};
const models = [
  { id: "klein", label: "FLUX.2 Klein 4B", subtitle: "Current generation default" },
  { id: "pimage", label: "Pruna P-Image", subtitle: "Alternative model" },
  { id: "schnell", label: "FLUX.1 Schnell", subtitle: "Alternative model" },
  { id: "banana2", label: "Nano Banana 2", subtitle: "Alternative model" },
];
const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const embedded = new Map();
async function source(file) {
  if (!embedded.has(file)) {
    const bytes = await fs.readFile(path.resolve(root, file));
    embedded.set(file, `data:image/${path.extname(file) === ".png" ? "png" : "webp"};base64,${bytes.toString("base64")}`);
  }
  return embedded.get(file);
}
async function card({ label, subtitle, status, file, note }) {
  return `<article class="card ${status === "NEW" ? "new" : "old"}"><header><span class="status">${status}</span><h3>${escape(label)}</h3><p>${escape(subtitle)}</p></header><button class="photo" type="button" aria-label="Enlarge ${escape(label)}"><img src="${await source(file)}" alt="${escape(note)}"></button><p class="caption">${escape(note)}</p></article>`;
}
async function oldCard(id) {
  return card({ label: "Existing library", subtitle: "Saved asset · unchanged", status: "EXISTING", file: existingRoot + existing[id][0], note: existing[id][1] });
}
async function newCard(id, model) {
  const row = data.rows.find((r) => r.caseId === id && r.modelId === model.id);
  if (!row?.cleanedPath) throw Error("Missing completed comparison: " + id + "/" + model.id);
  return card({ label: model.label, subtitle: model.subtitle, status: "NEW", file: path.relative(root, path.join(directory, row.cleanedPath)), note: review.rows[id + "-" + model.id] });
}
const hero = [await oldCard("navy-tee"), await card({ label: "Imagen 4", subtitle: "Previous live-generation model", status: "ARCHIVED", file: "tmp/model-comparison/images/google-imagen-4.png", note: "Saved February 16 test. Older transparency prompt; visible squares are baked into the image." })];
for (const model of models) hero.push(await newCard("navy-tee", model));
const sheets = [];
for (const [index, ids] of [["01-basics", ["navy-tee", "white-blouse"]], ["02-patterns", ["striped-shirt", "checked-blazer"]], ["03-shoes-dress", ["white-sneakers", "green-dress"]], ["04-accessories", ["brown-belt", "silver-watch"]]]) {
  let rows = "";
  for (const id of ids) {
    const cards = [await oldCard(id)];
    for (const model of models) cards.push(await newCard(id, model));
    rows += `<section class="piece"><h2>${titles[id]}</h2><div class="scroller" tabindex="0" aria-label="${titles[id]} comparison"><div class="comparison-grid">${cards.join("")}</div></div></section>`;
  }
  sheets.push(`<section class="sheet" id="${index}"><div class="sheet-heading"><span>EXISTING LIBRARY VS NEW TEST OUTPUTS</span><p>Same display size and backdrop · existing designs may differ · new outputs share one prompt per piece</p></div>${rows}</section>`);
}
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Existing wardrobe images vs new models</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf0f5;color:#142034;font-family:Arial,sans-serif}main{max-width:1680px;margin:auto;padding:28px}h1{font-size:34px;margin:0 0 12px}h2{font-size:24px;margin:0 0 14px}h3{font-size:20px;margin:7px 0}p{line-height:1.5;margin:0}.intro{max-width:1100px;color:#4d5e74;margin-bottom:20px}.legend{padding:16px 20px;background:#fff;border-left:4px solid #448cdd;margin-bottom:22px}.legend p+p{margin-top:8px}.toolbar{display:flex;gap:12px;align-items:center;margin:20px 0}select,button{font:inherit}select{padding:9px;border:1px solid #a7b4c5;border-radius:6px;background:#fff}.sheet{padding:24px;background:#fff;border-radius:16px;margin:24px 0;overflow:hidden}.sheet-heading{margin-bottom:22px}.sheet-heading>span{font-size:18px;font-weight:700;letter-spacing:1px}.sheet-heading p{font-size:15px;color:#526177;margin-top:7px}.piece+.piece{margin-top:30px}.comparison-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;min-width:1250px}.hero-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;min-width:960px}.scroller{overflow-x:auto}.card{border:1px solid #d1dae6;border-radius:12px;overflow:hidden;min-width:0;background:#fff}.card header{padding:14px 15px;min-height:112px}.card header p{font-size:14px;color:#54637a}.status{font-size:13px;font-weight:700;letter-spacing:1.2px;color:#526177}.new .status{color:#175cac}.new{border-top:3px solid #448cdd}.old{border-top:3px solid #8a96a7}.photo{display:block;border:0;border-block:1px solid #e1e6ee;padding:12px;width:100%;height:246px;background:#eff2f7;cursor:zoom-in}.photo img{height:100%;width:100%;object-fit:contain}.hero-grid .photo{height:340px}.caption{font-size:14px;line-height:1.45;padding:13px 15px;min-height:92px;color:#405067}.dark .photo{background:#172235}.fine{font-size:14px;color:#526177}dialog{border:0;border-radius:12px;padding:18px;max-width:95vw;max-height:95vh;background:#fff;color:#142034}dialog::backdrop{background:#101824c9}dialog>button{float:right;border:1px solid #a7b4c5;border-radius:6px;background:#fff;padding:8px 13px;cursor:pointer}dialog>h2{margin:8px 100px 16px 0}dialog .zoom{display:grid;place-items:center;background:#eff2f7}dialog img{display:block;max-width:86vw;max-height:76vh;object-fit:contain}.dark dialog .zoom{background:#172235}@media(max-width:650px){main{padding:14px}h1{font-size:28px}.sheet{padding:16px}.comparison-grid{min-width:1240px}.hero-grid{min-width:900px}.toolbar{flex-wrap:wrap}.intro{font-size:15px}}
</style></head><body><main><h1>Existing wardrobe images vs new models</h1><p class="intro">Actual saved images, clearly marked. The four NEW models were tested on November 6, 2026 using identical prompts per piece and the same background remover. All images retain their original colors and framing.</p><div class="legend"><p><strong>EXISTING:</strong> Your current bundled default-image library, added February 13. Its generator default was GPT Image 1.5, but no per-image model manifest is retained.</p><p><strong>ARCHIVED:</strong> An actual Imagen 4 test saved February 16. It used an older transparency prompt. This shows the old output, not a controlled rerun.</p><p><strong>NEW:</strong> The November 6 samples. Klein is now used for new generated wardrobe images. Existing library assets have not been replaced. No new paid generations were needed to build this review.</p></div><div class="toolbar"><label for="backdrop">Image backdrop</label><select id="backdrop"><option value="light">Light</option><option value="dark">Dark</option></select><span class="fine">Select any image to enlarge it. On a phone, swipe across each comparison.</span></div><section class="sheet" id="00-original-vs-new"><div class="sheet-heading"><span>NAVY T-SHIRT · EXISTING, PREVIOUS MODEL, AND NEW OPTIONS</span><p>All are navy cotton T-shirts. The existing and archived versions used different prompts and workflows.</p></div><div class="scroller" tabindex="0" aria-label="Navy T-shirt historical and new models"><div class="hero-grid">${hero.join("")}</div></div></section>${sheets.join("")}<p class="fine">One new sample per model per piece. This is a visual screening comparison, not proof of a model's overall success rate. Matching a real owned garment requires its source photograph. The file includes all images and works without a local server or internet connection.</p></main><dialog aria-labelledby="zoom-title"><button type="button" id="close">Close</button><h2 id="zoom-title"></h2><div class="zoom"><img id="zoom-image" alt=""></div></dialog><script>
document.querySelector('#backdrop').addEventListener('change',e=>document.body.classList.toggle('dark',e.target.value==='dark'));
const dialog=document.querySelector('dialog');document.querySelectorAll('.photo').forEach(button=>button.addEventListener('click',()=>{const img=button.querySelector('img'),card=button.closest('.card');document.querySelector('#zoom-title').textContent=card.querySelector('.status').textContent+' · '+card.querySelector('h3').textContent;const zoom=document.querySelector('#zoom-image');zoom.src=img.src;zoom.alt=img.alt;dialog.showModal()}));document.querySelector('#close').addEventListener('click',()=>dialog.close());
</script></body></html>`;
await fs.writeFile(path.join(directory, "remote-review.html"), html);
await fs.mkdir(path.join(directory, "remote-review-images"), { recursive: true });
console.log(JSON.stringify({output: "docs/ai-image-comparison-2026-11-06/remote-review.html", uniqueImages: embedded.size, bytes: Buffer.byteLength(html), newPaidCalls: 0}));
