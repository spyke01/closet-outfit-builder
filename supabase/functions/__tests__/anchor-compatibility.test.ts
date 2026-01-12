import { describe, it, expect } from 'vitest';

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

describe('Anchor-based outfit recommendations', () => {
  it('should provide high compatibility for Jacket anchor with formal shirt', () => {
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
    expect(result.score).toBeGreaterThanOrEqual(80);
    
    // Should include jacket-shirt pairing reason
    expect(result.reasons).toContain('Jacket-shirt pairing');
  });

  it('should provide good compatibility for Overshirt anchor with casual shirt', () => {
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
    expect(result.score).toBeGreaterThanOrEqual(70);
    
    // Should include jacket-shirt pairing reason (overshirt is treated as jacket)
    expect(result.reasons).toContain('Jacket-shirt pairing');
  });

  it('should handle Jacket and Overshirt as different categories', () => {
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
    
    // Should have lower compatibility due to formality mismatch and different categories
    expect(result.score).toBeLessThan(60);
    expect(result.reasons).toContain('Formality mismatch');
  });

  it('should reject same category items', () => {
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
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual(['Same category']);
  });

  it('should treat Overshirt and Jacket as separate anchor categories', () => {
    const overshirtAnchor: WardrobeItem = {
      id: "1",
      name: "Flannel Overshirt",
      category_name: "Overshirt",
      formality_score: 3
    };

    const pants: WardrobeItem = {
      id: "2",
      name: "Chinos",
      category_name: "Pants",
      formality_score: 5
    };

    const result = calculateCompatibility(overshirtAnchor, pants);
    
    // Should get jacket-pants pairing bonus since overshirt is treated like jacket
    expect(result.reasons).toContain('Jacket-pants pairing');
    expect(result.score).toBeGreaterThan(50);
  });
});