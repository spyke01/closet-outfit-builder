import { WardrobeItem, OutfitSelection, GeneratedOutfit, Category, categoryToKey } from '../types';
import { useWardrobe } from './useWardrobe';
import { useState, useOptimistic, useMemo, useCallback, startTransition } from 'react';
import { calculateOutfitScore } from '../utils/scoring';

export const useOutfitEngine = () => {
  const { outfits, getItemById } = useWardrobe();

  const scoreOutfit = useCallback((selection: OutfitSelection): number => {
    return calculateOutfitScore(selection).percentage;
  }, []);

  // Memoize all outfits to avoid recalculating on every render
  const allOutfits = useMemo(() => {
    const results: GeneratedOutfit[] = [];

    // Convert all curated outfits to GeneratedOutfit format
    outfits.forEach(outfit => {
      const selection: OutfitSelection = {};

      outfit.items.forEach(itemId => {
        const item = getItemById(itemId);
        if (item) {
          const key = categoryToKey(item.category);
          selection[key] = item;
        } else {
          console.warn(`Item not found: ${itemId}`);
        }
      });
      selection.tuck = outfit.tuck;

      // All curated outfits are valid by design
      const generatedOutfit = {
        ...selection,
        id: outfit.id,
        score: scoreOutfit(selection),
        source: 'curated' as const,
        loved: outfit.loved
      };
      results.push(generatedOutfit);
    });
    return results.sort((a, b) => b.score - a.score);
  }, [outfits, getItemById, scoreOutfit]);

  const getRandomOutfit = (): GeneratedOutfit | null => {
    if (allOutfits.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * allOutfits.length);
    return allOutfits[randomIndex];
  };

  const getOutfitsForAnchor = (anchorItem: WardrobeItem): GeneratedOutfit[] => {
    return allOutfits.filter(outfit => {
      const anchorKey = categoryToKey(anchorItem.category);
      const outfitItem = outfit[anchorKey] as WardrobeItem;
      return outfitItem?.id === anchorItem.id;
    });
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

      // Hard rule: no shorts + boots (if both are selected)
      if (selection.pants?.name?.toLowerCase().includes('shorts') &&
        selection.shoes?.name?.toLowerCase().includes('boots')) {
        return false;
      }

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
      return true;
    } catch (error) {
      console.error('Error in validatePartialSelection:', error);
      return false;
    }
  };

  // Optimistic updates functionality
  const [generatedOutfits, setGeneratedOutfits] = useState<GeneratedOutfit[]>([]);
  const [generationError, setGenerationError] = useState<Error | null>(null);

  // useOptimistic hook for immediate UI updates
  const [optimisticOutfits, addOptimisticOutfit] = useOptimistic(
    generatedOutfits,
    (state: GeneratedOutfit[], newOutfit: GeneratedOutfit) => {
      return [newOutfit, ...state];
    }
  );

  // Create optimistic outfit for immediate feedback
  const createOptimisticOutfit = useCallback((anchorItem: WardrobeItem): GeneratedOutfit => {
    const optimisticSelection: OutfitSelection = {};
    
    // Place the anchor item in the appropriate category
    switch (anchorItem.category) {
      case 'Jacket/Overshirt':
        optimisticSelection.jacket = anchorItem;
        break;
      case 'Shirt':
        optimisticSelection.shirt = anchorItem;
        break;
      case 'Undershirt':
        optimisticSelection.undershirt = anchorItem;
        break;
      case 'Pants':
        optimisticSelection.pants = anchorItem;
        break;
      case 'Shoes':
        optimisticSelection.shoes = anchorItem;
        break;
      case 'Belt':
        optimisticSelection.belt = anchorItem;
        break;
      case 'Watch':
        optimisticSelection.watch = anchorItem;
        break;
    }

    const optimisticId = `optimistic-${anchorItem.id}-${Date.now()}`;
    const preliminaryScore = calculateOutfitScore(optimisticSelection).percentage;

    return {
      ...optimisticSelection,
      id: optimisticId,
      score: preliminaryScore,
      source: 'generated' as const,
      loved: false
    };
  }, []);

  // Simulate outfit generation with delay
  const performOutfitGeneration = useCallback(async (anchorItem: WardrobeItem): Promise<GeneratedOutfit[]> => {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    const actualOutfits = getOutfitsForAnchor(anchorItem);
    
    if (Math.random() < 0.05) {
      throw new Error('Outfit generation failed - please try again');
    }
    
    return actualOutfits;
  }, [getOutfitsForAnchor]);

  // Generate outfit with optimistic updates
  const generateOutfit = useCallback(async (anchorItem: WardrobeItem) => {
    try {
      setGenerationError(null);
      
      const optimisticResult = createOptimisticOutfit(anchorItem);
      startTransition(() => {
        addOptimisticOutfit(optimisticResult);
      });
      
      const actualResults = await performOutfitGeneration(anchorItem);
      
      setGeneratedOutfits(prev => {
        const filtered = prev.filter(outfit => {
          const anchorKey = anchorItem.category === 'Jacket/Overshirt' ? 'jacket' :
                           anchorItem.category === 'Shirt' ? 'shirt' :
                           anchorItem.category === 'Undershirt' ? 'undershirt' :
                           anchorItem.category === 'Pants' ? 'pants' :
                           anchorItem.category === 'Shoes' ? 'shoes' :
                           anchorItem.category === 'Belt' ? 'belt' : 'watch';
          const outfitItem = outfit[anchorKey] as WardrobeItem;
          return outfitItem?.id !== anchorItem.id;
        });
        
        return [...actualResults, ...filtered];
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Unknown error occurred');
      setGenerationError(errorMessage);
      console.error('Outfit generation failed:', errorMessage);
    }
  }, [addOptimisticOutfit, createOptimisticOutfit, performOutfitGeneration]);

  // Generate random outfit with optimistic updates
  const generateRandomOutfit = useCallback(async () => {
    try {
      setGenerationError(null);
      
      const randomOutfit = getRandomOutfit();
      if (!randomOutfit) {
        throw new Error('No outfits available for randomization');
      }
      
      const optimisticResult = {
        ...randomOutfit,
        id: `optimistic-random-${Date.now()}`,
        score: randomOutfit.score * 0.9
      };
      
      startTransition(() => {
        addOptimisticOutfit(optimisticResult);
      });
      
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
      
      setGeneratedOutfits(prev => [randomOutfit, ...prev.slice(0, 9)]);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Random outfit generation failed');
      setGenerationError(errorMessage);
      console.error('Random outfit generation failed:', errorMessage);
    }
  }, [getRandomOutfit, addOptimisticOutfit]);

  // Check if we're currently generating
  const isGenerating = useMemo(() => {
    return optimisticOutfits.length > generatedOutfits.length;
  }, [optimisticOutfits.length, generatedOutfits.length]);

  // Clear optimistic state
  const clearOptimistic = useCallback(() => {
    setGeneratedOutfits([]);
    setGenerationError(null);
  }, []);

  return {
    scoreOutfit,
    getRandomOutfit,
    getOutfitsForAnchor,
    getAllOutfits,
    getCompatibleItems,
    getFilteredOutfits,
    validatePartialSelection,
    // New optimistic functionality
    generateOutfit,
    generateRandomOutfit,
    generatedOutfits: optimisticOutfits,
    isGenerating,
    generationError,
    clearOptimistic
  };
};