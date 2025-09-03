import { useMemo } from 'react';
import { WardrobeItem, OutfitSelection, GeneratedOutfit, Category } from '../types';
import { useWardrobe } from './useWardrobe';

export const useOutfitEngine = () => {
  const { items, outfits, getItemById } = useWardrobe();

  const validateOutfit = (selection: OutfitSelection): boolean => {
    // Hard rule: no shorts + boots
    if (selection.pants?.name.toLowerCase().includes('shorts') && 
        selection.shoes?.name.toLowerCase().includes('boots')) {
      return false;
    }

    // Must have shirt, pants, shoes
    return !!(selection.shirt && selection.pants && selection.shoes);
  };

  const scoreOutfit = (selection: OutfitSelection): number => {
    let score = 0;

    // Soft rules for scoring
    if (selection.shoes?.name.toLowerCase().includes('suede loafers') && 
        selection.belt?.id === 'belt-braided') {
      score += 10;
    }

    if (selection.pants?.id === 'trousers-charcoal' && 
        selection.belt?.id === 'belt-reversible') {
      score += 8;
    }

    if (selection.jacket?.id === 'moto-jacket' && 
        selection.shoes?.id === 'apache-boots' && 
        selection.belt?.id === 'belt-rugged') {
      score += 12;
    }

    // Linen preferences
    if (selection.shirt?.name.toLowerCase().includes('linen')) {
      if (selection.watch?.id === 'rolex-panda' || selection.watch?.id === 'omega-300m') {
        score += 6;
      }
    }

    return score;
  };

  const suggestAccessories = (selection: OutfitSelection): { belt?: WardrobeItem; watch?: WardrobeItem } => {
    const suggestions: { belt?: WardrobeItem; watch?: WardrobeItem } = {};

    // Belt suggestions
    if (selection.shoes?.name.toLowerCase().includes('suede')) {
      suggestions.belt = getItemById('belt-braided');
    } else if (selection.pants?.id === 'trousers-charcoal') {
      suggestions.belt = getItemById('belt-reversible');
    } else if (selection.jacket?.id === 'moto-jacket' || selection.shoes?.id === 'apache-boots') {
      suggestions.belt = getItemById('belt-rugged');
    } else {
      suggestions.belt = getItemById('belt-clean-brown');
    }

    // Watch suggestions
    if (selection.shirt?.name.toLowerCase().includes('linen') || 
        selection.pants?.name.toLowerCase().includes('shorts')) {
      suggestions.watch = getItemById('rolex-panda');
    } else if (selection.pants?.id === 'trousers-charcoal') {
      suggestions.watch = getItemById('omega-300m');
    } else if (selection.jacket?.id === 'moto-jacket') {
      suggestions.watch = getItemById('panerai-luminor');
    } else {
      suggestions.watch = getItemById('omega-300m');
    }

    return suggestions;
  };

  const generateRandomOutfit = (locked: OutfitSelection): GeneratedOutfit | null => {
    const categories: Category[] = ['Jacket/Overshirt', 'Shirt', 'Pants', 'Shoes'];
    const selection: OutfitSelection = { ...locked };

    // Fill missing categories
    for (const category of categories) {
      const key = category.toLowerCase().replace('/', '') as keyof OutfitSelection;
      if (!selection[key] && items.filter(item => item.category === category).length > 0) {
        const availableItems = items.filter(item => item.category === category);
        const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
        (selection as any)[key] = randomItem;
      }
    }

    // Add suggested accessories
    const accessories = suggestAccessories(selection);
    if (!selection.belt && accessories.belt) selection.belt = accessories.belt;
    if (!selection.watch && accessories.watch) selection.watch = accessories.watch;

    // Determine tuck style
    if (!selection.tuck) {
      const isRefined = selection.shirt?.capsuleTags?.includes('Refined');
      const isLinen = selection.shirt?.name.toLowerCase().includes('linen');
      const hasTrousers = selection.pants?.name.toLowerCase().includes('trousers');
      
      selection.tuck = (isRefined && !isLinen) || hasTrousers ? 'Tucked' : 'Untucked';
    }

    if (!validateOutfit(selection)) {
      return null;
    }

    return {
      ...selection,
      id: `generated-${Date.now()}`,
      score: scoreOutfit(selection),
      source: 'generated'
    };
  };

  const getOutfitsForAnchor = (anchorItem: WardrobeItem): GeneratedOutfit[] => {
    const results: GeneratedOutfit[] = [];

    // Add curated outfits that include this item
    outfits.forEach(outfit => {
      if (outfit.items.includes(anchorItem.id)) {
        const selection: OutfitSelection = {};
        outfit.items.forEach(itemId => {
          const item = getItemById(itemId);
          if (item) {
            const key = item.category.toLowerCase().replace('/', '') as keyof OutfitSelection;
            (selection as any)[key] = item;
          }
        });
        selection.tuck = outfit.tuck;

        if (validateOutfit(selection)) {
          results.push({
            ...selection,
            id: outfit.id,
            score: scoreOutfit(selection) + (outfit.weight || 1) * 5,
            source: 'curated'
          });
        }
      }
    });

    return results.sort((a, b) => b.score - a.score);
  };

  return {
    validateOutfit,
    scoreOutfit,
    suggestAccessories,
    generateRandomOutfit,
    getOutfitsForAnchor
  };
};