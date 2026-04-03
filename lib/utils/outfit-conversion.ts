import { type OutfitSelection } from '@/lib/types/database';
import { type Outfit } from '@/lib/types/database';
import { getOutfitSlotForCategoryName, hasCompleteOutfitItems } from '@/lib/utils/outfit-coverage';

/**
 * Convert a database Outfit with items to an OutfitSelection format
 * that can be used with the ScoreCircle component for detailed breakdown
 */
export function convertOutfitToSelection(outfit: Outfit): OutfitSelection | null {
  if (!outfit.items || outfit.items.length === 0) {
    return null;
  }

  const selection: OutfitSelection = {
    tuck_style: outfit.tuck_style || 'Untucked',
  };

  // Map items by category name to the selection object
  outfit.items.forEach((item) => {
    if (!item.category) return;

    const slot = getOutfitSlotForCategoryName(item.category.name);
    if (!slot) return;
    selection[slot] = item;
  });

  return selection;
}

/**
 * Check if an outfit has enough items to generate a meaningful score breakdown
 */
export function canGenerateScoreBreakdown(outfit: Outfit): boolean {
  if (!outfit.items || outfit.items.length < 1) {
    return false;
  }

  return hasCompleteOutfitItems(outfit.items);
}
