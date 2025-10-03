import React, { useState } from 'react';
import { Shirt, RefreshCw, Loader2 } from 'lucide-react';
import { OutfitSelection } from '../types';
import { OutfitCard } from './OutfitCard';
import { useOutfitEngine } from '../hooks/useOutfitEngine';
import { calculateOutfitScore } from '../utils/scoring';
import { OutfitSuspenseBoundary } from './SuspenseErrorBoundary';

interface OutfitDisplayProps {
  selection: OutfitSelection;
  onRandomize: () => void;
  // Enhanced error handling props
  onError?: (error: Error) => void;
  onRetry?: () => void;
  onShowAlternatives?: () => void;
  onTryDifferentAnchor?: () => void;
  // Enhanced functionality props
  enableErrorBoundary?: boolean;
  // Mockup view state props
  isInMockupView?: boolean;
  onMockupViewChange?: (isInMockupView: boolean) => void;
}

export const OutfitDisplay: React.FC<OutfitDisplayProps> = ({ 
  selection, 
  onRandomize,
  onError,
  onRetry,
  onShowAlternatives,
  onTryDifferentAnchor,
  enableErrorBoundary = false,
  isInMockupView = false,
  onMockupViewChange
}) => {
  const { getRandomOutfit, isGenerating, generationError } = useOutfitEngine();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasCompleteOutfit = (selection.shirt || selection.undershirt) && selection.pants && selection.shoes;
  const outfitScore = hasCompleteOutfit ? calculateOutfitScore(selection).percentage : 0;

  // Enhanced randomize handler with error recovery
  const handleRandomize = () => {
    try {
      // Show transition state
      setIsTransitioning(true);
      
      // Add a small delay to show the loading state before changing
      setTimeout(() => {
        // Call the original onRandomize to update the selection state
        onRandomize();
        
        // Hide transition state after a brief moment
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100);
      }, 200);
    } catch (error) {
      console.error('Failed to generate random outfit:', error);
      setIsTransitioning(false);
      
      // Enhanced error handling
      if (onError) {
        onError(error as Error);
      }
      
      // Emit custom events for error recovery
      if (onShowAlternatives) {
        window.dispatchEvent(new CustomEvent('showOutfitAlternatives'));
      }
      if (onTryDifferentAnchor) {
        window.dispatchEvent(new CustomEvent('tryDifferentAnchor'));
      }
    }
  };

  // Enhanced error handling functions
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

  // Main content component
  const OutfitContent = () => {
    if (!hasCompleteOutfit) {
      return (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center max-w-md w-full">
            <Shirt size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-light text-slate-600 mb-2">
              Start Building Your Look
            </h3>
            <p className="text-slate-500 mb-6 text-sm sm:text-base">
              Select a category above to begin composing your outfit, or use Randomize for instant inspiration.
            </p>
            <button
              onClick={handleRandomize}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors mx-auto min-h-[44px] w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Get Random Outfit
                </>
              )}
            </button>
            {generationError && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-2 text-center">
                {generationError.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            {(isGenerating || isTransitioning) && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="animate-spin text-slate-600 dark:text-slate-300" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Generating new outfit...</p>
                </div>
              </div>
            )}
            <OutfitCard
              outfit={selection}
              variant="detailed"
              showScore={true}
              score={outfitScore}
              enableFlip={true}
              defaultFlipped={isInMockupView}
              onFlipChange={onMockupViewChange}
            />
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <button
              onClick={handleRandomize}
              disabled={isGenerating || isTransitioning}
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors mx-auto min-h-[44px] w-full sm:w-auto"
            >
              {(isGenerating || isTransitioning) ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Try Another Combination
                </>
              )}
            </button>
            {generationError && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-2 text-center">
                {generationError.message}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Conditionally wrap with error boundary
  if (enableErrorBoundary) {
    return (
      <OutfitSuspenseBoundary
        onError={handleError}
        onRetry={handleRetry}
        resetKeys={[selectionKey]}
      >
        <OutfitContent />
      </OutfitSuspenseBoundary>
    );
  }

  return <OutfitContent />;
};