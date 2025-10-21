'use client';

import React, { useState, useCallback } from 'react';
import { RotateCcw, Heart } from 'lucide-react';

import { safeValidate } from '@/lib/utils/validation';
import { OutfitSelectionSchema, type OutfitSelection } from '@/lib/schemas';
import { ScoreCircle, type ScoreBreakdownData } from './score-circle';
import { OutfitVisualLayout } from './outfit-visual-layout';
import { WardrobeItem } from '@/lib/types/database';

interface OutfitCardProps {
  outfit: OutfitSelection;
  variant?: 'compact' | 'detailed';
  showScore?: boolean;
  score?: number;
  scoreBreakdown?: ScoreBreakdownData;
  enableFlip?: boolean;
  defaultFlipped?: boolean;
  onFlipChange?: (isFlipped: boolean) => void;
  onLove?: () => void;
  isLoved?: boolean;
  className?: string;
  // Additional props for visual layout
  outfitItems?: WardrobeItem[]; // Array of wardrobe items for visual layout
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
  outfit,
  variant = 'compact',
  showScore = false,
  score = 0,
  scoreBreakdown,
  enableFlip = false,
  defaultFlipped = false,
  onFlipChange,
  onLove,
  isLoved = false,
  className = '',
  outfitItems = []
}) => {
  const [isFlipped, setIsFlipped] = useState(defaultFlipped);

  // Validate outfit with Zod
  const validatedOutfit = React.useMemo(() => {
    const validation = safeValidate(OutfitSelectionSchema, outfit);
    if (!validation.success) {
      console.warn('Invalid outfit:', validation.error);
      return {} as OutfitSelection;
    }
    
    return validation.data;
  }, [outfit]);

  // Handle flip toggle
  const handleFlip = useCallback(() => {
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    if (onFlipChange) {
      onFlipChange(newFlipped);
    }
  }, [isFlipped, onFlipChange]);

  // Format item name
  const formatItemName = (item: any): string => {
    if (!item) return '';
    if (item.brand) {
      return `${item.brand} ${item.name}`;
    }
    return item.name;
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Render outfit items
  const renderOutfitItems = () => {
    const items = [
      { key: 'jacket', label: 'Jacket', item: validatedOutfit.jacket },
      { key: 'shirt', label: 'Shirt', item: validatedOutfit.shirt },
      { key: 'pants', label: 'Pants', item: validatedOutfit.pants },
      { key: 'shoes', label: 'Shoes', item: validatedOutfit.shoes },
      { key: 'belt', label: 'Belt', item: validatedOutfit.belt },
      { key: 'watch', label: 'Watch', item: validatedOutfit.watch },
    ].filter(({ item }) => item);

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No items selected
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map(({ key, label, item }) => (
          <div key={key} className="flex items-center gap-3">
            {/* Item image or placeholder */}
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
              {item?.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-md" />
              )}
            </div>
            
            {/* Item details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {formatItemName(item)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {label}
              </p>
              {item?.color && (
                <div className="flex items-center gap-1 mt-1">
                  <div 
                    className="w-2 h-2 rounded-full border border-slate-300 dark:border-slate-600"
                    style={{ backgroundColor: item.color.toLowerCase() }}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.color}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render visual layout view
  const renderVisualLayout = () => {
    if (outfitItems.length === 0) {
      return (
        <div className="bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-40 bg-slate-200 dark:bg-slate-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                No Visual Items
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Add images to wardrobe items to see visual layout
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-center">
        <OutfitVisualLayout
          items={outfitItems}
          size={variant === 'compact' ? 'small' : 'medium'}
        />
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-stone-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-slate-800 dark:text-slate-200">
              {variant === 'detailed' ? 'Current Outfit' : 'Outfit'}
            </h3>
            {showScore && (
              <ScoreCircle
                score={score}
                size="sm"
                showLabel={false}
                outfit={validatedOutfit}
                breakdown={scoreBreakdown}
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onLove && (
              <button
                onClick={onLove}
                className={`p-2 rounded-lg transition-colors ${
                  isLoved 
                    ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
                aria-label={isLoved ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={16} fill={isLoved ? 'currentColor' : 'none'} />
              </button>
            )}
            
            {enableFlip && (
              <button
                onClick={handleFlip}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                aria-label={isFlipped ? 'Show item list' : 'Show mockup view'}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>
        
        {validatedOutfit.tuck_style && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Style: {validatedOutfit.tuck_style}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {enableFlip && isFlipped ? renderVisualLayout() : renderOutfitItems()}
      </div>
    </div>
  );
};