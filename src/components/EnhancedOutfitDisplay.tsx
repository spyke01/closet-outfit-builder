/**
 * Enhanced OutfitDisplay with Suspense boundaries and error recovery
 * Provides comprehensive error handling for outfit generation
 */

import React from 'react';
import { OutfitSuspenseBoundary } from './SuspenseErrorBoundary';
import { OutfitDisplay } from './OutfitDisplay';
import { OutfitSelection } from '../types';

interface EnhancedOutfitDisplayProps {
  selection: OutfitSelection;
  onRandomize: () => void;
  onError?: (error: Error) => void;
  onRetry?: () => void;
  onShowAlternatives?: () => void;
  onTryDifferentAnchor?: () => void;
}

/**
 * OutfitDisplay wrapped with enhanced Suspense boundaries and error recovery
 */
export const EnhancedOutfitDisplay: React.FC<EnhancedOutfitDisplayProps> = ({
  selection,
  onRandomize,
  onError,
  onRetry,
  onShowAlternatives,
  onTryDifferentAnchor
}) => {
  const handleError = (error: Error, feature: string) => {
    console.error(`Outfit display error in ${feature}:`, error);
    onError?.(error);
  };

  const handleRetry = (feature: string) => {
    console.log(`Retrying ${feature} feature`);
    onRetry?.();
  };

  // Create a unique key based on selection to reset error boundary when selection changes
  const selectionKey = `${selection.shirt?.id || 'none'}-${selection.pants?.id || 'none'}-${selection.shoes?.id || 'none'}`;

  return (
    <OutfitSuspenseBoundary
      onError={handleError}
      onRetry={handleRetry}
      resetKeys={[selectionKey]}
    >
      <OutfitDisplayWithErrorHandling
        selection={selection}
        onRandomize={onRandomize}
        onShowAlternatives={onShowAlternatives}
        onTryDifferentAnchor={onTryDifferentAnchor}
      />
    </OutfitSuspenseBoundary>
  );
};

// Internal component that can throw errors to be caught by Suspense boundary
const OutfitDisplayWithErrorHandling: React.FC<{
  selection: OutfitSelection;
  onRandomize: () => void;
  onShowAlternatives?: () => void;
  onTryDifferentAnchor?: () => void;
}> = ({ selection, onRandomize, onShowAlternatives, onTryDifferentAnchor }) => {
  // Enhanced randomize handler with error recovery options
  const handleRandomize = async () => {
    try {
      onRandomize();
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
    <OutfitDisplay
      selection={selection}
      onRandomize={handleRandomize}
    />
  );
};

export default EnhancedOutfitDisplay;