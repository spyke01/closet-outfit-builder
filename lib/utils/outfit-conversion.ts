import { type OutfitSelection } from '@/lib/schemas';
import { type Outfit, type WardrobeItem } from '@/lib/types/database';

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

    const categoryName = item.category.name.toLowerCase();
    
    // Convert the WardrobeItem to the format expected by OutfitSelection
    const selectionItem = {
      id: item.id,
      name: item.name,
      category_id: item.category_id,
      brand: item.brand || null,
      color: item.color || null,
      material: item.material || null,
      formality_score: item.formality_score || null,
      capsule_tags: item.capsule_tags || null,
      season: (item.season as any) || null, // Type assertion to handle the mismatch
      image_url: item.image_url || null,
      active: item.active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };

    // Map to the correct selection field based on category
    switch (categoryName) {
      case 'jacket/overshirt':
        // Legacy category - could be either, default to jacket
        selection.jacket = selectionItem;
        break;
      case 'jacket':
        selection.jacket = selectionItem;
        break;
      case 'overshirt':
        selection.overshirt = selectionItem;
        break;
      case 'shirt':
        selection.shirt = selectionItem;
        break;
      case 'undershirt':
        selection.undershirt = selectionItem;
        break;
      case 'pants':
        selection.pants = selectionItem;
        break;
      case 'shoes':
        selection.shoes = selectionItem;
        break;
      case 'belt':
        selection.belt = selectionItem;
        break;
      case 'watch':
        selection.watch = selectionItem;
        break;
      default:
        // For unknown categories, try to map to the closest match
        if (categoryName.includes('jacket')) {
          selection.jacket = selectionItem;
        } else if (categoryName.includes('overshirt')) {
          selection.overshirt = selectionItem;
        } else if (categoryName.includes('shirt')) {
          selection.shirt = selectionItem;
        } else if (categoryName.includes('pants') || categoryName.includes('trouser')) {
          selection.pants = selectionItem;
        } else if (categoryName.includes('shoe')) {
          selection.shoes = selectionItem;
        }
        break;
    }
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

  // Check if we have at least one core item that can be scored
  const categoryNames = outfit.items
    .map(item => item.category?.name.toLowerCase())
    .filter(Boolean);

  const hasShirt = categoryNames.some(name => 
    name?.includes('shirt') || name?.includes('top')
  );
  const hasPants = categoryNames.some(name => 
    name?.includes('pants') || name?.includes('trouser') || name?.includes('bottom')
  );
  const hasShoes = categoryNames.some(name => 
    name?.includes('shoe') || name?.includes('footwear')
  );
  const hasJacket = categoryNames.some(name => 
    name?.includes('jacket') || name?.includes('overshirt')
  );

  // Allow breakdown if we have any core clothing item
  return hasShirt || hasPants || hasShoes || hasJacket;
}