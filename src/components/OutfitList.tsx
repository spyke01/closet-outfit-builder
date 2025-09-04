import React from 'react';
import { GeneratedOutfit } from '../types';
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-stone-100 rounded-xl h-48 animate-pulse">
              <div className="p-4 space-y-3">
                <div className="h-4 bg-stone-200 rounded animate-pulse"></div>
                <div className="h-3 bg-stone-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-stone-200 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid layout for outfit cards */}
      {!isLoading && outfitCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              variant="compact"
              showScore={true}
              showSource={false}
              onClick={() => onOutfitSelect(outfit)}
              className="transition-shadow duration-200 hover:shadow-lg"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && outfitCount === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No outfits match your selection.</p>
        </div>
      )}
    </div>
  );
};