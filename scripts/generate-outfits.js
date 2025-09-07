#!/usr/bin/env node
/**
 * What to Wear — Outfit Generator (CLI-only)
 * ============================================
 * 
 * This script generates outfit combinations from a wardrobe dataset using intelligent
 * scoring algorithms that consider style compatibility, color coordination, and capsule
 * collection matching. It creates curated outfit suggestions while maintaining diversity
 * and avoiding style conflicts.
 * 
 * ALGORITHM OVERVIEW:
 * 1. Load wardrobe data and validate existing outfits
 * 2. Generate all possible combinations (shirts × pants × shoes × accessories)
 * 3. Score each combination using formality, color, and capsule compatibility
 * 4. Apply style guard rules to prevent bad pairings (e.g., shorts + boots)
 * 5. Use MMR (Maximal Marginal Relevance) to select diverse, high-quality outfits
 * 6. Maintain capsule quotas and diversity constraints
 * 7. Save curated selection to outfits.json
 * 
 * Usage: node generate_outfits.js [wardrobe.json] [outfits.json]
 * Defaults: ./src/data/wardrobe.json and ./src/data/outfits.json
 *
 * Security: Throws if executed in a browser context for CLI-only operation.
 */

// =============================================================================
// SECURITY CHECK - Prevent browser execution
// =============================================================================
(() => {
  if (typeof window !== "undefined" || typeof document !== "undefined") {
    throw new Error("This script is CLI-only. Do not load it in a browser.");
  }
})();

import fs from "fs";
import path from "path";

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

// File paths - can be overridden via command line arguments
const WARDROBE_PATH = process.argv[2] || path.resolve("./src/data/wardrobe.json");
const OUTFITS_PATH = process.argv[3] || path.resolve("./src/data/outfits.json");

// Generation limits - these control how many combinations we explore
// Lower values = faster generation but fewer options
const MAX_PANTS_PER_SHIRT = 3;    // How many pants to try with each shirt
const MAX_SHOES_PER_PANT = 2;     // How many shoes to try with each pant
const MAX_JACKETS_PER_SET = 1;    // Max jackets per outfit combination
const MAX_WATCHES = 1;            // Max watches to consider per outfit

// Output targets and quality thresholds
const TARGET_OUTFITS = parseInt(process.env.TARGET_OUTFITS || "250", 10);
const MIN_COMBO_SCORE = 1.2; // Minimum score to include an outfit (higher = more selective)

// Capsule collection distribution - these percentages should sum to ~1.0
// This ensures we get a balanced mix of different style categories
const CAPSULE_QUOTA = {
  Refined: parseFloat(process.env.QUOTA_REFINED || "0.40"),      // 40% formal/business
  Crossover: parseFloat(process.env.QUOTA_CROSSOVER || "0.35"),  // 35% versatile pieces
  Adventurer: parseFloat(process.env.QUOTA_ADVENTURER || "0.25"), // 25% casual/outdoor
};

// Clothing categories - must match the categories in wardrobe.json
const CATS = {
  JACKET: "Jacket/Overshirt",
  SHIRT: "Shirt",
  UNDERSHIRT: "Undershirt",
  PANTS: "Pants",
  SHOES: "Shoes",
  BELT: "Belt",
  WATCH: "Watch",
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a Map for fast item lookups by ID
 * @param {Array} arr - Array of items with 'id' property
 * @returns {Map} Map where key=id, value=item
 */
function indexById(arr) {
  const map = new Map();
  (arr || []).forEach((item) => map.set(item.id, item));
  return map;
}

/**
 * Calculates harmony bonus based on how many conditions are true
 * Each true condition adds 0.25 to the score
 * @param {...boolean} conditions - Boolean conditions to check
 * @returns {number} Bonus score (0.25 per true condition)
 */
function harmonyBonus(...conditions) { 
  return conditions.filter(Boolean).length * 0.25; 
}

/**
 * Wrapper for capsule scoring between two items
 * @param {Array} a - First item's capsule tags
 * @param {Array} b - Second item's capsule tags  
 * @returns {number} Compatibility score
 */
function pairCapsule(a = [], b = []) {
  return capsuleScore(a, b);
}

// =============================================================================
// OUTFIT SCORING ALGORITHM
// =============================================================================

/**
 * Calculates the overall compatibility score for an outfit combination
 * Higher scores indicate better style coordination and compatibility
 * 
 * The algorithm considers:
 * - Formality matching (penalty for mismatched formality levels)
 * - Color coordination (bonus for harmonious color combinations)
 * - Capsule compatibility (bonus for items from same style collections)
 * 
 * @param {Object} outfit - Object containing shirt, pants, shoes, belt, watch, jacket
 * @returns {number} Overall outfit score (higher is better)
 */
function comboScore({ shirt, pants, shoes, belt, watch, jacket }) {
  // Calculate average formality level for the core outfit pieces
  const formAvg = (shirt.formalityScore + pants.formalityScore + (shoes?.formalityScore ?? 5)) / 3;
  
  // FORMALITY PENALTY: Penalize mismatched formality levels
  // The more formal mismatch, the higher the penalty
  const fPenalty =
    0.15 * formalityDistance(shirt.formalityScore, pants.formalityScore) +      // Shirt-pants mismatch
    0.10 * formalityDistance(formAvg, shoes?.formalityScore ?? 5) +             // Average-shoes mismatch
    (jacket ? 0.10 * formalityDistance(formAvg, jacket.formalityScore) : 0);    // Average-jacket mismatch

  // Extract color tokens for coordination analysis
  const cTop = inferColorToken(shirt.id, shirt.name);
  const cPant = inferColorToken(pants.id, pants.name);
  const cShoe = inferColorToken(shoes.id, shoes.name);
  const cJkt = jacket ? inferColorToken(jacket.id, jacket.name) : null;

  // COLOR HARMONY BONUS: Reward good color combinations
  const cBonus = harmonyBonus(
    colorsPlayNice(cTop, cPant),           // Shirt-pants color harmony
    colorsPlayNice(cPant, cShoe),          // Pants-shoes color harmony
    jacket && colorsPlayNice(cPant, cJkt)  // Pants-jacket color harmony (if jacket exists)
  );

  // CAPSULE COMPATIBILITY BONUS: Reward items from compatible style collections
  // Higher weights for more important pairings
  const capBonus =
    0.6 * pairCapsule(shirt.capsuleTags, pants.capsuleTags) +                                           // Core pairing
    0.4 * pairCapsule(pants.capsuleTags, shoes.capsuleTags) +                                          // Foundation pairing
    (jacket ? 0.3 * pairCapsule(shirt.capsuleTags, jacket.capsuleTags) : 0) +                         // Layering compatibility
    (watch ? 0.2 * pairCapsule(watch.capsuleTags, [...(jacket?.capsuleTags || []), ...shirt.capsuleTags]) : 0) + // Accessory matching
    (belt ? 0.1 * pairCapsule(belt.capsuleTags, shoes.capsuleTags) : 0);                              // Belt-shoe coordination

  // Final score: Add bonuses and subtract penalties
  return +(cBonus + capBonus - fPenalty).toFixed(3);
}

// =============================================================================
// CAPSULE COLLECTION ANALYSIS
// =============================================================================

// Main capsule collections (excluding seasonal tags like "Shorts")
const CAPSULES = ["Refined", "Crossover", "Adventurer"];

/**
 * Counts how many times each capsule appears in an item's tags
 * @param {Object} item - Wardrobe item with capsuleTags array
 * @returns {Object} Count object with Refined, Crossover, Adventurer counts
 */
function countCapsulesForItem(item) {
  const counts = { Refined: 0, Crossover: 0, Adventurer: 0 };
  (item?.capsuleTags || []).forEach(tag => {
    if (CAPSULES.includes(tag)) counts[tag]++;
  });
  return counts;
}

/**
 * Sums capsule counts across multiple items in an outfit
 * @param {Array} items - Array of item IDs
 * @param {Map} byIdMap - Map for looking up items by ID
 * @returns {Object} Total counts for each capsule across all items
 */
function sumCapsuleCounts(items, byIdMap) {
  const total = { Refined: 0, Crossover: 0, Adventurer: 0 };
  for (const id of items) {
    const item = byIdMap.get(id);
    if (!item) continue;
    const counts = countCapsulesForItem(item);
    for (const capsule of CAPSULES) {
      total[capsule] += counts[capsule];
    }
  }
  return total;
}

/**
 * Determines the dominant capsule style for an outfit
 * Used for categorizing outfits and maintaining quota balance
 * @param {Array} items - Array of item IDs in the outfit
 * @param {Map} byIdMap - Map for looking up items by ID
 * @returns {string} Dominant capsule name ("Refined", "Crossover", or "Adventurer")
 */
function dominantCapsuleForOutfit(items, byIdMap) {
  const totals = sumCapsuleCounts(items, byIdMap);
  
  // Tie-breaker preference: Refined > Crossover > Adventurer
  // This ensures consistent categorization when counts are equal
  let best = "Refined";
  let bestValue = totals["Refined"];
  
  for (const capsule of ["Crossover", "Adventurer"]) {
    if (totals[capsule] > bestValue) {
      best = capsule;
      bestValue = totals[capsule];
    }
  }
  return best;
}

// =============================================================================
// COLOR COORDINATION SYSTEM
// =============================================================================

/**
 * Extracts a color token from item ID and name for coordination analysis
 * Searches for color keywords in a prioritized order
 * @param {string} id - Item ID (e.g., "shirt-navy-oxford")
 * @param {string} name - Item display name
 * @returns {string} Standardized color token or "neutral" if no match
 */
function inferColorToken(id = "", name = "") {
  const source = `${id} ${name}`.toLowerCase();
  
  // Color palette in priority order (more specific colors first)
  const palette = [
    "white", "black", "navy", "blue", "light grey", "light-gray", "lightgrey", "grey", "gray",
    "khaki", "olive", "charcoal", "tan", "brown", "dark brown", "cream", "beige", "deep navy"
  ];
  
  // Search for exact color matches
  for (const token of palette) {
    const normalizedToken = token.replace(" ", "-");
    if (source.includes(normalizedToken) || source.includes(token)) {
      return normalizedToken;
    }
  }
  
  // Special case mappings for common terms
  if (/denim|jeans/.test(source)) return "navy";
  if (/charcoal/.test(source)) return "charcoal";
  
  // Default fallback
  return "neutral";
}

// Color groups for coordination rules
const COLOR_GROUPS = {
  neutral: new Set([
    "white", "black", "grey", "gray", "light-grey", "charcoal", 
    "tan", "beige", "cream", "brown", "dark-brown", "neutral"
  ]),
  blue_like: new Set(["navy", "deep-navy", "blue"]),
  earth: new Set(["khaki", "olive", "brown", "dark-brown", "tan", "beige", "cream"]),
};

/**
 * Determines if two colors coordinate well together
 * Uses simple but effective rules for menswear color coordination
 * @param {string} topColor - Color of the upper garment
 * @param {string} bottomColor - Color of the lower garment
 * @returns {boolean} True if colors coordinate well
 */
function colorsPlayNice(topColor, bottomColor) {
  const isNeutral = (color) => COLOR_GROUPS.neutral.has(color);
  
  // Rule 1: Neutrals go with everything
  if (isNeutral(topColor) || isNeutral(bottomColor)) return true;

  // Rule 2: Blue and earth tones are a classic combination
  const isBlue = COLOR_GROUPS.blue_like.has(topColor) || COLOR_GROUPS.blue_like.has(bottomColor);
  const isEarth = COLOR_GROUPS.earth.has(topColor) || COLOR_GROUPS.earth.has(bottomColor);
  if (isBlue && isEarth) return true;

  // Rule 3: Same color family works (different textures/shades)
  if (topColor === bottomColor) return true;

  // Rule 4: Default to allowing combinations (conservative approach)
  return true;
}

// =============================================================================
// COMPATIBILITY SCORING FUNCTIONS
// =============================================================================

/**
 * Calculates compatibility score based on shared capsule tags
 * @param {Array} aTags - First item's capsule tags
 * @param {Array} bTags - Second item's capsule tags
 * @returns {number} Number of shared tags (0 to n)
 */
function capsuleScore(aTags = [], bTags = []) {
  const setA = new Set(aTags);
  const setB = new Set(bTags);
  let sharedTags = 0;
  
  for (const tag of setA) {
    if (setB.has(tag)) sharedTags += 1;
  }
  
  return sharedTags;
}

/**
 * Calculates the distance between two formality scores
 * @param {number} a - First formality score (1-10 scale)
 * @param {number} b - Second formality score (1-10 scale)
 * @returns {number} Absolute difference (lower is better for matching)
 */
function formalityDistance(a = 5, b = 5) {
  return Math.abs((a ?? 5) - (b ?? 5));
}

// “Bad pairings” you wanted to avoid
function violatesStyleGuard(choice) {
  const { pants, shoes, jacket } = choice;

  // Identify item types for rule checking
  const isShorts = /shorts/.test(pants?.id || "") || /Shorts/.test(pants?.capsuleTags?.join(" ") || "");
  const isBoots = /boot/.test(shoes?.id || "");
  const isJacketOrShacket =
    (jacket && jacket.category === CATS.JACKET) ||
    /(shacket|jacket|coat|cardigan|crewneck|shawl)/i.test(jacket?.id || "");

  // RULE 1: No formal layering with shorts (too casual/formal mismatch)
  if (isShorts && isJacketOrShacket) {
    return "Shorts cannot be paired with jackets/shackets/sweaters.";
  }

  // RULE 2: No boots with shorts (seasonal/style mismatch)
  if (isShorts && isBoots) {
    return "Shorts cannot be paired with boots.";
  }

  // Add additional style rules here as needed
  // Examples:
  // - No athletic shoes with formal pants
  // - No tank tops with dress pants
  // - No flip-flops with long pants

  return null; // No violations found
}

// =============================================================================
// ITEM SELECTION HELPERS
// =============================================================================

// Global wardrobe items array (populated in main function)
let W_ITEMS = [];

/**
 * Finds the first available item from a prioritized list of IDs
 * @param {Array} ids - Array of item IDs in priority order
 * @returns {Object|null} First found item or null if none exist
 */
function pickById(ids) {
  for (const id of ids) {
    const found = W_ITEMS.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}

/**
 * Determines if an undershirt should be added to an outfit
 * Undershirts are typically used for layering in casual or layered looks
 * @param {Object} params - Object containing shirt, jacket, and vibe
 * @returns {Object|null} Selected undershirt item or null
 */
function maybeUndershirt({ shirt, jacket, vibe }) {
  // Only add undershirts for casual looks or when wearing a jacket
  if (!vibe.has("casual") && !jacket) return null;

  // Color selection strategy:
  // - Refined looks: prefer white/cream for clean appearance
  // - Other looks: white/grey for versatility
  if (vibe.has("refined")) {
    return pickById(["tee-white", "tee-cream", "tee-grey"]);
  }
  return pickById(["tee-white", "tee-grey", "tee-cream"]);
}

/**
 * Selects an appropriate belt based on shoes and outfit vibe
 * Follows classic menswear rule: belt should coordinate with shoes
 * @param {Object} shoes - Shoes item object
 * @param {Set} vibe - Set of style descriptors for the outfit
 * @returns {Object|null} Selected belt item
 */
function pickBeltFor(shoes, vibe) {
  const shoeId = (shoes?.id || "").toLowerCase();
  const isBlack = shoeId.includes("black");
  const isDressy = (shoes?.formalityScore ?? 5) >= 7;

  // RULE 1: Black shoes = black belt (classic coordination)
  if (isBlack) {
    return pickById(["belt-black-pebbled", "belt-reversible"]);
  }

  // RULE 2: Dressy brown shoes = brown dress belt
  if (isDressy) {
    return pickById(["belt-reversible", "belt-clean-brown"]);
  }

  // RULE 3: Casual/outdoor looks = rugged belts
  if (vibe.has("adventurer")) {
    return pickById(["belt-rugged", "belt-reversible"]);
  }
  
  // DEFAULT: Versatile brown belts for general use
  return pickById(["belt-braided", "belt-clean-brown"]);
}

/**
 * Selects appropriate watches based on outfit vibe and formality
 * Ranks watches by capsule compatibility and formality matching
 * @param {Set} vibeSet - Set of style descriptors for the outfit
 * @param {Array} pool - Available watch items
 * @returns {Array} Ranked array of suitable watches (limited by MAX_WATCHES)
 */
function pickWatchesFor(vibeSet, pool) {
  // Determine target formality based on outfit vibe
  const targetFormality = vibeSet.has("refined") ? 7 :      // Dress watches for formal looks
                         vibeSet.has("adventurer") ? 5 :    // Sport watches for casual looks  
                         6;                                 // Versatile watches for crossover

  const ranked = pool
    .map((watch) => ({
      w: watch,
      // Score based on how many capsule tags match the outfit vibe
      score: capsuleScore(watch.capsuleTags, Array.from(vibeSet)),
      // Distance from target formality (closer is better)
      fdist: formalityDistance(watch.formalityScore, targetFormality),
    }))
    // Sort by capsule score (descending), then formality distance (ascending)
    .sort((a, b) => (b.score - a.score) || (a.fdist - b.fdist))
    .slice(0, MAX_WATCHES)
    .map((item) => item.w);
    
  return ranked;
}

/**
 * Selects appropriate jackets for layering
 * Excludes jackets when wearing shorts (style rule)
 * @param {Set} vibeSet - Set of style descriptors for the outfit
 * @param {Object} shirt - Shirt item object
 * @param {Object} pants - Pants item object  
 * @param {Array} jackets - Available jacket items
 * @returns {Array} Ranked array of suitable jackets
 */
function pickJacketsFor(vibeSet, shirt, pants, jackets) {
  // No jackets with shorts (enforced by style guard)
  const isShorts = /shorts/.test(pants?.id || "");
  if (isShorts) return [];

  const avgFormality = Math.round((shirt.formalityScore + pants.formalityScore) / 2);

  const ranked = jackets
    .map((jacket) => ({
      j: jacket,
      // Score based on capsule compatibility + color coordination bonus
      score: capsuleScore(jacket.capsuleTags, Array.from(vibeSet)) +
        (colorsPlayNice(
          inferColorToken(jacket.id, jacket.name), 
          inferColorToken(pants.id, pants.name)
        ) ? 0.2 : 0),
      // Formality distance from the shirt+pants average
      fdist: formalityDistance(jacket.formalityScore, avgFormality),
    }))
    // Sort by score (descending), then formality distance (ascending)
    .sort((a, b) => (b.score - a.score) || (a.fdist - b.fdist))
    .slice(0, MAX_JACKETS_PER_SET)
    .map((item) => item.j);

  return ranked;
}

/**
 * Builds a vibe set from capsule tags for outfit coordination
 * Converts capsule tags into a standardized set of style descriptors
 * @param {Array} tags - Array of capsule tags from an item
 * @returns {Set} Set of normalized vibe descriptors
 */
function vibeFromTags(tags = []) {
  const vibeSet = new Set();
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  
  // Map capsule tags to vibe descriptors
  if (normalizedTags.includes("refined")) vibeSet.add("refined");
  if (normalizedTags.includes("crossover")) vibeSet.add("crossover");
  if (normalizedTags.includes("adventurer")) vibeSet.add("adventurer");
  if (normalizedTags.includes("shorts")) vibeSet.add("shorts");
  
  // Derived vibes: add "casual" for adventurer or shorts items
  if (vibeSet.has("adventurer") || vibeSet.has("shorts")) {
    vibeSet.add("casual");
  }
  
  return vibeSet;
}

// =============================================================================
// OUTFIT MANAGEMENT UTILITIES
// =============================================================================

/**
 * Creates a unique key from an array of item IDs for deduplication
 * @param {Array} itemsArray - Array of item IDs
 * @returns {string} Sorted, pipe-separated string of unique IDs
 */
function toKey(itemsArray) {
  return [...new Set(itemsArray)].sort().join("|");
}

/**
 * Generates the next sequential outfit ID
 * @param {Array} existingIds - Array of existing outfit IDs (e.g., ["o-001", "o-002"])
 * @returns {string} Next ID in sequence (e.g., "o-003")
 */
function nextOutfitId(existingIds) {
  // Extract numeric parts from existing IDs and find the maximum
  const maxNumber = existingIds.reduce((max, id) => {
    const numericPart = parseInt((id.match(/\d+/) || [0])[0], 10) || 0;
    return Math.max(max, numericPart);
  }, 0);
  
  // Return next ID with zero-padded 3-digit number
  return `o-${String(maxNumber + 1).padStart(3, "0")}`;
}

/**
 * Validates that all items in an outfit exist in the current wardrobe
 * Used to clean up outfits that reference deleted/renamed items
 * @param {Object} outfit - Outfit object with items array
 * @param {Set} validItemIds - Set of valid item IDs from current wardrobe
 * @returns {Object} Validation result with isValid flag and invalidItems array
 */
function validateOutfit(outfit, validItemIds) {
  const invalidItems = (outfit.items || []).filter(itemId => !validItemIds.has(itemId));
  return {
    isValid: invalidItems.length === 0,
    invalidItems
  };
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

function main() {
  // -------------------------------------------------------------------------
  // STEP 1: Load and prepare data
  // -------------------------------------------------------------------------
  
  console.log("🔄 Loading wardrobe and outfit data...");
  const wardrobe = JSON.parse(fs.readFileSync(WARDROBE_PATH, "utf8"));
  const outfitsDoc = JSON.parse(fs.readFileSync(OUTFITS_PATH, "utf8"));

  const items = wardrobe.items || [];
  W_ITEMS = items; // Set global reference for helper functions

  const byId = indexById(items);
  const validItemIds = new Set(items.map(item => item.id));

  // -------------------------------------------------------------------------
  // STEP 2: Organize items by category for efficient filtering
  // -------------------------------------------------------------------------
  
  const shirts = items.filter((item) => item.category === CATS.SHIRT);
  const pantsPool = items.filter((item) => item.category === CATS.PANTS);
  const shoesPool = items.filter((item) => item.category === CATS.SHOES);
  const beltsPool = items.filter((item) => item.category === CATS.BELT);
  const watchPool = items.filter((item) => item.category === CATS.WATCH);
  const jacketPool = items.filter((item) => item.category === CATS.JACKET);
  
  console.log(`📊 Wardrobe inventory: ${shirts.length} shirts, ${pantsPool.length} pants, ${shoesPool.length} shoes, ${jacketPool.length} jackets`);

  // -------------------------------------------------------------------------
  // STEP 3: Validate and clean existing outfits
  // -------------------------------------------------------------------------
  
  console.log("🧹 Validating existing outfits...");
  const originalOutfitCount = (outfitsDoc.outfits || []).length;
  const validOutfits = [];
  const invalidOutfits = [];

  // Check each existing outfit for items that no longer exist in wardrobe
  for (const outfit of outfitsDoc.outfits || []) {
    const validation = validateOutfit(outfit, validItemIds);
    if (validation.isValid) {
      validOutfits.push(outfit);
    } else {
      invalidOutfits.push({ outfit, invalidItems: validation.invalidItems });
    }
  }

  // Update outfits collection with only valid ones
  outfitsDoc.outfits = validOutfits;

  // Report any removed outfits
  if (invalidOutfits.length > 0) {
    console.log(`🧹 Removed ${invalidOutfits.length} outfit(s) with invalid items:`);
    invalidOutfits.forEach(({ outfit, invalidItems }) => {
      console.log(`   - Outfit ${outfit.id}: missing items [${invalidItems.join(', ')}]`);
    });
  }

  // -------------------------------------------------------------------------
  // STEP 4: Index existing outfits to prevent duplicates
  // -------------------------------------------------------------------------
  
  const existingCombos = new Set();
  const existingIds = [];
  
  for (const outfit of validOutfits) {
    existingIds.push(outfit.id);
    const key = toKey(outfit.items || []);
    existingCombos.add(key);
  }

  console.log(`📋 Found ${validOutfits.length} existing valid outfits`);
  
  // -------------------------------------------------------------------------
  // STEP 5: Generate new outfit combinations
  // -------------------------------------------------------------------------
  
  console.log("🎯 Generating new outfit combinations...");
  const newOutfits = [];

  // GENERATION STRATEGY: Start with shirts as the foundation
  // For each shirt, find compatible pants, then shoes, then accessories
  // This ensures we explore combinations systematically
  
  for (const shirt of shirts) {
    const shirtColor = inferColorToken(shirt.id, shirt.name);
    const shirtVibe = vibeFromTags(shirt.capsuleTags);

    // Find best pants for this shirt based on:
    // 1. Capsule compatibility (same style collections)
    // 2. Color coordination 
    // 3. Formality matching
    const rankedPants = pantsPool
      .map((pants) => ({
        p: pants,
        score:
          capsuleScore(shirt.capsuleTags, pants.capsuleTags) +
          (colorsPlayNice(shirtColor, inferColorToken(pants.id, pants.name)) ? 0.25 : 0),
        fdist: formalityDistance(shirt.formalityScore, pants.formalityScore),
      }))
      .sort((a, b) => (b.score - a.score) || (a.fdist - b.fdist))
      .slice(0, MAX_PANTS_PER_SHIRT)
      .map((item) => item.p);

    // For each compatible pants option, find shoes and accessories
    for (const pants of rankedPants) {
      const pantsIsShorts = /shorts/.test(pants.id);

      // Find compatible shoes with style-based filtering:
      // - No boots with shorts (style rule)
      // - Prioritize shoes that match both shirt and pants capsules
      const shoesRanked = shoesPool
        .filter((shoes) => !(pantsIsShorts && /boot/.test(shoes.id)))
        .map((shoes) => ({
          s: shoes,
          score:
            capsuleScore(pants.capsuleTags, shoes.capsuleTags) +
            capsuleScore(shirt.capsuleTags, shoes.capsuleTags),
          fdist: formalityDistance(
            Math.round((shirt.formalityScore + pants.formalityScore) / 2), 
            shoes.formalityScore
          ),
        }))
        .sort((a, b) => (b.score - a.score) || (a.fdist - b.fdist))
        .slice(0, MAX_SHOES_PER_PANT)
        .map((item) => item.s);

      // For each compatible shoe, build complete outfits with accessories
      for (const shoes of shoesRanked) {
        // Combine vibes from all core pieces to guide accessory selection
        const vibe = new Set([
          ...shirtVibe, 
          ...vibeFromTags(pants.capsuleTags), 
          ...vibeFromTags(shoes.capsuleTags)
        ]);

        // Select coordinating accessories based on the combined vibe
        const belt = pickBeltFor(shoes, vibe) || beltsPool[0]; // Fallback to first belt
        const watches = pickWatchesFor(vibe, watchPool);
        
        // Optional layering pieces
        const jackets = pickJacketsFor(vibe, shirt, pants, jacketPool);
        const jacketOptions = [null, ...jackets]; // Include "no jacket" option
        
        const undershirt = maybeUndershirt({ shirt, jacket: jackets[0], vibe });
        const undershirtOptions = [null, undershirt].filter(Boolean);

        // Generate all possible combinations (Cartesian product)
        // This explores jacket × watch × undershirt combinations systematically
        const watchOptions = watches.length ? watches : [null];
        
        for (const jacket of jacketOptions) {
          for (const watch of watchOptions) {
            // Apply style guard rules to prevent bad combinations
            const styleViolation = violatesStyleGuard({ pants, shoes, jacket });
            if (styleViolation) continue;

            // Determine undershirt options based on formality and layering
            // Skip undershirts for very formal looks without jackets
            const undershirtSet = (!jacket && shirt.formalityScore >= 6 && pants.formalityScore >= 6)
              ? [null] // No undershirt for formal looks
              : (undershirtOptions.length ? [null, ...undershirtOptions] : [null]);

            for (const undershirt of undershirtSet) {
              // Build the complete item list for this combination
              const itemsList = [
                ...(jacket ? [jacket.id] : []),
                shirt.id,
                pants.id,
                shoes.id,
                belt?.id,
                ...(watch ? [watch.id] : []),
                ...(undershirt ? [undershirt.id] : []),
              ].filter(Boolean);

              // Skip if this exact combination already exists
              const key = toKey(itemsList);
              if (existingCombos.has(key)) continue;

              // Calculate outfit quality score
              const score = comboScore({ shirt, pants, shoes, belt, watch, jacket });
              if (score < MIN_COMBO_SCORE) continue; // Skip low-quality combinations

              // Add to candidate pool with metadata for selection algorithm
              newOutfits.push({
                items: itemsList,
                tuck: "Tucked", // Default tuck preference
                _score: score,
                _signature: { 
                  shirt: shirt.id, 
                  pants: pants.id, 
                  shoes: shoes.id, 
                  jacket: jacket?.id || null 
                },
                _capsule: dominantCapsuleForOutfit(itemsList, byId)
              });
              
              existingCombos.add(key); // Prevent duplicates within this generation run
            }
          }
        }
      }
    }
  }

  console.log(`🎲 Generated ${newOutfits.length} candidate combinations`);
  
  // -------------------------------------------------------------------------
  // STEP 6: Curated selection using diversity algorithm
  // -------------------------------------------------------------------------
  
  console.log("🎯 Selecting diverse, high-quality outfits...");
  
  // DIVERSITY METRICS: These functions help ensure variety in the final selection
  
  /**
   * Calculates Jaccard similarity between two item sets (0 = no overlap, 1 = identical)
   * Used to measure how similar two outfits are
   */
  function jaccard(setA, setB) {
    const A = new Set(setA); 
    const B = new Set(setB);
    let intersection = 0;
    for (const item of A) {
      if (B.has(item)) intersection++;
    }
    return intersection / new Set([...A, ...B]).size;
  }

  /**
   * Creates a silhouette key for grouping similar outfit shapes
   * Prevents too many outfits with the same basic structure
   */
  function silhouetteKey(outfit) {
    const shirt = outfit._signature.shirt.split("-")[0];   // e.g., 'linen', 'oxford'
    const pants = outfit._signature.pants.split("-")[0];   // e.g., 'chinos', 'jeans'
    const shoes = outfit._signature.shoes.split("-")[0];   // e.g., 'loafers', 'sneakers'
    return `${shirt}_${pants}_${shoes}`;
  }

  /**
   * Extracts pants color for diversity tracking
   */
  function pantsColor(id) {
    return inferColorToken(id) || "neutral";
  }

  /**
   * Checks if an outfit uses shorts
   */
  function shortsFlag(outfit) { 
    return /shorts-/.test(outfit._signature.pants); 
  }

  /**
   * Calculates exact capsule targets from percentage quotas
   * Handles rounding to ensure targets sum to the total exactly
   */
  function calcCapsuleTargets(total) {
    // Calculate raw targets from percentages
    const raw = Object.fromEntries(
      CAPSULES.map(capsule => [capsule, Math.round(total * (CAPSULE_QUOTA[capsule] || 0))])
    );
    
    // Fix rounding drift to hit TARGET_OUTFITS exactly
    const sum = CAPSULES.reduce((total, capsule) => total + raw[capsule], 0);
    let difference = total - sum;
    
    // Distribute the difference starting with highest quota capsules
    const priorityOrder = [...CAPSULES].sort((a, b) => 
      (CAPSULE_QUOTA[b] || 0) - (CAPSULE_QUOTA[a] || 0)
    );
    
    let index = 0;
    while (difference !== 0) {
      const capsule = priorityOrder[index % priorityOrder.length];
      raw[capsule] += difference > 0 ? 1 : -1;
      difference += difference > 0 ? -1 : 1;
      index++;
    }
    
    return raw;
  }

  // DIVERSITY CONSTRAINTS: Prevent over-representation of similar outfits
  const capPerShirt = 4;          // Max outfits per shirt (prevents shirt dominance)
  const capPerPantsColor = 5;     // Max outfits per pants color (color variety)
  const capPerShorts = 4;         // Max shorts outfits (seasonal balance)
  const capPerSilhouette = 3;     // Max per silhouette type (shape variety)

  // SELECTION ALGORITHM SETUP
  const pool = newOutfits.sort((a, b) => b._score - a._score); // Start with highest quality
  const selected = [];

  // MMR (Maximal Marginal Relevance) weights for quality vs diversity trade-off
  const ALPHA = 0.75; // Quality weight (higher = prioritize better outfits)
  const BETA = 0.25;  // Diversity weight (higher = prioritize unique outfits)

  // Tracking counters for diversity constraints
  const countByShirt = new Map();
  const countByPantsColor = new Map();
  const countBySilhouette = new Map();
  const countShorts = { n: 0 };

  // Capsule distribution targets and tracking
  const capsuleTargets = calcCapsuleTargets(TARGET_OUTFITS);
  const capsuleCount = Object.fromEntries(CAPSULES.map(capsule => [capsule, 0]));

  /**
   * Checks if an outfit can be selected based on diversity constraints
   * @param {Object} outfit - Outfit candidate
   * @param {boolean} strictCapsule - Whether to enforce capsule quotas strictly
   * @returns {boolean} True if outfit can be selected
   */
  function canTake(outfit, strictCapsule = true) {
    const shirtId = outfit._signature.shirt;
    const pColor = pantsColor(outfit._signature.pants);
    const isShorts = shortsFlag(outfit);
    const silhouette = silhouetteKey(outfit);

    // Check diversity constraints
    if ((countByShirt.get(shirtId) || 0) >= capPerShirt) return false;
    if ((countByPantsColor.get(pColor) || 0) >= capPerPantsColor) return false;
    if (isShorts && countShorts.n >= capPerShorts) return false;
    if ((countBySilhouette.get(silhouette) || 0) >= capPerSilhouette) return false;

    // Check capsule quota (strict in first pass, relaxed in second pass)
    if (strictCapsule) {
      const capsule = outfit._capsule;
      if (capsuleCount[capsule] >= capsuleTargets[capsule]) return false;
    }
    
    return true;
  }

  /**
   * Selects the next best outfit using Maximal Marginal Relevance (MMR)
   * Balances outfit quality with diversity from already selected outfits
   * @param {boolean} strictCapsule - Whether to enforce capsule quotas
   * @returns {Object|null} Selected outfit or null if none available
   */
  function pickNext(strictCapsule) {
    let bestIndex = -1;
    let bestValue = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      if (!canTake(candidate, strictCapsule)) continue;

      // Calculate diversity: how different is this from already selected outfits?
      const maxSimilarity = selected.length
        ? Math.max(...selected.map(selected => jaccard(selected.items, candidate.items)))
        : 0;
      const diversity = 1 - maxSimilarity;
      
      // MMR score: weighted combination of quality and diversity
      const mmrValue = ALPHA * candidate._score + BETA * diversity;

      if (mmrValue > bestValue) { 
        bestValue = mmrValue; 
        bestIndex = i; 
      }
    }
    
    // Remove and return the selected outfit (or null if none found)
    if (bestIndex === -1) return null;
    return pool.splice(bestIndex, 1)[0];
  }

  // TWO-PASS SELECTION STRATEGY:
  // Pass 1: Strict capsule quotas to ensure balanced distribution
  // Pass 2: Relaxed quotas to fill remaining slots with best available
  
  console.log("📊 Pass 1: Selecting outfits with strict capsule quotas...");
  while (selected.length < TARGET_OUTFITS) {
    const pick = pickNext(true); // Strict capsule enforcement
    if (!pick) break; // Cannot satisfy quotas exactly, move to pass 2
    
    selected.push(pick);

    // Update diversity tracking counters
    const shirtId = pick._signature.shirt;
    const pColor = pantsColor(pick._signature.pants);
    const isShorts = shortsFlag(pick);
    const silhouette = silhouetteKey(pick);

    countByShirt.set(shirtId, (countByShirt.get(shirtId) || 0) + 1);
    countByPantsColor.set(pColor, (countByPantsColor.get(pColor) || 0) + 1);
    if (isShorts) countShorts.n++;
    countBySilhouette.set(silhouette, (countBySilhouette.get(silhouette) || 0) + 1);
    capsuleCount[pick._capsule] += 1;
  }

  console.log(`📊 Pass 1 complete: ${selected.length} outfits selected`);
  console.log("📊 Pass 2: Filling remaining slots with relaxed quotas...");
  
  while (selected.length < TARGET_OUTFITS) {
    const pick = pickNext(false); // Relaxed capsule enforcement
    if (!pick) break; // No more outfits satisfy remaining constraints
    
    selected.push(pick);

    // Update diversity tracking counters
    const shirtId = pick._signature.shirt;
    const pColor = pantsColor(pick._signature.pants);
    const isShorts = shortsFlag(pick);
    const silhouette = silhouetteKey(pick);

    countByShirt.set(shirtId, (countByShirt.get(shirtId) || 0) + 1);
    countByPantsColor.set(pColor, (countByPantsColor.get(pColor) || 0) + 1);
    if (isShorts) countShorts.n++;
    countBySilhouette.set(silhouette, (countBySilhouette.get(silhouette) || 0) + 1);
    capsuleCount[pick._capsule] += 1;
  }

  // -------------------------------------------------------------------------
  // STEP 7: Finalize and save results
  // -------------------------------------------------------------------------
  
  // Replace candidate pool with final curated selection
  newOutfits.length = 0;
  newOutfits.push(...selected);

  console.log("📊 Selection complete!");
  console.log("📊 Capsule distribution:");
  console.log("   Targets:", capsuleTargets);
  console.log("   Actual: ", capsuleCount);
  console.log(`📊 Final selection: ${selected.length} of ${TARGET_OUTFITS} target outfits`);

  // Add selected outfits to the outfits document with sequential IDs
  for (const outfit of newOutfits) {
    const newId = nextOutfitId(existingIds);
    existingIds.push(newId);
    outfitsDoc.outfits.push({ 
      id: newId, 
      items: outfit.items, 
      tuck: outfit.tuck 
    });
  }

  // Write updated outfits back to file
  fs.writeFileSync(OUTFITS_PATH, JSON.stringify(outfitsDoc, null, 2), "utf8");

  // -------------------------------------------------------------------------
  // STEP 8: Report results
  // -------------------------------------------------------------------------
  
  const removedCount = originalOutfitCount - validOutfits.length;
  if (removedCount > 0) {
    console.log(`🧹 Cleaned up ${removedCount} invalid outfit(s).`);
  }
  console.log(`✅ Generated ${newOutfits.length} new outfit(s).`);
  console.log(`📁 Total outfits in collection: ${outfitsDoc.outfits.length}`);
  console.log(`📝 Updated: ${OUTFITS_PATH}`);
}

// =============================================================================
// SCRIPT EXECUTION
// =============================================================================

// Execute the main generation function
main();