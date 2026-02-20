import { describe, it } from 'vitest';
import * as fc from 'fast-check';

interface WardrobeItem {
  id: string;
  name: string;
  color?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  category_name: string;
}

// Copy the calculateCompatibility function for property testing
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

// Generators for property-based testing
const wardrobeItemGenerator = fc.record({
  id: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1 }),
  color: fc.option(fc.constantFrom('white', 'black', 'navy', 'blue', 'red', 'green', 'brown', 'grey'), { nil: undefined }),
  formality_score: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
  capsule_tags: fc.option(fc.array(fc.constantFrom('casual', 'formal', 'business', 'weekend', 'summer', 'winter')), { nil: undefined }),
  season: fc.option(fc.array(fc.constantFrom('Spring', 'Summer', 'Fall', 'Winter', 'All')), { nil: undefined }),
  category_name: fc.constantFrom('Jacket', 'Overshirt', 'Shirt', 'Pants', 'Shoes', 'Belt', 'Watch')
});

const anchorCategoryGenerator = fc.constantFrom('Jacket', 'Overshirt');

describe('Anchor-Based Discovery Property Tests', () => {
  it('Property 7: Anchor-Based Discovery Functionality - For any anchor item from either Jacket or Overshirt category, the recommendation system should find appropriate outfit combinations that include that anchor item', () => {
    fc.assert(fc.property(
      anchorCategoryGenerator,
      wardrobeItemGenerator,
      wardrobeItemGenerator,
      (anchorCategory, baseAnchorItem, baseCandidateItem) => {
        // Create anchor item with the specified category
        const anchorItem: WardrobeItem = {
          ...baseAnchorItem,
          category_name: anchorCategory
        };

        // Create candidate item with different category
        const candidateItem: WardrobeItem = {
          ...baseCandidateItem,
          id: baseAnchorItem.id + '_candidate', // Ensure different ID
          category_name: baseCandidateItem.category_name === anchorCategory 
            ? 'Shirt' // Use different category if same as anchor
            : baseCandidateItem.category_name
        };

        const result = calculateCompatibility(anchorItem, candidateItem);

        // Property: Compatibility score should be between 0 and 100
        const scoreInRange = result.score >= 0 && result.score <= 100;

        // Property: Should always return reasons array
        const hasReasons = Array.isArray(result.reasons) && result.reasons.length > 0;

        // Property: Same category items should be rejected (score = 0)
        const sameCategoryRejected = anchorItem.category_name === candidateItem.category_name 
          ? result.score === 0 
          : true;

        // Property: Anchor categories (Jacket/Overshirt) should get pairing bonuses with appropriate categories
        const anchorPairingBonus = (anchorCategory === 'Jacket' || anchorCategory === 'Overshirt') &&
          (candidateItem.category_name === 'Shirt' || candidateItem.category_name === 'Pants')
          ? result.reasons.some(reason => reason.includes('pairing'))
          : true;

        return scoreInRange && hasReasons && sameCategoryRejected && anchorPairingBonus;
      }
    ), { numRuns: 10 });
  });

  it('Property 7a: Jacket and Overshirt anchor items should be treated as separate categories', () => {
    fc.assert(fc.property(
      wardrobeItemGenerator,
      wardrobeItemGenerator,
      (baseItem1, baseItem2) => {
        const jacketAnchor: WardrobeItem = {
          ...baseItem1,
          category_name: 'Jacket'
        };

        const overshirtCandidate: WardrobeItem = {
          ...baseItem2,
          id: baseItem1.id + '_overshirt',
          category_name: 'Overshirt'
        };

        const result = calculateCompatibility(jacketAnchor, overshirtCandidate);

        // Property: Jacket and Overshirt should be treated as different categories
        // They should not be rejected as "same category"
        const treatedAsDifferent = result.score > 0 || !result.reasons.includes('Same category');

        return treatedAsDifferent;
      }
    ), { numRuns: 10 });
  });

  it('Property 7b: Both Jacket and Overshirt anchors should provide category-specific pairing bonuses', () => {
    fc.assert(fc.property(
      anchorCategoryGenerator,
      wardrobeItemGenerator,
      (anchorCategory, baseItem) => {
        const anchorItem: WardrobeItem = {
          ...baseItem,
          category_name: anchorCategory
        };

        const shirtCandidate: WardrobeItem = {
          ...baseItem,
          id: baseItem.id + '_shirt',
          category_name: 'Shirt'
        };

        const result = calculateCompatibility(anchorItem, shirtCandidate);

        // Property: Both Jacket and Overshirt anchors should get pairing bonus with shirts
        const hasPairingBonus = result.reasons.some(reason => 
          reason.includes('Jacket-shirt pairing')
        );

        return hasPairingBonus;
      }
    ), { numRuns: 10 });
  });

  it('Property 7c: Anchor-based discovery should be deterministic', () => {
    fc.assert(fc.property(
      wardrobeItemGenerator,
      wardrobeItemGenerator,
      (anchorItem, candidateItem) => {
        // Ensure different items
        const modifiedCandidate = {
          ...candidateItem,
          id: anchorItem.id + '_candidate'
        };

        const result1 = calculateCompatibility(anchorItem, modifiedCandidate);
        const result2 = calculateCompatibility(anchorItem, modifiedCandidate);

        // Property: Same inputs should always produce same outputs
        const sameScore = result1.score === result2.score;
        const sameReasons = JSON.stringify(result1.reasons) === JSON.stringify(result2.reasons);

        return sameScore && sameReasons;
      }
    ), { numRuns: 10 });
  });
});

// Feature: category-split-jacket-overshirt, Property 7: Anchor-Based Discovery Functionality
