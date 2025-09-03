import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GeneratedOutfit, OutfitSelection } from '../types';
import { OutfitCard } from './OutfitCard';

interface OutfitListProps {
  outfits: GeneratedOutfit[];
  onOutfitSelect: (outfit: GeneratedOutfit) => void;
  className?: string;
  isLoading?: boolean;
}

export const OutfitList: React.FC<OutfitListProps> = ({
  outfits,
  onOutfitSelect,
  className = '',
  isLoading = false
}) => {
  const outfitCount = outfits.length;
  const [visibleCount, setVisibleCount] = useState(12); // Start with 12 items
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize visible outfits to avoid unnecessary re-renders
  const visibleOutfits = useMemo(() => {
    return outfits.slice(0, visibleCount);
  }, [outfits, visibleCount]);

  // Handle scroll-based lazy loading
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth;

      // Load more when 80% scrolled and there are more items
      if (scrollPercentage > 0.8 && visibleCount < outfitCount && !isLoadingMore) {
        setIsLoadingMore(true);
        
        // Clear existing timeout
        if (loadMoreTimeoutRef.current) {
          clearTimeout(loadMoreTimeoutRef.current);
        }

        // Debounce loading more items
        loadMoreTimeoutRef.current = setTimeout(() => {
          setVisibleCount(prev => Math.min(prev + 8, outfitCount)); // Load 8 more items
          setIsLoadingMore(false);
        }, 300);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, [visibleCount, outfitCount, isLoadingMore]);

  // Reset visible count when outfits change
  useEffect(() => {
    setVisibleCount(12);
    setIsLoadingMore(false);
  }, [outfits]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Outfit count message */}
      <div className="text-sm text-slate-600">
        {isLoading ? (
          <span>Loading outfits...</span>
        ) : outfitCount === 0 ? (
          <span>No outfits match your selection</span>
        ) : (
          <span>{outfitCount} outfit{outfitCount !== 1 ? 's' : ''} found</span>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex-shrink-0 w-64">
                <div className="bg-stone-100 rounded-xl h-48 animate-pulse">
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-stone-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-stone-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-stone-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal scrollable outfit grid with lazy loading */}
      {!isLoading && outfitCount > 0 && (
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
            {visibleOutfits.map((outfit, index) => (
              <div 
                key={outfit.id} 
                className="flex-shrink-0 w-64 transition-all duration-300 hover:scale-105"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards'
                }}
              >
                <OutfitCard
                  outfit={outfit}
                  variant="compact"
                  showScore={true}
                  showSource={false}
                  onClick={() => onOutfitSelect(outfit)}
                  className="h-full transition-shadow duration-200 hover:shadow-lg"
                />
              </div>
            ))}
            
            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex-shrink-0 w-64 flex items-center justify-center">
                <div className="bg-stone-100 rounded-xl h-48 animate-pulse flex items-center justify-center">
                  <div className="text-stone-500 text-sm">Loading more...</div>
                </div>
              </div>
            )}
            
            {/* Show remaining count if there are more items */}
            {visibleCount < outfitCount && !isLoadingMore && (
              <div className="flex-shrink-0 w-64 flex items-center justify-center">
                <div className="bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl h-48 flex items-center justify-center">
                  <div className="text-center text-stone-500">
                    <div className="text-lg font-medium">+{outfitCount - visibleCount}</div>
                    <div className="text-sm">more outfits</div>
                    <div className="text-xs mt-1">Scroll to load</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};