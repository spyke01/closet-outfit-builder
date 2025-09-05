import { WardrobeItem, OutfitSelection, GeneratedOutfit, Category, CategoryKey, categoryToKey, keyToCategory } from '../types';
import { useWardrobe } from './useWardrobe';
import { useMemo, useCallback } from 'react';

export const useOutfitEngine = () => {
  const { items, outfits, getItemById } = useWardrobe();

  const validateOutfit = (selection: OutfitSelection): boolean => {
    // Hard rule: no shorts + boots
    if (selection.pants?.name.toLowerCase().includes('shorts') &&
      selection.shoes?.name.toLowerCase().includes('boots')) {
      return false;
    }

    // Must have shirt, pants, shoes
    const hasRequired = !!(selection.shirt && selection.pants && selection.shoes);
    return hasRequired;
  };

  const scoreOutfit = (selection: OutfitSelection): number => {
    let score = 0;

    // Add formality scores for each item
    const items = [
      selection.jacket,
      selection.shirt,
      selection.pants,
      selection.shoes,
      selection.belt,
      selection.watch
    ];

    items.forEach(item => {
      if (item?.formalityScore) {
        score += item.formalityScore;
      }
    });

    // Bonus for style consistency (items with similar formality levels)
    const formalityScores = items
      .filter(item => item?.formalityScore)
      .map(item => item!.formalityScore!);

    if (formalityScores.length >= 3) {
      const avgFormality = formalityScores.reduce((a, b) => a + b, 0) / formalityScores.length;
      const variance = formalityScores.reduce((acc, score) => acc + Math.pow(score - avgFormality, 2), 0) / formalityScores.length;

      // Lower variance = more consistent style = bonus points
      const consistencyBonus = Math.max(0, 10 - variance);
      score += consistencyBonus;
    }

    return Math.round(score);
  };

  // Memoize all outfits to avoid recalculating on every render
  const allOutfits = useMemo(() => {
    const results: GeneratedOutfit[] = [];

    // Use the new category mapping utility

    // Convert all curated outfits to GeneratedOutfit format
    outfits.forEach(outfit => {
      const selection: OutfitSelection = {};

      outfit.items.forEach(itemId => {
        const item = getItemById(itemId);
        if (item) {
          const key = categoryToKey(item.category);
          (selection as any)[key] = item;
        } else {
          console.warn(`Item not found: ${itemId}`);
        }
      });
      selection.tuck = outfit.tuck;

      if (validateOutfit(selection)) {
        const generatedOutfit = {
          ...selection,
          id: outfit.id,
          score: scoreOutfit(selection) + (outfit.weight || 1) * 5,
          source: 'curated' as const
        };
        results.push(generatedOutfit);
      }
    });
    return results.sort((a, b) => b.score - a.score);
  }, [outfits, getItemById, validateOutfit, scoreOutfit]);

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

  const generateRandomOutfit = (currentSelection: OutfitSelection): GeneratedOutfit | null => {
    const categories: Category[] = ['Jacket/Overshirt', 'Shirt', 'Pants', 'Shoes'];
    const selection: OutfitSelection = { ...currentSelection };

    // Fill or replace categories
    for (const category of categories) {
      const key = categoryToKey(category);
      const availableItems = items.filter(item => item.category === category);

      if (availableItems.length > 0) {
        const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
        (selection as any)[key] = randomItem;
      }
    }

    // Add suggested accessories
    const accessories = suggestAccessories(selection);
    if (accessories.belt) {
      selection.belt = accessories.belt;
    }
    if (accessories.watch) {
      selection.watch = accessories.watch;
    }

    // Determine tuck style (only if not already set)
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
            const key = categoryToKey(item.category);
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

  const getAllOutfits = useCallback((): GeneratedOutfit[] => {
    return allOutfits;
  }, [allOutfits]);

  // Memoized compatibility calculation with cache
  const compatibilityCache = useMemo(() => new Map<string, WardrobeItem[]>(), []);

  const getCompatibleItems = useCallback((
    category: Category,
    currentSelection: OutfitSelection
  ): WardrobeItem[] => {
    try {
      // Validate inputs
      if (!category) {
        return [];
      }

      if (!currentSelection) {
        return [];
      }

      // Create cache key based on category and current selection
      const selectionKey = Object.entries(currentSelection)
        .filter(([key, item]) => item && key !== 'tuck' && key !== 'locked')
        .map(([key, item]) => `${key}:${(item as WardrobeItem).id}`)
        .sort()
        .join('|');
      const cacheKey = `${category}|${selectionKey}`;

      // Check cache first
      if (compatibilityCache.has(cacheKey)) {
        return compatibilityCache.get(cacheKey)!;
      }

      if (allOutfits.length === 0) {
        return [];
      }

      const matchingOutfits = allOutfits.filter(outfit => {
        const matches = Object.entries(currentSelection).every(([key, item]) => {
          if (!item || key === 'tuck' || key === 'locked') return true;
          const outfitKey = key as keyof OutfitSelection;
          const outfitItem = outfit[outfitKey] as WardrobeItem;
          return outfitItem?.id === item.id;
        });
        return matches;
      });

      // Extract unique items for target category from matching outfits
      const compatibleItems = new Set<WardrobeItem>();

      // Use the new category mapping utility
      const categoryKey = categoryToKey(category);

      matchingOutfits.forEach(outfit => {
        const item = outfit[categoryKey] as WardrobeItem;
        if (item && item.id && item.name) {
          compatibleItems.add(item);
        }
      });

      const result = Array.from(compatibleItems);

      // Cache the result
      compatibilityCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error in getCompatibleItems:', error);
      return [];
    }
  }, [allOutfits, compatibilityCache]);

  // Memoized outfit filtering
  const outfitFilterCache = useMemo(() => new Map<string, GeneratedOutfit[]>(), []);

  const getFilteredOutfits = useCallback((selection: OutfitSelection): GeneratedOutfit[] => {
    try {
      // Validate input
      if (!selection) {
        return [];
      }

      // Create cache key based on selection
      const selectionKey = Object.entries(selection)
        .filter(([key, item]) => item && key !== 'tuck' && key !== 'locked')
        .map(([key, item]) => `${key}:${(item as WardrobeItem).id}`)
        .sort()
        .join('|');

      // Check cache first
      if (outfitFilterCache.has(selectionKey)) {
        return outfitFilterCache.get(selectionKey)!;
      }

      if (allOutfits.length === 0) {
        return [];
      }

      const result = allOutfits.filter(outfit => {
        try {
          return Object.entries(selection).every(([key, item]) => {
            if (!item || key === 'tuck' || key === 'locked') return true;
            const outfitKey = key as keyof OutfitSelection;
            const outfitItem = outfit[outfitKey] as WardrobeItem;
            return outfitItem?.id === item.id;
          });
        } catch (error) {
          console.error('Error filtering individual outfit:', error);
          return false;
        }
      });

      // Cache the result
      outfitFilterCache.set(selectionKey, result);

      return result;
    } catch (error) {
      console.error('Error in getFilteredOutfits:', error);
      return [];
    }
  }, [allOutfits, outfitFilterCache]);

  const validatePartialSelection = (selection: OutfitSelection): boolean => {
    try {
      // Validate input
      if (!selection) {
        return false;
      }

      // Check hard rules that apply to partial selections

      // Hard rule: no shorts + boots (if both are selected)
      if (selection.pants?.name?.toLowerCase().includes('shorts') &&
        selection.shoes?.name?.toLowerCase().includes('boots')) {
        return false;
      }

      // Additional validation rules can be added here

      // Validate that selected items have required properties
      const itemsToValidate = [
        selection.jacket,
        selection.shirt,
        selection.pants,
        selection.shoes,
        selection.belt,
        selection.watch
      ].filter(Boolean);

      for (const item of itemsToValidate) {
        if (!item?.id || !item?.name || !item?.category) {
          return false;
        }
      }

      // For partial selections, we don't require all items to be present
      // Just validate that the selected items don't violate any rules
      return true;
    } catch (error) {
      console.error('Error in validatePartialSelection:', error);
      return false;
    }
  };

  return {
    validateOutfit,
    scoreOutfit,
    suggestAccessories,
    generateRandomOutfit,
    getOutfitsForAnchor,
    getAllOutfits,
    getCompatibleItems,
    getFilteredOutfits,
    validatePartialSelection
  };
};