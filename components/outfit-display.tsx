'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Shirt, RefreshCw, Loader2, Heart, Save } from 'lucide-react';
import { z } from 'zod';
import { produce } from 'immer';
import { useImmerState } from '@/lib/utils/immer-state';
import { safeValidate } from '@/lib/utils/validation';
import { 
  OutfitSelectionSchema, 
  OutfitSchema
} from '@/lib/schemas';
import { type OutfitSelection, type Outfit } from '@/lib/types/database';
import { OutfitCard } from './outfit-card';
import { ScoreCircle, type ScoreBreakdownData } from './score-circle';

// Outfit display state schema
const OutfitDisplayStateSchema = z.object({
  isTransitioning: z.boolean(),
  isSaving: z.boolean(),
  saveError: z.string().nullable(),
  isInMockupView: z.boolean(),
});

type OutfitDisplayState = z.infer<typeof OutfitDisplayStateSchema>;

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
  // Database integration props
  userId?: string;
  onSaveOutfit?: (outfit: Omit<Outfit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  isGenerating?: boolean;
  generationError?: Error | null;
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
  onMockupViewChange,
  userId,
  onSaveOutfit,
  isGenerating = false,
  generationError = null
}) => {
  // Immer-based state management
  const [state, updateState] = useImmerState<OutfitDisplayState>({
    isTransitioning: false,
    isSaving: false,
    saveError: null,
    isInMockupView: isInMockupView,
  });

  // Validate selection with Zod
  const validatedSelection = useMemo(() => {
    const validation = safeValidate(OutfitSelectionSchema, selection);
    if (!validation.success) {
      console.warn('Invalid selection:', validation.error);
      return {} as OutfitSelection;
    }
    
    return validation.data;
  }, [selection]);

  // Check if outfit is complete
  const hasCompleteOutfit = useMemo(() => {
    return (validatedSelection.shirt || validatedSelection.undershirt) && 
           validatedSelection.pants;
  }, [validatedSelection]);

  // Check if any items are selected
  const hasAnyItems = useMemo(() => {
    return Object.entries(validatedSelection)
      .some(([key, value]) => key !== 'tuck_style' && key !== 'score' && value !== null && value !== undefined);
  }, [validatedSelection]);

  // Calculate outfit score and breakdown
  const { outfitScore, scoreBreakdown } = useMemo(() => {
    if (!hasCompleteOutfit) return { outfitScore: 0, scoreBreakdown: undefined };
    
    // Basic scoring logic - can be enhanced with actual scoring algorithm
    const items = Object.entries(validatedSelection)
      .filter(([key, value]) => value && key !== 'tuck_style' && key !== 'loved')
      .map(([key, item]) => ({ key, item: item as any }));
    
    let score = items.length * 15; // Base score per item
    
    // Bonus for complete outfit
    if (validatedSelection.shirt && validatedSelection.pants && validatedSelection.shoes) {
      score += 25;
    }
    
    // Bonus for accessories
    if (validatedSelection.belt) score += 10;
    if (validatedSelection.watch) score += 10;
    
    // Formality matching bonus
    const formalityScores = items
      .map(({ item }) => item?.formality_score || 5)
      .filter((score): score is number => typeof score === 'number');
    
    const avgFormality = formalityScores.length > 0 
      ? formalityScores.reduce((a, b) => a + b, 0) / formalityScores.length 
      : 5;
    
    const variance = formalityScores.length > 1
      ? formalityScores.reduce((acc, score) => acc + Math.pow(score - avgFormality, 2), 0) / formalityScores.length
      : 0;
    
    let consistencyBonus = 0;
    if (variance < 2) {
      score += 15;
      consistencyBonus = 15;
    } else if (variance < 4) {
      score += 10;
      consistencyBonus = 10;
    }
    
    const finalScore = Math.min(score, 100);
    
    // Create detailed breakdown
    const breakdown: ScoreBreakdownData = {
      formalityScore: Math.round(avgFormality * 10),
      formalityWeight: 0.7,
      consistencyBonus,
      consistencyWeight: 0.3,
      layerAdjustments: items.map(({ key, item }) => ({
        itemId: item?.id || key,
        itemName: item?.name || key,
        category: key,
        originalScore: item?.formality_score || 5,
        adjustedScore: item?.formality_score || 5,
        weight: 1.0,
        reason: 'visible' as const
      })),
      total: finalScore,
      percentage: finalScore
    };
    
    return { outfitScore: finalScore, scoreBreakdown: breakdown };
  }, [validatedSelection, hasCompleteOutfit]);

  // Enhanced randomize handler with error recovery
  const handleRandomize = useCallback(() => {
    try {
      // Show transition state
      updateState(draft => {
        draft.isTransitioning = true;
      });
      
      // Add a small delay to show the loading state before changing
      setTimeout(() => {
        // Call the original onRandomize to update the selection state
        onRandomize();
        
        // Hide transition state after a brief moment
        setTimeout(() => {
          updateState(draft => {
            draft.isTransitioning = false;
          });
        }, 100);
      }, 200);
    } catch (error) {
      console.error('Failed to generate random outfit:', error);
      updateState(draft => {
        draft.isTransitioning = false;
      });
      
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
  }, [onRandomize, onError, onShowAlternatives, onTryDifferentAnchor, updateState]);

  // Handle saving outfit to database
  const handleSaveOutfit = useCallback(async () => {
    if (!onSaveOutfit || !hasCompleteOutfit || !userId) return;

    updateState(draft => {
      draft.isSaving = true;
      draft.saveError = null;
    });

    try {
      // Create outfit data
      const outfitData = {
        name: `Outfit ${new Date().toLocaleDateString()}`,
        score: outfitScore,
        tuck_style: validatedSelection.tuck_style || 'Untucked',
        weight: 1,
        loved: false,
        source: 'generated' as const,
      };

      // Validate outfit data
      const validation = safeValidate(OutfitSchema.omit({ 
        id: true, 
        user_id: true, 
        created_at: true, 
        updated_at: true 
      }), outfitData);

      if (!validation.success) {
        throw new Error(`Invalid outfit data: ${validation.error}`);
      }

      // Convert null values to undefined for compatibility
      const outfitForSave = {
        ...validation.data,
        name: validation.data.name ?? undefined,
        score: validation.data.score ?? undefined,
        tuck_style: validation.data.tuck_style ?? undefined,
      };
      
      await onSaveOutfit(outfitForSave);
      
      // Show success feedback
      updateState(draft => {
        draft.isSaving = false;
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save outfit';
      updateState(draft => {
        draft.isSaving = false;
        draft.saveError = errorMessage;
      });
      
      if (onError) {
        onError(error as Error);
      }
    }
  }, [onSaveOutfit, hasCompleteOutfit, userId, outfitScore, validatedSelection, updateState, onError]);

  // Handle mockup view toggle
  const handleMockupViewChange = useCallback((isInMockup: boolean) => {
    updateState(draft => {
      draft.isInMockupView = isInMockup;
    });
    
    if (onMockupViewChange) {
      onMockupViewChange(isInMockup);
    }
  }, [onMockupViewChange, updateState]);

  // Enhanced error handling functions
  const handleError = useCallback((error: Error, feature: string) => {
    console.error(`Outfit display error in ${feature}:`, error);
    onError?.(error);
  }, [onError]);

  const handleRetry = useCallback((feature: string) => {
    console.log(`Retrying ${feature} feature`);
    onRetry?.();
  }, [onRetry]);

  // Create a unique key based on selection to reset error boundary when selection changes
  const selectionKey = useMemo(() => {
    return `${validatedSelection.shirt?.id || 'none'}-${validatedSelection.pants?.id || 'none'}-${validatedSelection.shoes?.id || 'none'}`;
  }, [validatedSelection]);

  // Main content component
  const OutfitContent = () => {
    if (!hasAnyItems) {
      return (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center max-w-md w-full">
            <Shirt size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-light text-slate-600 dark:text-slate-400 mb-2">
              Start Building Your Look
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm sm:text-base">
              Select a category above to begin composing your outfit, or use Randomize for instant inspiration.
            </p>
            <button
              onClick={handleRandomize}
              disabled={isGenerating || state.isTransitioning}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors mx-auto min-h-[44px] w-full sm:w-auto"
            >
              {(isGenerating || state.isTransitioning) ? (
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
            {(isGenerating || state.isTransitioning) && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="animate-spin text-slate-600 dark:text-slate-300" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Generating new outfit...</p>
                </div>
              </div>
            )}
            <OutfitCard
              outfit={validatedSelection as any}
              variant="detailed"
              showScore={hasAnyItems}
              score={outfitScore}
              scoreBreakdown={scoreBreakdown}
              enableFlip={true}
              defaultFlipped={state.isInMockupView}
              onFlipChange={handleMockupViewChange}
            />
          </div>

          {/* Validation messages */}
          {hasAnyItems && !hasCompleteOutfit && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                Add a shirt and pants to complete your outfit and enable saving.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 sm:mt-8 space-y-3">
            {/* Primary action - Randomize */}
            <div className="text-center">
              <button
                onClick={handleRandomize}
                disabled={isGenerating || state.isTransitioning}
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors mx-auto min-h-[44px] w-full sm:w-auto"
              >
                {(isGenerating || state.isTransitioning) ? (
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
            </div>

            {/* Secondary actions */}
            {onSaveOutfit && userId && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleSaveOutfit}
                  disabled={state.isSaving || !hasCompleteOutfit}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {state.isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Outfit
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Error messages */}
            {(generationError || state.saveError) && (
              <div className="text-center">
                {generationError && (
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    Generation error: {generationError.message}
                  </p>
                )}
                {state.saveError && (
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    Save error: {state.saveError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Conditionally wrap with error boundary
  if (enableErrorBoundary) {
    return (
      <div key={selectionKey}>
        <OutfitContent />
      </div>
    );
  }

  return <OutfitContent />;
};