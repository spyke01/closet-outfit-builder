import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Import the compatibility function (we'll need to extract it)
interface WardrobeItem {
  id: string;
  name: string;
  color?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  category_name: string;
}

// Copy the calculateCompatibility function for testing
function calculateCompatibility(anchorItem: WardrobeItem, candidateItem: WardrobeItem): { score: number; reasons: string[] } {
  let score = 50; // Base compatibility score
  const reasons: string[] = [];

  // Skip if same item
  if (anchorItem.id === candidateItem.id) {
    return { score: 0, reasons: ['Same item'] };
  }

  // Skip if same category
  if (anchorItem.category_name === candidateItem.category_name) {
    return { score: 0, reasons: ['Same category'] };
  }

  // Formality compatibility (most important factor)
  if (anchorItem.formality_score && candidateItem.formality_score) {
    const formalityDiff = Math.abs(anchorItem.formality_score - candidateItem.formality_score);
    
    if (formalityDiff <= 1) {
      score += 25;
      reasons.push('Perfect formality match');
    } else if (formalityDiff <= 2) {
      score += 15;
      reasons.push('Good formality match');
    } else if (formalityDiff <= 3) {
      score += 5;
      reasons.push('Acceptable formality match');
    } else {
      score -= 10;
      reasons.push('Formality mismatch');
    }
  }

  // Color compatibility
  if (anchorItem.color && candidateItem.color) {
    const anchorColor = anchorItem.color.toLowerCase();
    const candidateColor = candidateItem.color.toLowerCase();
    
    // Define color harmony rules
    const neutrals = ['white', 'black', 'grey', 'gray', 'navy', 'cream', 'beige', 'khaki', 'brown'];
    const earthTones = ['brown', 'tan', 'khaki', 'olive', 'cream', 'beige'];
    const blues = ['navy', 'blue', 'light blue', 'dark blue'];
    
    // Same color family bonus
    if (anchorColor === candidateColor) {
      score += 15;
      reasons.push('Matching colors');
    }
    // Neutral combinations
    else if (neutrals.includes(anchorColor) && neutrals.includes(candidateColor)) {
      score += 20;
      reasons.push('Neutral color harmony');
    }
    // Earth tone combinations
    else if (earthTones.includes(anchorColor) && earthTones.includes(candidateColor)) {
      score += 15;
      reasons.push('Earth tone harmony');
    }
    // Blue family combinations
    else if (blues.includes(anchorColor) && blues.includes(candidateColor)) {
      score += 10;
      reasons.push('Blue family harmony');
    }
    // White goes with everything
    else if (anchorColor === 'white' || candidateColor === 'white') {
      score += 12;
      reasons.push('White versatility');
    }
    // Navy goes with most things
    else if (anchorColor === 'navy' || candidateColor === 'navy') {
      score += 8;
      reasons.push('Navy versatility');
    }
    // Contrasting colors (can work but lower score)
    else {
      score += 2;
      reasons.push('Color contrast');
    }
  }

  // Seasonal compatibility
  const anchorSeasons = anchorItem.season || ['All'];
  const candidateSeasons = candidateItem.season || ['All'];
  
  const hasCommonSeason = anchorSeasons.some(season => 
    candidateSeasons.includes(season) || season === 'All' || candidateSeasons.includes('All')
  );
  
  if (hasCommonSeason) {
    score += 10;
    reasons.push('Seasonal compatibility');
  } else {
    score -= 5;
    reasons.push('Seasonal mismatch');
  }

  // Capsule tag compatibility
  if (anchorItem.capsule_tags && candidateItem.capsule_tags) {
    const anchorTags = new Set(anchorItem.capsule_tags);
    const candidateTags = new Set(candidateItem.capsule_tags);
    const commonTags = [...anchorTags].filter(tag => candidateTags.has(tag));
    
    if (commonTags.length > 0) {
      score += commonTags.length * 5;
      reasons.push(`Shared style tags: ${commonTags.join(', ')}`);
    }
  }

  // Category-specific compatibility rules
  const anchorCategory = anchorItem.category_name.toLowerCase();
  const candidateCategory = candidateItem.category_name.toLowerCase();
  
  // Jacket/Overshirt compatibility
  if (anchorCategory.includes('jacket') || anchorCategory.includes('overshirt')) {
    if (candidateCategory.includes('shirt')) {
      score += 8;
      reasons.push('Jacket-shirt pairing');
    } else if (candidateCategory.includes('pants')) {
      score += 6;
      reasons.push('Jacket-pants pairing');
    }
  }
  
  // Shirt compatibility
  if (anchorCategory.includes('shirt')) {
    if (candidateCategory.includes('pants')) {
      score += 10;
      reasons.push('Shirt-pants core pairing');
    } else if (candidateCategory.includes('shoes')) {
      score += 5;
      reasons.push('Shirt-shoes pairing');
    }
  }
  
  // Pants compatibility
  if (anchorCategory.includes('pants')) {
    if (candidateCategory.includes('shoes')) {
      score += 8;
      reasons.push('Pants-shoes pairing');
    } else if (candidateCategory.includes('belt')) {
      score += 6;
      reasons.push('Pants-belt pairing');
    }
  }

  return { 
    score: Math.max(0, Math.min(100, score)), 
    reasons: reasons.length > 0 ? reasons : ['Basic compatibility'] 
  };
}

Deno.test("Jacket anchor compatibility", () => {
  const jacketAnchor: WardrobeItem = {
    id: "1",
    name: "Navy Blazer",
    category_name: "Jacket",
    color: "navy",
    formality_score: 8
  };

  const whiteShirt: WardrobeItem = {
    id: "2", 
    name: "White Dress Shirt",
    category_name: "Shirt",
    color: "white",
    formality_score: 8
  };

  const result = calculateCompatibility(jacketAnchor, whiteShirt);
  
  // Should have high compatibility
  assertEquals(result.score >= 80, true, `Expected high compatibility score, got ${result.score}`);
  
  // Should include jacket-shirt pairing reason
  const hasJacketShirtPairing = result.reasons.some(reason => 
    reason.includes('Jacket-shirt pairing')
  );
  assertEquals(hasJacketShirtPairing, true, "Should include jacket-shirt pairing reason");
});

Deno.test("Overshirt anchor compatibility", () => {
  const overshirtAnchor: WardrobeItem = {
    id: "1",
    name: "Denim Overshirt", 
    category_name: "Overshirt",
    color: "blue",
    formality_score: 5
  };

  const casualShirt: WardrobeItem = {
    id: "2",
    name: "White T-Shirt",
    category_name: "Shirt", 
    color: "white",
    formality_score: 4
  };

  const result = calculateCompatibility(overshirtAnchor, casualShirt);
  
  // Should have good compatibility
  assertEquals(result.score >= 70, true, `Expected good compatibility score, got ${result.score}`);
  
  // Should include jacket-shirt pairing reason (overshirt is treated as jacket)
  const hasJacketShirtPairing = result.reasons.some(reason => 
    reason.includes('Jacket-shirt pairing')
  );
  assertEquals(hasJacketShirtPairing, true, "Should include jacket-shirt pairing reason for overshirt");
});

Deno.test("Different category compatibility", () => {
  const jacketAnchor: WardrobeItem = {
    id: "1",
    name: "Navy Blazer",
    category_name: "Jacket",
    formality_score: 8
  };

  const overshirtCandidate: WardrobeItem = {
    id: "2",
    name: "Casual Overshirt", 
    category_name: "Overshirt",
    formality_score: 4
  };

  const result = calculateCompatibility(jacketAnchor, overshirtCandidate);
  
  // Should have lower compatibility due to formality mismatch
  assertEquals(result.score < 60, true, `Expected lower compatibility due to formality mismatch, got ${result.score}`);
});

Deno.test("Same category rejection", () => {
  const jacketAnchor: WardrobeItem = {
    id: "1",
    name: "Navy Blazer",
    category_name: "Jacket"
  };

  const anotherJacket: WardrobeItem = {
    id: "2",
    name: "Black Blazer",
    category_name: "Jacket"
  };

  const result = calculateCompatibility(jacketAnchor, anotherJacket);
  
  // Should reject same category
  assertEquals(result.score, 0);
  assertEquals(result.reasons, ['Same category']);
});