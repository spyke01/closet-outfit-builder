#!/usr/bin/env node
/**
 * What to Wear — Outfit Generator (CLI-only)
 * ------------------------------------------------------------
 * Usage: node generate_outfits.js [wardrobe.json] [outfits.json]
 * Defaults: ./wardrobe.json and ./outfits.json
 *
 * Security: throws if executed in a browser-like context.
 */

(() => {
  // Block browser execution (simple, effective)
  if (typeof window !== "undefined" || typeof document !== "undefined") {
    throw new Error("This script is CLI-only. Do not load it in a browser.");
  }
})();

import fs from "fs";
import path from "path";

// ---------- CONFIG ----------
const WARDROBE_PATH = process.argv[2] || path.resolve("./src/data/wardrobe.json");
const OUTFITS_PATH = process.argv[3] || path.resolve("./src/data/outfits.json");

// Tunables (tighten to reduce raw combos)
const MAX_PANTS_PER_SHIRT = 3;
const MAX_SHOES_PER_PANT = 2;
const MAX_JACKETS_PER_SET = 1;
const MAX_WATCHES = 1;

// Target curated count and score threshold
const TARGET_OUTFITS = parseInt(process.env.TARGET_OUTFITS || "250", 10);
const MIN_COMBO_SCORE = 1.2; // prune weak matches during generation

// New: capsule quota (percentages should sum ~1.0)
const CAPSULE_QUOTA = {
  Refined: parseFloat(process.env.QUOTA_REFINED || "0.40"),
  Crossover: parseFloat(process.env.QUOTA_CROSSOVER || "0.35"),
  Adventurer: parseFloat(process.env.QUOTA_ADVENTURER || "0.25"),
};

// Categories used in your files
const CATS = {
  JACKET: "Jacket/Overshirt",
  SHIRT: "Shirt",
  UNDERSHIRT: "Undershirt",
  PANTS: "Pants",
  SHOES: "Shoes",
  BELT: "Belt",
  WATCH: "Watch",
};

// Helpers for quick lookups
function indexById(arr) {
  const map = new Map();
  (arr || []).forEach((it) => map.set(it.id, it));
  return map;
}

function harmonyBonus(...ok) { return ok.filter(Boolean).length * 0.25; }

function pairCapsule(a = [], b = []) {
  return capsuleScore(a, b); // already defined in your script
}

// Core combo score
function comboScore({ shirt, pants, shoes, belt, watch, jacket }) {
  const formAvg = (shirt.formalityScore + pants.formalityScore + (shoes?.formalityScore ?? 5)) / 3;
  const fPenalty =
    0.15 * formalityDistance(shirt.formalityScore, pants.formalityScore) +
    0.10 * formalityDistance(formAvg, shoes?.formalityScore ?? 5) +
    (jacket ? 0.10 * formalityDistance(formAvg, jacket.formalityScore) : 0);

  const cTop = inferColorToken(shirt.id, shirt.name);
  const cPant = inferColorToken(pants.id, pants.name);
  const cShoe = inferColorToken(shoes.id, shoes.name);
  const cJkt = jacket ? inferColorToken(jacket.id, jacket.name) : null;

  const cBonus =
    harmonyBonus(colorsPlayNice(cTop, cPant), colorsPlayNice(cPant, cShoe), jacket && colorsPlayNice(cPant, cJkt));

  const capBonus =
    0.6 * pairCapsule(shirt.capsuleTags, pants.capsuleTags) +
    0.4 * pairCapsule(pants.capsuleTags, shoes.capsuleTags) +
    (jacket ? 0.3 * pairCapsule(shirt.capsuleTags, jacket.capsuleTags) : 0) +
    (watch ? 0.2 * pairCapsule(watch.capsuleTags, [...(jacket?.capsuleTags || []), ...shirt.capsuleTags]) : 0) +
    (belt ? 0.1 * pairCapsule(belt.capsuleTags, shoes.capsuleTags) : 0);

  return +(cBonus + capBonus - fPenalty).toFixed(3);
}

const CAPSULES = ["Refined", "Crossover", "Adventurer"]; // shorts is seasonal, not a main capsule

function countCapsulesForItem(item) {
  const counts = { Refined: 0, Crossover: 0, Adventurer: 0 };
  (item?.capsuleTags || []).forEach(tag => {
    if (CAPSULES.includes(tag)) counts[tag]++;
  });
  return counts;
}

function sumCapsuleCounts(items, byIdMap) {
  const total = { Refined: 0, Crossover: 0, Adventurer: 0 };
  for (const id of items) {
    const it = byIdMap.get(id);
    if (!it) continue;
    const c = countCapsulesForItem(it);
    for (const k of CAPSULES) total[k] += c[k];
  }
  return total;
}

function dominantCapsuleForOutfit(items, byIdMap) {
  const totals = sumCapsuleCounts(items, byIdMap);
  // tie-breaker preference: Refined > Crossover > Adventurer
  let best = "Refined", bestV = totals["Refined"];
  for (const k of ["Crossover", "Adventurer"]) {
    if (totals[k] > bestV) { best = k; bestV = totals[k]; }
  }
  return best;
}

// Parse a color token from the item id (fallback to name; then neutral)
function inferColorToken(id = "", name = "") {
  const source = `${id} ${name}`.toLowerCase();
  const palette = [
    "white", "black", "navy", "blue", "light grey", "light-gray", "lightgrey", "grey", "gray",
    "khaki", "olive", "charcoal", "tan", "brown", "dark brown", "cream", "beige", "deep navy"
  ];
  for (const token of palette) {
    if (source.includes(token.replace(" ", "-")) || source.includes(token)) return token.replace(" ", "-");
  }
  // some custom catches
  if (/denim|jeans/.test(source)) return "navy";
  if (/charcoal/.test(source)) return "charcoal";
  return "neutral";
}

// Very lightweight color coordination rules (neutrals + complementary basics)
const COLOR_GROUPS = {
  neutral: new Set(["white", "black", "grey", "gray", "light-grey", "charcoal", "tan", "beige", "cream", "brown", "dark-brown", "neutral"]),
  blue_like: new Set(["navy", "deep-navy", "blue"]),
  earth: new Set(["khaki", "olive", "brown", "dark-brown", "tan", "beige", "cream"]),
};
function colorsPlayNice(topColor, bottomColor) {
  // Always allow neutrals
  const isNeutral = (c) => COLOR_GROUPS.neutral.has(c);
  if (isNeutral(topColor) || isNeutral(bottomColor)) return true;

  // Blue + earth tones work great
  const isBlue = COLOR_GROUPS.blue_like.has(topColor) || COLOR_GROUPS.blue_like.has(bottomColor);
  const isEarth = COLOR_GROUPS.earth.has(topColor) || COLOR_GROUPS.earth.has(bottomColor);
  if (isBlue && isEarth) return true;

  // Same-family harmony (e.g., navy + navy allowed if texture differs—still OK for generator)
  if (topColor === bottomColor) return true;

  // Fallback: allow
  return true;
}

// Capsule + formality matching
function capsuleScore(aTags = [], bTags = []) {
  const A = new Set(aTags);
  const B = new Set(bTags);
  let score = 0;
  for (const t of A) if (B.has(t)) score += 1;
  return score; // 0..n
}

function formalityDistance(a = 5, b = 5) {
  return Math.abs((a ?? 5) - (b ?? 5)); // lower is better
}

// “Bad pairings” you wanted to avoid
function violatesStyleGuard(choice) {
  const { pants, shoes, jacket } = choice;

  // Identify shorts
  const isShorts = /shorts/.test(pants?.id || "") || /Shorts/.test(pants?.capsuleTags?.join(" ") || "");
  const isBoots = /boot/.test(shoes?.id || "");
  const isJacketOrShacket =
    (jacket && jacket.category === CATS.JACKET) ||
    /(shacket|jacket|coat|cardigan|crewneck|shawl)/i.test(jacket?.id || "");

  // 1) No jacket/shacket/sweater with shorts
  if (isShorts && isJacketOrShacket) return "Shorts cannot be paired with jackets/shackets/sweaters.";

  // 2) No shorts with boots
  if (isShorts && isBoots) return "Shorts cannot be paired with boots.";

  // You can extend more guards here as needed.

  return null;
}

// When to add an undershirt
function maybeUndershirt({ shirt, jacket, vibe }) {
  // Only consider tees (undershirts)
  if (!vibe.has("casual") && !jacket) return null;

  // Color pick to blend: prioritize white or cream for most refined/crossover; grey for darker stacks
  // We'll return at most one undershirt.
  if (vibe.has("refined")) {
    return pickById(["tee-white", "tee-cream", "tee-grey"]);
  }
  return pickById(["tee-white", "tee-grey", "tee-cream"]);
}

// Pick helper (first available id from wardrobe)
let W_ITEMS = []; // set later
function pickById(ids) {
  for (const id of ids) {
    const found = W_ITEMS.find((x) => x.id === id);
    if (found) return found;
  }
  return null;
}

// Belt selection based on shoes + vibe
function pickBeltFor(shoes, vibe) {
  const sid = (shoes?.id || "").toLowerCase();
  const isBlack = sid.includes("black");
  const isDressy = (shoes?.formalityScore ?? 5) >= 7;

  // If black footwear, prefer black belts
  if (isBlack) {
    return pickById(["belt-black-pebbled", "belt-reversible"]);
  }

  // If dressy + brown footwear
  if (isDressy) {
    return pickById(["belt-reversible", "belt-clean-brown"]);
  }

  // Casual/crossover default
  if (vibe.has("adventurer")) {
    return pickById(["belt-rugged", "belt-reversible"]);
  }
  return pickById(["belt-braided", "belt-clean-brown"]);
}

// Watch selection by capsule + formality
function pickWatchesFor(vibeSet, pool) {
  // rank by capsule overlap then by closeness of formality to average vibe target (5.5)
  const targetFormality = vibeSet.has("refined") ? 7 : vibeSet.has("adventurer") ? 5 : 6;
  const ranked = pool
    .map((w) => ({
      w,
      score: capsuleScore(w.capsuleTags, Array.from(vibeSet)),
      fdist: formalityDistance(w.formalityScore, targetFormality),
    }))
    .sort((a, b) => (b.score - a.score) || (a.fdist - b.fdist))
    .slice(0, MAX_WATCHES)
    .map((x) => x.w);
  return ranked;
}

// Jacket selection: only when not shorts, and only if capsule/formality play nice
function pickJacketsFor(vibeSet, shirt, pants, jackets) {
  const isShorts = /shorts/.test(pants?.id || "");
  if (isShorts) return [];

  const ranked = jackets
    .map((j) => ({
      j,
      score: capsuleScore(j.capsuleTags, Array.from(vibeSet)) +
        (colorsPlayNice(inferColorToken(j.id, j.name), inferColorToken(pants.id, pants.name)) ? 0.2 : 0),
      fdist: formalityDistance(j.formalityScore, Math.round((shirt.formalityScore + pants.formalityScore) / 2)),
    }))
    .sort((a, b) => (b.score - a.score) || (a.fdist - b.fdist))
    .slice(0, MAX_JACKETS_PER_SET)
    .map((x) => x.j);

  return ranked;
}

// Build vibe set from tags
function vibeFromTags(tags = []) {
  const s = new Set();
  const t = tags.map((x) => x.toLowerCase());
  if (t.includes("refined")) s.add("refined");
  if (t.includes("crossover")) s.add("crossover");
  if (t.includes("adventurer")) s.add("adventurer");
  if (t.includes("shorts")) s.add("shorts");
  // derived
  if (s.has("adventurer") || s.has("shorts")) s.add("casual");
  return s;
}

// De-dupe check vs existing outfits.json
function outfitExists(existing, itemIdsSet) {
  const key = [...itemIdsSet].sort().join("|");
  return existing.has(key);
}

function toKey(itemsArray) {
  return [...new Set(itemsArray)].sort().join("|");
}

function nextOutfitId(existingIds) {
  // existing like o-001, o-055 … find max numeric
  const max = existingIds.reduce((m, id) => {
    const n = parseInt((id.match(/\d+/) || [0])[0], 10) || 0;
    return Math.max(m, n);
  }, 0);
  return `o-${String(max + 1).padStart(3, "0")}`;
}

// Validate outfit items against current wardrobe
function validateOutfit(outfit, validItemIds) {
  const invalidItems = (outfit.items || []).filter(itemId => !validItemIds.has(itemId));
  return {
    isValid: invalidItems.length === 0,
    invalidItems
  };
}

// ---------- MAIN ----------
function main() {
  // Load files
  const wardrobe = JSON.parse(fs.readFileSync(WARDROBE_PATH, "utf8"));
  const outfitsDoc = JSON.parse(fs.readFileSync(OUTFITS_PATH, "utf8"));

  const items = wardrobe.items || [];
  W_ITEMS = items;

  const byId = indexById(items);
  const validItemIds = new Set(items.map(item => item.id));

  // pools
  const shirts = items.filter((x) => x.category === CATS.SHIRT);
  const undershirts = items.filter((x) => x.category === CATS.UNDERSHIRT);
  const pantsPool = items.filter((x) => x.category === CATS.PANTS);
  const shoesPool = items.filter((x) => x.category === CATS.SHOES);
  const beltsPool = items.filter((x) => x.category === CATS.BELT);
  const watchPool = items.filter((x) => x.category === CATS.WATCH);
  const jacketPool = items.filter((x) => x.category === CATS.JACKET);

  // Validate existing outfits and remove invalid ones
  const originalOutfitCount = (outfitsDoc.outfits || []).length;
  const validOutfits = [];
  const invalidOutfits = [];

  for (const outfit of outfitsDoc.outfits || []) {
    const validation = validateOutfit(outfit, validItemIds);
    if (validation.isValid) {
      validOutfits.push(outfit);
    } else {
      invalidOutfits.push({ outfit, invalidItems: validation.invalidItems });
    }
  }

  // Update outfits with only valid ones
  outfitsDoc.outfits = validOutfits;

  // Log removed outfits if any
  if (invalidOutfits.length > 0) {
    console.log(`🧹 Removed ${invalidOutfits.length} outfit(s) with invalid items:`);
    invalidOutfits.forEach(({ outfit, invalidItems }) => {
      console.log(`   - Outfit ${outfit.id}: missing items [${invalidItems.join(', ')}]`);
    });
  }

  // existing outfits index (set of item-combo keys)
  const existingCombos = new Set();
  const existingIds = [];
  for (const o of validOutfits) {
    existingIds.push(o.id);
    const k = toKey(o.items || []);
    existingCombos.add(k);
  }

  const newOutfits = [];

  // For each SHIRT -> choose pants
  for (const shirt of shirts) {
    const shirtColor = inferColorToken(shirt.id, shirt.name);
    const shirtVibe = vibeFromTags(shirt.capsuleTags);

    const rankedPants = pantsPool
      .map((p) => ({
        p,
        score:
          capsuleScore(shirt.capsuleTags, p.capsuleTags) +
          (colorsPlayNice(shirtColor, inferColorToken(p.id, p.name)) ? 0.25 : 0),
        fdist: formalityDistance(shirt.formalityScore, p.formalityScore),
      }))
      .sort((a, b) => (b.score - a.score) || (a.fdist - b.fdist))
      .slice(0, MAX_PANTS_PER_SHIRT)
      .map((x) => x.p);

    for (const pants of rankedPants) {
      const pantsIsShorts = /shorts/.test(pants.id);

      // Shoes: no boots with shorts; if shorts, prefer sneakers/loafers with Shorts tag
      const shoesRanked = shoesPool
        .filter((s) => !(pantsIsShorts && /boot/.test(s.id)))
        .map((s) => ({
          s,
          score:
            capsuleScore(pants.capsuleTags, s.capsuleTags) +
            capsuleScore(shirt.capsuleTags, s.capsuleTags),
          fdist: formalityDistance(Math.round((shirt.formalityScore + pants.formalityScore) / 2), s.formalityScore),
        }))
        .sort((a, b) => (b.score - a.score) || (a.fdist - b.fdist))
        .slice(0, MAX_SHOES_PER_PANT)
        .map((x) => x.s);

      for (const shoes of shoesRanked) {
        const vibe = new Set([...shirtVibe, ...vibeFromTags(pants.capsuleTags), ...vibeFromTags(shoes.capsuleTags)]);

        // Belt
        const belt = pickBeltFor(shoes, vibe) || beltsPool[0];

        // Watches
        const watches = pickWatchesFor(vibe, watchPool);

        // Jackets (optional)
        const jackets = pickJacketsFor(vibe, shirt, pants, jacketPool);
        const jacketOptions = [null, ...jackets]; // include "no jacket"

        // Undershirt (optional)
        const undershirt = maybeUndershirt({ shirt, jacket: jackets[0], vibe });
        const undershirtOptions = [null, undershirt].filter(Boolean);

        // Build candidate combos (Cartesian over small option sets)
        const watchOptions = watches.length ? watches : [null];
        for (const jacket of jacketOptions) {
          for (const watch of watchOptions) {
            // enforce style guard (shorts x jacket forbidden, etc.)
            const guard = violatesStyleGuard({ pants, shoes, jacket });
            if (guard) continue;

            // Undershirt is optional; if we have NO jacket and a very refined shirt+pants, often skip undershirt
            const undershirtSet = (!jacket && shirt.formalityScore >= 6 && pants.formalityScore >= 6)
              ? [null]
              : (undershirtOptions.length ? [null, ...undershirtOptions] : [null]);

            for (const us of undershirtSet) {
              const itemsList = [
                ...(jacket ? [jacket.id] : []),
                shirt.id,
                pants.id,
                shoes.id,
                belt?.id,
                ...(watch ? [watch.id] : []),
                ...(us ? [us.id] : []),
              ].filter(Boolean);

              const key = toKey(itemsList);
              if (existingCombos.has(key)) continue; // already in your list

              const score = comboScore({ shirt, pants, shoes, belt, watch, jacket });
              if (score < MIN_COMBO_SCORE) continue; // prune weak looks early

              newOutfits.push({
                items: itemsList,
                tuck: "Tucked",
                _score: score,
                _signature: { shirt: shirt.id, pants: pants.id, shoes: shoes.id, jacket: jacket?.id || null },
                _capsule: dominantCapsuleForOutfit(itemsList, byId)
              });
              existingCombos.add(key); // prevent duplicates inside this run
            }
          }
        }
      }
    }
  }

  // --- Helpers for selection ---
  function jaccard(a, b) {
    const A = new Set(a); const B = new Set(b);
    let inter = 0; for (const x of A) if (B.has(x)) inter++;
    return inter / new Set([...A, ...B]).size;
  }

  function silhouetteKey(of) {
    // crude shape grouping to avoid clones (tweak to your id conventions)
    const shirt = of._signature.shirt.split("-")[0];   // e.g., 'linen','blue','rl'
    const pants = of._signature.pants.split("-")[0];   // 'chinos','trousers','jeans','shorts','denim'
    const shoes = of._signature.shoes.split("-")[0];   // 'loafers','sneakers','apache'
    return `${shirt}_${pants}_${shoes}`;
  }

  function pantsColor(id) {
    const t = inferColorToken(id);
    return t || "neutral";
  }

  function shortsFlag(of) { return /shorts-/.test(of._signature.pants); }

  // Compute absolute targets from quota percentages
  function calcCapsuleTargets(total) {
    const raw = Object.fromEntries(CAPSULES.map(k => [k, Math.round(total * (CAPSULE_QUOTA[k] || 0))]));
    // fix rounding drift to hit TOTAL exactly
    const sum = CAPSULES.reduce((s, k) => s + raw[k], 0);
    let diff = total - sum;
    const order = [...CAPSULES].sort((a, b) => (CAPSULE_QUOTA[b] || 0) - (CAPSULE_QUOTA[a] || 0));
    let i = 0;
    while (diff !== 0) {
      const k = order[i % order.length];
      raw[k] += diff > 0 ? 1 : -1;
      diff += diff > 0 ? -1 : 1;
      i++;
    }
    return raw;
  }

  // --- Soft group caps (tune as desired) ---
  const capPerShirt = 4;
  const capPerPantsColor = 5;
  const capPerShorts = 4;
  const capPerSilhouette = 3;

  // --- Working state ---
  const pool = newOutfits.sort((a, b) => b._score - a._score); // start from best
  const selected = [];

  const ALPHA = 0.75; // quality weight
  const BETA = 0.25; // diversity weight

  const countByShirt = new Map();
  const countByPantsColor = new Map();
  const countBySilhouette = new Map();
  const countShorts = { n: 0 };

  const capsuleTargets = calcCapsuleTargets(TARGET_OUTFITS);
  const capsuleCount = Object.fromEntries(CAPSULES.map(k => [k, 0]));

  // Constraint gate
  function canTake(of, strictCapsule = true) {
    // group caps
    const shirtId = of._signature.shirt;
    const pColor = pantsColor(of._signature.pants);
    const isShorts = shortsFlag(of);
    const skey = silhouetteKey(of);

    if ((countByShirt.get(shirtId) || 0) >= capPerShirt) return false;
    if ((countByPantsColor.get(pColor) || 0) >= capPerPantsColor) return false;
    if (isShorts && countShorts.n >= capPerShorts) return false;
    if ((countBySilhouette.get(skey) || 0) >= capPerSilhouette) return false;

    // capsule quota (strict in pass 1, relaxed in pass 2)
    if (strictCapsule) {
      const cap = of._capsule;
      if (capsuleCount[cap] >= capsuleTargets[cap]) return false;
    }
    return true;
  }

  // Pick next outfit using MMR (quality vs novelty)
  function pickNext(strictCapsule) {
    let bestIdx = -1, bestVal = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i];
      if (!canTake(cand, strictCapsule)) continue;

      const maxSim = selected.length
        ? Math.max(...selected.map(s => jaccard(s.items, cand.items)))
        : 0;
      const diversity = 1 - maxSim;
      const val = ALPHA * cand._score + BETA * diversity;

      if (val > bestVal) { bestVal = val; bestIdx = i; }
    }
    if (bestIdx === -1) return null;
    return pool.splice(bestIdx, 1)[0];
  }

  // --- Pass 1: Fill by capsule quotas strictly ---
  while (selected.length < TARGET_OUTFITS) {
    const pick = pickNext(true);
    if (!pick) break; // cannot satisfy quotas exactly -> move to pass 2
    selected.push(pick);

    const shirtId = pick._signature.shirt;
    const pColor = pantsColor(pick._signature.pants);
    const isShorts = shortsFlag(pick);
    const skey = silhouetteKey(pick);

    countByShirt.set(shirtId, (countByShirt.get(shirtId) || 0) + 1);
    countByPantsColor.set(pColor, (countByPantsColor.get(pColor) || 0) + 1);
    if (isShorts) countShorts.n++;
    countBySilhouette.set(skey, (countBySilhouette.get(skey) || 0) + 1);
    capsuleCount[pick._capsule] += 1;
  }

  // --- Pass 2: Top-off remaining slots, relaxing capsule quotas ---
  while (selected.length < TARGET_OUTFITS) {
    const pick = pickNext(false);
    if (!pick) break; // nothing else satisfies remaining constraints
    selected.push(pick);

    const shirtId = pick._signature.shirt;
    const pColor = pantsColor(pick._signature.pants);
    const isShorts = shortsFlag(pick);
    const skey = silhouetteKey(pick);

    countByShirt.set(shirtId, (countByShirt.get(shirtId) || 0) + 1);
    countByPantsColor.set(pColor, (countByPantsColor.get(pColor) || 0) + 1);
    if (isShorts) countShorts.n++;
    countBySilhouette.set(skey, (countBySilhouette.get(skey) || 0) + 1);
    capsuleCount[pick._capsule] += 1;
  }

  // Replace the big pool with curated set
  newOutfits.length = 0;
  newOutfits.push(...selected);

  // Optional: console summary
  console.log("Capsule quota targets:", capsuleTargets);
  console.log("Capsule final counts:", capsuleCount);
  console.log("Selected outfits:", selected.length, "of target", TARGET_OUTFITS);

  // Append to outfits.json with incremental ids
  for (const no of newOutfits) {
    const newId = nextOutfitId(existingIds);
    existingIds.push(newId);
    outfitsDoc.outfits.push({ id: newId, items: no.items, tuck: no.tuck });
  }

  fs.writeFileSync(OUTFITS_PATH, JSON.stringify(outfitsDoc, null, 2), "utf8");

  // Summary
  const removedCount = originalOutfitCount - validOutfits.length;
  if (removedCount > 0) {
    console.log(`🧹 Cleaned up ${removedCount} invalid outfit(s).`);
  }
  console.log(`✅ Generated ${newOutfits.length} new outfit(s).`);
  console.log(`📝 Updated: ${OUTFITS_PATH}`);
}

// Call main function
main();