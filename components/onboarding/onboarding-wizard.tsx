'use client';

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react/dist/esm/icons';
import { WizardStepper } from './wizard-stepper';
import { StepStyleBaseline } from './step-style-baseline';
import { StepCategoryOwnership } from './step-category-ownership';
import { StepSubcategorySelection } from './step-subcategory-selection';
import { getEssentialCategoryKeys } from '@/lib/data/onboarding-categories';
import { generateWardrobeItems } from '@/lib/services/onboarding-generator';
import { ensureCategoriesExist } from '@/lib/services/onboarding-category-manager';
import { persistWardrobeItems } from '@/lib/services/onboarding-persister';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useAuth } from '@/lib/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { WizardState } from '@/lib/types/onboarding';
import { INITIAL_WIZARD_STATE } from '@/lib/types/onboarding';

// Lazy load heavy components that aren't needed immediately
const StepColorsQuantity = lazy(() => import('./step-colors-quantity').then(m => ({ default: m.StepColorsQuantity })));
const StepReview = lazy(() => import('./step-review').then(m => ({ default: m.StepReview })));
const StepSuccess = lazy(() => import('./step-success').then(m => ({ default: m.StepSuccess })));

interface OnboardingWizardProps {
  onComplete?: () => void;
}

const STEP_LABELS = [
  'Style',
  'Categories',
  'Items',
  'Colors',
  'Review',
  'Success',
];

const TOTAL_STEPS = 6;
const SESSION_STORAGE_KEY = 'onboarding-wizard-state';

/**
 * Loading fallback for lazy-loaded step components
 */
function StepLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" aria-hidden="true"></div>
        <p className="text-muted-foreground">Loading step...</p>
      </div>
    </div>
  );
}

/**
 * Load wizard state from session storage
 */
function loadWizardState(): WizardState {
  if (typeof window === 'undefined') {
    return {
      ...INITIAL_WIZARD_STATE,
      selectedCategories: getEssentialCategoryKeys(),
    };
  }

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WizardState;
      // Validate that the stored state has the expected structure
      if (typeof parsed.step === 'number' && parsed.styleBaseline !== undefined) {
        console.log('Loaded wizard state from session storage:', parsed);
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load wizard state from session storage:', error);
  }

  return {
    ...INITIAL_WIZARD_STATE,
    selectedCategories: getEssentialCategoryKeys(),
  };
}

/**
 * Save wizard state to session storage
 */
function saveWizardState(state: WizardState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    console.log('Saved wizard state to session storage:', state);
  } catch (error) {
    console.error('Failed to save wizard state to session storage:', error);
  }
}

/**
 * Clear wizard state from session storage
 */
function clearWizardState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear wizard state from session storage:', error);
  }
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  
  const [wizardState, setWizardState] = useState<WizardState>(() => {
    // Initialize state from session storage on mount
    return loadWizardState();
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark component as hydrated after mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Save wizard state to session storage whenever it changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveWizardState(wizardState);
    }
  }, [wizardState, isHydrated]);

  /**
   * Validate if user can proceed from current step
   * Memoized to avoid recalculation on every render
   */
  const canProceed = useCallback((): boolean => {
    switch (wizardState.step) {
      case 1: // Style Baseline
        return (
          wizardState.styleBaseline.primaryUse !== null &&
          wizardState.styleBaseline.climate !== null
        );
      
      case 2: // Category Ownership
        return wizardState.selectedCategories.length > 0;
      
      case 3: // Subcategory Selection
        return Object.values(wizardState.selectedSubcategories).some(
          subs => subs.length > 0
        );
      
      case 4: // Colors & Quantity
        return Object.values(wizardState.colorQuantitySelections).some(
          selection => selection.colors.length > 0
        );
      
      case 5: // Review
        return wizardState.generatedItems.length > 0;
      
      case 6: // Success
        return true;
      
      default:
        return false;
    }
  }, [wizardState.step, wizardState.styleBaseline, wizardState.selectedCategories, wizardState.selectedSubcategories, wizardState.colorQuantitySelections, wizardState.generatedItems.length]);

  /**
   * Navigate to next step
   * Memoized to prevent unnecessary re-renders
   */
  const goNext = useCallback(async () => {
    if (!canProceed()) {
      return;
    }

    // Generate items before advancing to review step
    if (wizardState.step === 4) {
      setIsLoading(true);
      setError(null);
      
      try {
        const items = generateWardrobeItems(
          wizardState.selectedCategories,
          wizardState.selectedSubcategories,
          wizardState.colorQuantitySelections,
          wizardState.styleBaseline,
          wizardState.itemCapEnabled,
          wizardState.itemCap
        );

        if (items.length === 0) {
          setError('No items were generated. Please check your selections and try again.');
          return;
        }

        setWizardState(prev => ({
          ...prev,
          generatedItems: items,
          step: prev.step + 1,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate items';
        setError(`Unable to generate wardrobe items: ${errorMessage}. Please try again or go back to adjust your selections.`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Normal step advancement
    setWizardState(prev => ({
      ...prev,
      step: prev.step + 1,
    }));
  }, [canProceed, wizardState.step, wizardState.selectedCategories, wizardState.selectedSubcategories, wizardState.colorQuantitySelections, wizardState.styleBaseline, wizardState.itemCapEnabled, wizardState.itemCap]);

  /**
   * Navigate to previous step
   * Memoized to prevent unnecessary re-renders
   */
  const goBack = useCallback(() => {
    if (wizardState.step > 1 && wizardState.step < 6) {
      setWizardState(prev => ({
        ...prev,
        step: prev.step - 1,
      }));
    }
  }, [wizardState.step]);

  /**
   * Handle wizard completion
   * Memoized to prevent unnecessary re-renders
   */
  const handleComplete = useCallback(async () => {
    if (!userId) {
      setError('You must be logged in to create your wardrobe. Please sign in and try again.');
      return;
    }

    if (wizardState.generatedItems.length === 0) {
      setError('No items to save. Please go back and make selections.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Ensure categories exist in database
      const categoryMap = await ensureCategoriesExist(
        userId,
        wizardState.selectedCategories
      );

      // Step 2: Persist wardrobe items
      const result = await persistWardrobeItems(
        userId,
        wizardState.generatedItems,
        categoryMap
      );

      if (result.failed > 0) {
        console.warn(`${result.failed} items failed to save:`, result.errors);
        
        if (result.success === 0) {
          // All items failed
          setError(`Failed to create wardrobe items. ${result.errors[0] || 'Please try again or contact support if the problem persists.'}`);
          return;
        } else {
          // Partial success - show warning but continue
          console.log(`Successfully created ${result.success} items, ${result.failed} failed`);
        }
      }

      // Step 3: Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });

      // Step 4: Clear session storage since wizard is complete
      clearWizardState();

      // Step 5: Redirect directly to wardrobe so users can review imported items.
      router.push('/wardrobe');

      // Call optional completion callback
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(`Failed to create your wardrobe: ${errorMessage}. Please try again or contact support if the problem persists.`);
      console.error('Wardrobe creation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, wizardState.generatedItems, wizardState.selectedCategories, queryClient, onComplete, router]);

  /**
   * Handle redirect after success
   * Memoized to prevent unnecessary re-renders
   */
  const handleRedirect = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  /**
   * Memoized state update handlers to prevent child component re-renders
   */
  const handleStyleBaselineChange = useCallback((styleBaseline: WizardState['styleBaseline']) => {
    setWizardState(prev => ({ ...prev, styleBaseline }));
  }, []);

  const handleCategoriesChange = useCallback((selectedCategories: WizardState['selectedCategories']) => {
    setWizardState(prev => ({ ...prev, selectedCategories }));
  }, []);

  const handleSubcategoriesChange = useCallback((selectedSubcategories: WizardState['selectedSubcategories']) => {
    setWizardState(prev => ({ ...prev, selectedSubcategories }));
  }, []);

  const handleColorQuantityChange = useCallback((colorQuantitySelections: WizardState['colorQuantitySelections']) => {
    setWizardState(prev => ({ ...prev, colorQuantitySelections }));
  }, []);

  const handleItemsUpdate = useCallback((generatedItems: WizardState['generatedItems']) => {
    setWizardState(prev => ({ ...prev, generatedItems }));
  }, []);

  const handleItemCapToggle = useCallback((itemCapEnabled: boolean) => {
    setWizardState(prev => ({ ...prev, itemCapEnabled }));
  }, []);

  /**
   * Render current step component
   * Memoized to prevent unnecessary re-renders
   */
  const renderStep = useMemo(() => {
    switch (wizardState.step) {
      case 1:
        return (
          <StepStyleBaseline
            value={wizardState.styleBaseline}
            onChange={handleStyleBaselineChange}
          />
        );

      case 2:
        return (
          <StepCategoryOwnership
            selectedCategories={wizardState.selectedCategories}
            onChange={handleCategoriesChange}
          />
        );

      case 3:
        return (
          <StepSubcategorySelection
            selectedCategories={wizardState.selectedCategories}
            selectedSubcategories={wizardState.selectedSubcategories}
            onChange={handleSubcategoriesChange}
          />
        );

      case 4:
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <StepColorsQuantity
              selectedCategories={wizardState.selectedCategories}
              selectedSubcategories={wizardState.selectedSubcategories}
              colorQuantitySelections={wizardState.colorQuantitySelections}
              onChange={handleColorQuantityChange}
            />
          </Suspense>
        );

      case 5:
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <StepReview
              items={wizardState.generatedItems}
              onUpdateItems={handleItemsUpdate}
              itemCapEnabled={wizardState.itemCapEnabled}
              onToggleItemCap={handleItemCapToggle}
            />
          </Suspense>
        );

      case 6:
        return (
          <Suspense fallback={<StepLoadingFallback />}>
            <StepSuccess
              totalItems={wizardState.generatedItems.length}
              onViewWardrobe={() => handleRedirect('/wardrobe')}
              onGenerateOutfits={() => handleRedirect('/today')}
            />
          </Suspense>
        );

      default:
        return null;
    }
  }, [
    wizardState.step,
    wizardState.styleBaseline,
    wizardState.selectedCategories,
    wizardState.selectedSubcategories,
    wizardState.colorQuantitySelections,
    wizardState.generatedItems,
    wizardState.itemCapEnabled,
    handleStyleBaselineChange,
    handleCategoriesChange,
    handleSubcategoriesChange,
    handleColorQuantityChange,
    handleItemsUpdate,
    handleItemCapToggle,
    handleRedirect,
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Prevent hydration mismatch by not rendering until client-side hydration is complete */}
      {!isHydrated ? (
        <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" aria-hidden="true"></div>
            <p className="text-muted-foreground">Loading wizard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Stepper */}
          <WizardStepper
            currentStep={wizardState.step}
            totalSteps={TOTAL_STEPS}
            stepLabels={STEP_LABELS}
          />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-6" aria-live="assertive">
              <AlertDescription>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          <main className="mb-8" role="main" aria-label="Onboarding wizard content">
            {renderStep}
          </main>

          {/* Navigation Buttons */}
          {wizardState.step < 6 && (
            <nav className="flex justify-between items-center pt-6 border-t border-border" aria-label="Wizard navigation">
              <button
                type="button"
                onClick={goBack}
                disabled={wizardState.step === 1 || isLoading}
                className="flex items-center gap-2 px-6 py-3 min-h-[44px] border-2 border-border rounded-lg font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground touch-manipulation"
                aria-label="Go back to previous step"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline">Back</span>
                <span className="sm:hidden">Back</span>
              </button>

              {wizardState.step < 5 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canProceed() || isLoading}
                  className="flex items-center gap-2 px-6 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-ring focus:ring-offset-2 touch-manipulation"
                  aria-label="Go to next step"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                      <span className="hidden sm:inline">Generating...</span>
                      <span className="sm:hidden">Wait...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={!canProceed() || isLoading}
                  className="px-6 py-3 min-h-[44px] bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center gap-2 touch-manipulation"
                  aria-label="Create your wardrobe"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                      <span className="hidden sm:inline">Creating Wardrobe...</span>
                      <span className="sm:hidden">Creating...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Create Wardrobe</span>
                      <span className="sm:hidden">Create</span>
                    </>
                  )}
                </button>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
