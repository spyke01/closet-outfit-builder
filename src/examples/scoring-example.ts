import { calculateOutfitScore } from '../utils/scoring';
import { OutfitSelection, WardrobeItem, ScoreBreakdown } from '../types';

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

const undershirt: WardrobeItem = {
  id: 'undershirt-white',
  name: 'White Undershirt',
  category: 'Undershirt',
  formalityScore: 1
};

// Example outfit selections
const formalOutfit: OutfitSelection = {
  jacket: blazer,
  shirt,
  undershirt,
  pants: trousers,
  shoes,
  belt,
  watch
};

const casualOutfit: OutfitSelection = {
  undershirt: {
    id: 'tee-casual',
    name: 'Casual T-Shirt',
    category: 'Undershirt',
    formalityScore: 1
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

console.log('1. Formal Business Outfit (with layering):');
const formalScore: ScoreBreakdown = calculateOutfitScore(formalOutfit);
console.log(`   Formality Score: ${formalScore.formalityScore}% (${Math.round(formalScore.formalityWeight * 100)}% weight)`);
console.log(`   Consistency Bonus: ${formalScore.consistencyBonus}% (${Math.round(formalScore.consistencyWeight * 100)}% weight)`);
console.log(`   Total Score: ${formalScore.total}% (${formalScore.percentage}%)`);
console.log('   Layer Adjustments:');
formalScore.layerAdjustments.forEach(adj => {
  console.log(`     ${adj.itemName}: ${adj.originalScore} × ${adj.weight} = ${adj.adjustedScore.toFixed(1)} (${adj.reason})`);
});
console.log('');

console.log('2. Casual Weekend Outfit (undershirt only):');
const casualScore: ScoreBreakdown = calculateOutfitScore(casualOutfit);
console.log(`   Formality Score: ${casualScore.formalityScore}% (${Math.round(casualScore.formalityWeight * 100)}% weight)`);
console.log(`   Consistency Bonus: ${casualScore.consistencyBonus}% (${Math.round(casualScore.consistencyWeight * 100)}% weight)`);
console.log(`   Total Score: ${casualScore.total}% (${casualScore.percentage}%)`);
console.log('   Layer Adjustments:');
casualScore.layerAdjustments.forEach(adj => {
  console.log(`     ${adj.itemName}: ${adj.originalScore} × ${adj.weight} = ${adj.adjustedScore.toFixed(1)} (${adj.reason})`);
});
console.log('');

console.log('3. Perfect Score Example (all 10s):');
const perfectOutfit: OutfitSelection = {
  shirt: { ...shirt, formalityScore: 10 },
  pants: { ...trousers, formalityScore: 10 },
  shoes: { ...shoes, formalityScore: 10 },
  watch: { ...watch, formalityScore: 10 }
};
const perfectScore: ScoreBreakdown = calculateOutfitScore(perfectOutfit);
console.log(`   Formality Score: ${perfectScore.formalityScore}% (${Math.round(perfectScore.formalityWeight * 100)}% weight)`);
console.log(`   Consistency Bonus: ${perfectScore.consistencyBonus}% (${Math.round(perfectScore.consistencyWeight * 100)}% weight)`);
console.log(`   Total Score: ${perfectScore.total}% (${perfectScore.percentage}%)`);
console.log('');

console.log('=== Layer-Aware Scoring System ===');
console.log('• Formality Score: 93% of total based on weighted item formality levels (1-10 each)');
console.log('• Consistency Bonus: 7% of total for outfits with similar formality levels');
console.log('• Layer Weights:');
console.log('  - Visible items (jacket, pants, shoes): 1.0x weight');
console.log('  - Covered shirt (when jacket present): 0.7x weight');
console.log('  - Covered undershirt (when shirt/jacket present): 0.3x weight');
console.log('  - Accessories (belt, watch): 0.8x weight');
console.log('• All categories are optional');
console.log('• Maximum Possible Score: 100%');