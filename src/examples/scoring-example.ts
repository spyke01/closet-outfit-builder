import { calculateOutfitScore, ScoreBreakdown } from '../utils/scoring';
import { OutfitSelection, WardrobeItem } from '../types';

/**
 * Example demonstrating the new consolidated scoring system
 */

// Example wardrobe items
const blazer: WardrobeItem = {
  id: 'blazer-navy',
  name: 'Navy Blazer',
  category: 'Jacket/Overshirt',
  formalityScore: 8
};

const shirt: WardrobeItem = {
  id: 'shirt-white',
  name: 'White Dress Shirt',
  category: 'Shirt',
  formalityScore: 7
};

const trousers: WardrobeItem = {
  id: 'trousers-charcoal',
  name: 'Charcoal Trousers',
  category: 'Pants',
  formalityScore: 7
};

const shoes: WardrobeItem = {
  id: 'shoes-oxford',
  name: 'Black Oxford Shoes',
  category: 'Shoes',
  formalityScore: 9
};

const belt: WardrobeItem = {
  id: 'belt-leather',
  name: 'Black Leather Belt',
  category: 'Belt',
  formalityScore: 7
};

const watch: WardrobeItem = {
  id: 'watch-dress',
  name: 'Dress Watch',
  category: 'Watch',
  formalityScore: 8
};

// Example outfit selections
const formalOutfit: OutfitSelection = {
  jacket: blazer,
  shirt,
  pants: trousers,
  shoes,
  belt,
  watch
};

const casualOutfit: OutfitSelection = {
  shirt: {
    id: 'tee-white',
    name: 'White T-Shirt',
    category: 'Shirt',
    formalityScore: 2
  },
  pants: {
    id: 'jeans-dark',
    name: 'Dark Jeans',
    category: 'Pants',
    formalityScore: 3
  },
  shoes: {
    id: 'sneakers-white',
    name: 'White Sneakers',
    category: 'Shoes',
    formalityScore: 1
  }
};

// Calculate scores
console.log('=== New Scoring System Examples ===\n');

console.log('1. Formal Business Outfit:');
const formalScore: ScoreBreakdown = calculateOutfitScore(formalOutfit);
console.log(`   Formality Score: ${formalScore.formalityScore}% (93% weight)`);
console.log(`   Consistency Bonus: ${formalScore.consistencyBonus}% (7% weight)`);
console.log(`   Total Score: ${formalScore.total}% (${formalScore.percentage}%)\n`);

console.log('2. Casual Weekend Outfit:');
const casualScore: ScoreBreakdown = calculateOutfitScore(casualOutfit);
console.log(`   Formality Score: ${casualScore.formalityScore}% (93% weight)`);
console.log(`   Consistency Bonus: ${casualScore.consistencyBonus}% (7% weight)`);
console.log(`   Total Score: ${casualScore.total}% (${casualScore.percentage}%)\n`);

console.log('3. Perfect Score Example (all 10s):');
const perfectOutfit: OutfitSelection = {
  shirt: { ...shirt, formalityScore: 10 },
  pants: { ...trousers, formalityScore: 10 },
  shoes: { ...shoes, formalityScore: 10 },
  watch: { ...watch, formalityScore: 10 }
};
const perfectScore: ScoreBreakdown = calculateOutfitScore(perfectOutfit);
console.log(`   Formality Score: ${perfectScore.formalityScore}% (93% weight)`);
console.log(`   Consistency Bonus: ${perfectScore.consistencyBonus}% (7% weight)`);
console.log(`   Total Score: ${perfectScore.total}% (${perfectScore.percentage}%)\n`);

console.log('=== New Scoring Breakdown ===');
console.log('• Formality Score: 93% of total based on item formality levels (1-10 each)');
console.log('• Consistency Bonus: 7% of total for outfits with similar formality levels');
console.log('• Jacket and Belt are optional items');
console.log('• Maximum Possible Score: 100%');