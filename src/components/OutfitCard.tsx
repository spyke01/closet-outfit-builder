import React, { useState } from 'react';
import { RotateCcw, Eye, AlertTriangle, Heart } from 'lucide-react';
import { OutfitSelection, GeneratedOutfit } from '../types';
import { ScoreCircle } from './ScoreCircle';
import { ColorCircle } from './ColorCircle';
import { OutfitLayout } from './OutfitLayout';
import { useSettings } from '../contexts/SettingsContext';
import { formatItemName } from '../utils/itemUtils';
import { createInteractiveProps } from '../utils/accessibilityUtils';

interface OutfitCardProps {
  outfit: OutfitSelection | GeneratedOutfit;
  variant?: 'detailed' | 'compact';
  showScore?: boolean;
  showSource?: boolean;
  score?: number;
  className?: string;
  onClick?: () => void;
  enableFlip?: boolean;
  defaultFlipped?: boolean;
  onFlipChange?: (isFlipped: boolean) => void;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
  outfit,
  variant = 'compact',
  showScore = true,
  showSource = false,
  score: propScore,
  className = '',
  onClick,
  enableFlip = false,
  defaultFlipped = false,
  onFlipChange
}) => {
  const { settings } = useSettings();
  const isGenerated = 'source' in outfit;
  const score = propScore !== undefined ? propScore : (isGenerated ? outfit.score : 0);
  const [isFlipped, setIsFlipped] = useState(defaultFlipped);
  const [isLoading, setIsLoading] = useState(false);

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!enableFlip) return;
    
    setIsLoading(true);
    const newFlippedState = !isFlipped;
    setIsFlipped(newFlippedState);
    
    // Notify parent component about the flip state change
    if (onFlipChange) {
      onFlipChange(newFlippedState);
    }
    
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const handleCardClick = () => {
    if (onClick && !enableFlip) {
      onClick();
    }
  };

  const ItemRow: React.FC<{
    label: string;
    value?: string;
    showColor?: boolean;
  }> = ({ label, value, showColor = false }) => {
    if (!value) return null;

    return (
      <div className="flex justify-between items-center py-1">
        <span className="outfit-card-compact-text text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="outfit-card-compact-text-medium text-slate-800 dark:text-slate-200 text-right">
            {value}
          </span>
          {showColor && <ColorCircle itemName={value} size="sm" />}
        </div>
      </div>
    );
  };

  const coreItems = [
    { label: 'Jacket/Overshirt', value: outfit.jacket ? formatItemName(outfit.jacket, settings.showBrand) : undefined, showColor: true },
    { label: 'Shirt', value: outfit.shirt ? formatItemName(outfit.shirt, settings.showBrand) : undefined, showColor: true },
    { label: 'Undershirt', value: outfit.undershirt ? formatItemName(outfit.undershirt, settings.showBrand) : undefined, showColor: true },
    { label: 'Pants', value: outfit.pants ? formatItemName(outfit.pants, settings.showBrand) : undefined, showColor: true },
    { label: 'Shoes', value: outfit.shoes ? formatItemName(outfit.shoes, settings.showBrand) : undefined, showColor: true }
  ];

  const accessories = [
    { label: 'Belt', value: outfit.belt ? formatItemName(outfit.belt, settings.showBrand) : undefined, showColor: true },
    { label: 'Watch', value: outfit.watch ? formatItemName(outfit.watch, settings.showBrand) : undefined, showColor: false },
    { label: 'Style', value: outfit.tuck, showColor: false }
  ];

  const hasAccessories = accessories.some(item => item.value);

  if (variant === 'detailed') {
    return (
      <div className={`responsive-card ${className}`}>
        <div className="outfit-card rounded-2xl shadow-sm border p-4 md:p-6 lg:p-8">
          <div className="text-center mb-4 md:mb-6 lg:mb-8">
            <div className="responsive-card-content mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-light text-slate-800 dark:text-slate-200">
                    Your Curated Outfit
                  </h3>
                  {outfit.loved && (
                    <Heart size={16} className="md:w-5 md:h-5 text-red-500 fill-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {outfit.loved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <Heart size={10} className="fill-current" />
                      Loved
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Curated
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
                  A carefully composed outfit ready to wear
                </p>
              </div>
              {showScore && (
                <div className="mt-4 sm:mt-0">
                  <ScoreCircle score={score} size="lg" outfit={outfit} />
                </div>
              )}
            </div>
            
            {enableFlip && (
              <button
                onClick={handleFlip}
                className="inline-flex items-center gap-2 px-3 py-2 md:px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                disabled={isLoading}
              >
                <Eye size={14} className="md:w-4 md:h-4" />
                {isLoading ? 'Loading...' : (isFlipped ? 'Back to Details' : 'View Mockup')}
              </button>
            )}
          </div>

          {!isFlipped && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2 md:space-y-4">
                <h4 className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-slate-200 dark:border-slate-600 pb-2">
                  Core Pieces
                </h4>
                {coreItems.map(item => (
                  <ItemRow
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    showColor={item.showColor}
                  />
                ))}
              </div>

              <div className="space-y-2 md:space-y-4">
                <h4 className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-slate-200 dark:border-slate-600 pb-2">
                  Finishing Touches
                </h4>
                {accessories.map(item => (
                  <ItemRow
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    showColor={item.showColor}
                  />
                ))}
              </div>
            </div>
          )}

          {isFlipped && enableFlip && (
            <div className="flex justify-center items-center min-h-[200px] md:min-h-[300px] lg:min-h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <OutfitLayout 
                  selection={outfit} 
                  size="large"
                  className="mx-auto"
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact variant with container queries
  return (
    <div className={`responsive-card ${className}`}>
      <div
        className="outfit-card-compact rounded-xl p-3 md:p-4 lg:p-5 border cursor-pointer"
        {...createInteractiveProps(handleCardClick, 'Select outfit', 'button')}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {enableFlip && (
              <button
                onClick={handleFlip}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors outfit-card-compact-text-medium"
                disabled={isLoading}
              >
                <Eye size={10} />
                {isLoading ? 'Loading...' : (isFlipped ? 'Back' : 'View')}
              </button>
            )}
            
            {showSource && (
              <div className="flex items-center gap-2">
                {outfit.loved ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full outfit-card-compact-text-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <Heart size={8} className="fill-current" />
                    Loved
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full outfit-card-compact-text-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {isGenerated && outfit.source === 'curated' ? 'Curated' : 'Generated'}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {showScore && <ScoreCircle score={score} size="sm" showLabel={false} outfit={outfit} />}
        </div>

        {!isFlipped && (
          <div className="space-y-1.5 flex-1">
            {coreItems.map(item => (
              <ItemRow
                key={item.label}
                label={item.label}
                value={item.value}
                showColor={item.showColor}
              />
            ))}

            {hasAccessories && (
              <div className="border-t border-slate-300 dark:border-slate-600 pt-1.5 mt-1.5">
                {accessories.map(item => (
                  <ItemRow
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    showColor={item.showColor}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {isFlipped && enableFlip && (
          <div className="flex justify-center items-center min-h-[120px] md:min-h-[160px] lg:min-h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 md:h-6 md:w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <OutfitLayout 
                selection={outfit} 
                size="small"
                className="mx-auto"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};