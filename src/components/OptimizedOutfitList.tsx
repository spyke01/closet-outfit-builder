import React, { useMemo, startTransition, useDeferredValue } from 'react';
import { GeneratedOutfit } from '../types';
import { OutfitCard } from './OutfitCard';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

interface OptimizedOutfitListProps {
  outfits: GeneratedOutfit[];
  onOutfitSelect: (outfit: GeneratedOutfit) => void;
  className?: string;
  isLoading?: boolean;
  enableFlip?: boolean;
  searchTerm?: string;
  sortBy?: 'score' | 'name' | 'source';
  filterBy?: {
    minScore?: number;
    source?: 'curated' | 'generated';
    loved?: boolean;
  };
}

export const OptimizedOutfitList: React.FC<OptimizedOutfitListProps> = ({
  outfits,
  onOutfitSelect,
  className = '',
  isLoading = false,
  enableFlip = false,
  searchTerm = '',
  sortBy = 'score',
  filterBy = {}
}) => {
  const { measureInteraction, recordCustomMetric } = usePerformanceMonitoring();
  
  // Use deferred values for expensive operations
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredFilterBy = useDeferredValue(filterBy);
  const deferredSortBy = useDeferredValue(sortBy);
  
  // Memoized filtering and sorting with performance tracking
  const processedOutfits = useMemo(() => {
    const startTime = performance.now();
    
    let result = [...outfits];
    
    // Apply search filter
    if (deferredSearchTerm.trim()) {
      const searchLower = deferredSearchTerm.toLowerCase();
      result = result.filter(outfit => {
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
    }
    
    // Apply filters
    if (deferredFilterBy.minScore !== undefined) {
      result = result.filter(outfit => outfit.score >= deferredFilterBy.minScore!);
    }
    
    if (deferredFilterBy.source) {
      result = result.filter(outfit => outfit.source === deferredFilterBy.source);
    }
    
    if (deferredFilterBy.loved !== undefined) {
      result = result.filter(outfit => outfit.loved === deferredFilterBy.loved);
    }
    
    // Apply sorting
    switch (deferredSortBy) {
      case 'score':
        result.sort((a, b) => b.score - a.score);
        break;
      case 'name':
        result.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case 'source':
        result.sort((a, b) => {
          if (a.source === b.source) return b.score - a.score;
          return a.source === 'curated' ? -1 : 1;
        });
        break;
    }
    
    const endTime = performance.now();
    recordCustomMetric('filterResponseTime', endTime - startTime);
    
    return result;
  }, [outfits, deferredSearchTerm, deferredFilterBy, deferredSortBy, recordCustomMetric]);
  
  // Check if processing is deferred (showing stale data)
  const isProcessing = useMemo(() => {
    return searchTerm !== deferredSearchTerm || 
           JSON.stringify(filterBy) !== JSON.stringify(deferredFilterBy) ||
           sortBy !== deferredSortBy;
  }, [searchTerm, deferredSearchTerm, filterBy, deferredFilterBy, sortBy, deferredSortBy]);
  
  // Optimized outfit selection handler
  const handleOutfitSelect = (outfit: GeneratedOutfit) => {
    measureInteraction('outfit-select', () => {
      startTransition(() => {
        onOutfitSelect(outfit);
      });
    });
  };
  
  const outfitCount = processedOutfits.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Outfit count message with processing indicator */}
      <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
        {isLoading ? (
          <span>Loading outfits...</span>
        ) : (
          <>
            <span>
              {outfitCount} outfit{outfitCount !== 1 ? 's' : ''} found
            </span>
            {isProcessing && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                Processing...
              </span>
            )}
          </>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-stone-100 dark:bg-slate-700 rounded-xl h-48 animate-pulse">
              <div className="p-4 space-y-3">
                <div className="h-4 bg-stone-200 dark:bg-slate-600 rounded animate-pulse"></div>
                <div className="h-3 bg-stone-200 dark:bg-slate-600 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-stone-200 dark:bg-slate-600 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid layout for outfit cards with virtualization for large lists */}
      {!isLoading && outfitCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {processedOutfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              variant="compact"
              showScore={true}
              showSource={false}
              onClick={() => handleOutfitSelect(outfit)}
              className={`transition-all duration-200 hover:shadow-lg ${
                isProcessing ? 'opacity-75' : 'opacity-100'
              }`}
              enableFlip={enableFlip}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && outfitCount === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">
            {searchTerm || Object.keys(filterBy).length > 0 
              ? 'No outfits match your search criteria.' 
              : 'No outfits available.'}
          </p>
          {(searchTerm || Object.keys(filterBy).length > 0) && (
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
              Try adjusting your search or filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
};