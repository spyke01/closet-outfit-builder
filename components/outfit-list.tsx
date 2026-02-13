'use client';

import React from 'react';
import { ScoreCircle } from './score-circle';
import { convertOutfitToSelection, canGenerateScoreBreakdown } from '@/lib/utils/outfit-conversion';
import { type Outfit } from '@/lib/types/database';

interface OutfitListProps {
  outfits: Outfit[];
  onOutfitSelect: (outfit: Outfit) => void;
  enableErrorBoundary?: boolean;
  onError?: (error: Error) => void;
}

export const OutfitList: React.FC<OutfitListProps> = ({
  outfits,
  onOutfitSelect,
  enableErrorBoundary = false,
  onError
}) => {
  // Use outfits directly since they're already typed
  const validatedOutfits = React.useMemo(() => {
    return outfits || [];
  }, [outfits]);

  const handleOutfitSelect = (outfit: Outfit) => {
    try {
      onOutfitSelect(outfit);
    } catch (error) {
      console.error('Error selecting outfit:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  };

  if (validatedOutfits.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground text-sm">
          No matching outfits found. Try adjusting your selection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Matching Outfits ({validatedOutfits.length})
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {validatedOutfits.map((outfit) => (
          <button
            key={outfit.id}
            onClick={() => handleOutfitSelect(outfit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOutfitSelect(outfit);
              }
            }}
            className="p-3 border border-border rounded-lg hover:border-border hover:shadow-sm transition-[border-color,box-shadow] text-left bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Select outfit: ${outfit.name || 'Untitled Outfit'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-foreground truncate">
                {outfit.name || 'Untitled Outfit'}
              </h4>
              {typeof outfit.score === 'number' && (
                <ScoreCircle
                  score={outfit.score}
                  size="sm"
                  showLabel={false}
                  outfit={canGenerateScoreBreakdown(outfit) ? (() => {
                    const selection = convertOutfitToSelection(outfit);
                    return selection ? {
                      ...selection,
                      tuck_style: selection.tuck_style || 'Untucked'
                    } as any : undefined;
                  })() : undefined}
                />
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{outfit.source === 'curated' ? 'Curated' : 'Generated'}</span>
              {outfit.tuck_style && (
                <>
                  <span>•</span>
                  <span>{outfit.tuck_style}</span>
                </>
              )}
              {outfit.loved && (
                <>
                  <span>•</span>
                  <span className="text-red-500">♥</span>
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
