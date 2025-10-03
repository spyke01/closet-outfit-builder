import { useState, useMemo, useCallback, startTransition, useDeferredValue } from 'react';
import { WardrobeItem, GeneratedOutfit, OutfitSelection } from '../types';
import { useOutfitEngine } from './useOutfitEngine';

interface OptimizedOutfitState {
  outfits: GeneratedOutfit[];
  searchTerm: string;
  filterCriteria: OutfitFilterCriteria;
  isGenerating: boolean;
  isFiltering: boolean;
}

interface OutfitFilterCriteria {
  minScore?: number;
  maxScore?: number;
  source?: 'curated' | 'generated';
  loved?: boolean;
  categories?: string[];
}

interface OptimizedOutfitActions {
  setSearchTerm: (term: string) => void;
  setFilterCriteria: (criteria: OutfitFilterCriteria) => void;
  generateOutfits: (anchorItem: WardrobeItem) => void;
  generateRandomOutfits: (count: number) => void;
  clearOutfits: () => void;
}

export const useOptimizedOutfitGeneration = (): OptimizedOutfitState & OptimizedOutfitActions => {
  const outfitEngine = useOutfitEngine();
  
  // State management
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCriteria, setFilterCriteria] = useState<OutfitFilterCriteria>({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Use deferred value for expensive search operations
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredFilterCriteria = useDeferredValue(filterCriteria);
  
  // Memoized search function with performance optimization
  const searchOutfits = useMemo(() => {
    if (!deferredSearchTerm.trim()) {
      return outfits;
    }
    
    const searchLower = deferredSearchTerm.toLowerCase();
    return outfits.filter(outfit => {
      // Search in outfit items
      const itemNames = [
        outfit.jacket?.name,
        outfit.shirt?.name,
        outfit.undershirt?.name,
        outfit.pants?.name,
        outfit.shoes?.name,
        outfit.belt?.name,
        outfit.watch?.name
      ].filter(Boolean).join(' ').toLowerCase();
      
      return itemNames.includes(searchLower) || 
             outfit.id.toLowerCase().includes(searchLower);
    });
  }, [outfits, deferredSearchTerm]);
  
  // Memoized filter function with performance optimization
  const filteredOutfits = useMemo(() => {
    let result = searchOutfits;
    
    // Apply score filters
    if (deferredFilterCriteria.minScore !== undefined) {
      result = result.filter(outfit => outfit.score >= deferredFilterCriteria.minScore!);
    }
    
    if (deferredFilterCriteria.maxScore !== undefined) {
      result = result.filter(outfit => outfit.score <= deferredFilterCriteria.maxScore!);
    }
    
    // Apply source filter
    if (deferredFilterCriteria.source) {
      result = result.filter(outfit => outfit.source === deferredFilterCriteria.source);
    }
    
    // Apply loved filter
    if (deferredFilterCriteria.loved !== undefined) {
      result = result.filter(outfit => outfit.loved === deferredFilterCriteria.loved);
    }
    
    // Apply category filters
    if (deferredFilterCriteria.categories && deferredFilterCriteria.categories.length > 0) {
      result = result.filter(outfit => {
        const outfitCategories = [
          outfit.jacket?.category,
          outfit.shirt?.category,
          outfit.undershirt?.category,
          outfit.pants?.category,
          outfit.shoes?.category,
          outfit.belt?.category,
          outfit.watch?.category
        ].filter(Boolean);
        
        return deferredFilterCriteria.categories!.some(category => 
          outfitCategories.includes(category)
        );
      });
    }
    
    return result.sort((a, b) => b.score - a.score);
  }, [searchOutfits, deferredFilterCriteria]);
  
  // Check if filtering is in progress (deferred values are behind)
  const isFiltering = useMemo(() => {
    return searchTerm !== deferredSearchTerm || 
           JSON.stringify(filterCriteria) !== JSON.stringify(deferredFilterCriteria);
  }, [searchTerm, deferredSearchTerm, filterCriteria, deferredFilterCriteria]);
  
  // Optimized outfit generation with startTransition
  const generateOutfits = useCallback((anchorItem: WardrobeItem) => {
    setIsGenerating(true);
    
    startTransition(() => {
      try {
        // Get outfits for the anchor item
        const anchorOutfits = outfitEngine.getOutfitsForAnchor(anchorItem);
        
        // Add to existing outfits, removing duplicates
        setOutfits(prevOutfits => {
          const existingIds = new Set(prevOutfits.map(outfit => outfit.id));
          const newOutfits = anchorOutfits.filter(outfit => !existingIds.has(outfit.id));
          
          return [...newOutfits, ...prevOutfits].slice(0, 50); // Limit to 50 outfits for performance
        });
        
      } catch (error) {
        console.error('Error generating outfits:', error);
      } finally {
        setIsGenerating(false);
      }
    });
  }, [outfitEngine]);
  
  // Optimized random outfit generation
  const generateRandomOutfits = useCallback((count: number) => {
    setIsGenerating(true);
    
    startTransition(() => {
      try {
        const randomOutfits: GeneratedOutfit[] = [];
        const allOutfits = outfitEngine.getAllOutfits();
        
        // Generate unique random outfits
        const usedIndices = new Set<number>();
        
        for (let i = 0; i < Math.min(count, allOutfits.length); i++) {
          let randomIndex: number;
          do {
            randomIndex = Math.floor(Math.random() * allOutfits.length);
          } while (usedIndices.has(randomIndex));
          
          usedIndices.add(randomIndex);
          randomOutfits.push(allOutfits[randomIndex]);
        }
        
        // Add to existing outfits
        setOutfits(prevOutfits => {
          const existingIds = new Set(prevOutfits.map(outfit => outfit.id));
          const newOutfits = randomOutfits.filter(outfit => !existingIds.has(outfit.id));
          
          return [...newOutfits, ...prevOutfits].slice(0, 50);
        });
        
      } catch (error) {
        console.error('Error generating random outfits:', error);
      } finally {
        setIsGenerating(false);
      }
    });
  }, [outfitEngine]);
  
  // Clear outfits
  const clearOutfits = useCallback(() => {
    startTransition(() => {
      setOutfits([]);
      setSearchTerm('');
      setFilterCriteria({});
    });
  }, []);
  
  return {
    // State
    outfits: filteredOutfits,
    searchTerm,
    filterCriteria,
    isGenerating,
    isFiltering,
    
    // Actions
    setSearchTerm,
    setFilterCriteria,
    generateOutfits,
    generateRandomOutfits,
    clearOutfits
  };
};