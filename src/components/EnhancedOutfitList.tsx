/**
 * Enhanced OutfitList with Suspense boundaries and error recovery
 * Provides comprehensive error handling for outfit loading and generation
 */

import React from 'react';
import { OutfitSuspenseBoundary } from './SuspenseErrorBoundary';
import { OutfitList } from './OutfitList';
import { GeneratedOutfit } from '../types';

interface EnhancedOutfitListProps {
  outfits: GeneratedOutfit[];
  onOutfitSelect: (outfit: GeneratedOutfit) => void;
  className?: string;
  isLoading?: boolean;
  enableFlip?: boolean;
  onError?: (error: Error) => void;
  onRetry?: () => void;
  onShowAlternatives?: () => void;
  onTryDifferentAnchor?: () => void;
}

/**
 * OutfitList wrapped with enhanced Suspense boundaries and error recovery
 */
export const EnhancedOutfitList: React.FC<EnhancedOutfitListProps> = ({
  outfits,
  onOutfitSelect,
  className = '',
  isLoading = false,
  enableFlip = false,
  onError,
  onRetry,
  onShowAlternatives,
  onTryDifferentAnchor
}) => {
  const handleError = (error: Error, feature: string) => {
    console.error(`Outfit list error in ${feature}:`, error);
    onError?.(error);
  };

  const handleRetry = (feature: string) => {
    console.log(`Retrying ${feature} feature`);
    onRetry?.();
  };

  // Create a unique key based on outfits to reset error boundary when outfits change
  const outfitsKey = `${outfits.length}-${outfits.map(o => o.id).join(',')}`;

  return (
    <OutfitSuspenseBoundary
      className={className}
      onError={handleError}
      onRetry={handleRetry}
      resetKeys={[outfitsKey]}
    >
      <OutfitListWithErrorHandling
        outfits={outfits}
        onOutfitSelect={onOutfitSelect}
        className={className}
        isLoading={isLoading}
        enableFlip={enableFlip}
        onShowAlternatives={onShowAlternatives}
        onTryDifferentAnchor={onTryDifferentAnchor}
      />
    </OutfitSuspenseBoundary>
  );
};

// Internal component that can throw errors to be caught by Suspense boundary
const OutfitListWithErrorHandling: React.FC<{
  outfits: GeneratedOutfit[];
  onOutfitSelect: (outfit: GeneratedOutfit) => void;
  className?: string;
  isLoading?: boolean;
  enableFlip?: boolean;
  onShowAlternatives?: () => void;
  onTryDifferentAnchor?: () => void;
}> = ({ 
  outfits, 
  onOutfitSelect, 
  className, 
  isLoading, 
  enableFlip,
  onShowAlternatives,
  onTryDifferentAnchor
}) => {
  // Enhanced outfit selection handler with error recovery
  const handleOutfitSelect = (outfit: GeneratedOutfit) => {
    try {
      onOutfitSelect(outfit);
    } catch (error) {
      // Emit custom events for error recovery
      if (onShowAlternatives) {
        window.dispatchEvent(new CustomEvent('showOutfitAlternatives'));
      }
      if (onTryDifferentAnchor) {
        window.dispatchEvent(new CustomEvent('tryDifferentAnchor'));
      }
      throw error; // Re-throw to be caught by error boundary
    }
  };

  return (
    <OutfitList
      outfits={outfits}
      onOutfitSelect={handleOutfitSelect}
      className={className}
      isLoading={isLoading}
      enableFlip={enableFlip}
    />
  );
};

export default EnhancedOutfitList;