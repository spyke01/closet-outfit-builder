'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { z } from 'zod';
import { produce } from 'immer';
import { useImmerState } from '@/lib/utils/immer-state';
import { safeValidate } from '@/lib/utils/validation';
import { 
  OutfitSelectionSchema, 
  WardrobeItemSchema,
  type OutfitSelection,
  type WardrobeItem
} from '@/lib/schemas';
import { CategoryDropdown } from './category-dropdown';
import { OutfitList } from './outfit-list';

// Selection strip state schema
const SelectionStripStateSchema = z.object({
  selection: OutfitSelectionSchema,
  loadingCategories: z.set(z.string()),
  error: z.string().nullable(),
  debouncedSelection: OutfitSelectionSchema,
});

type SelectionStripState = z.infer<typeof SelectionStripStateSchema>;

interface SelectionStripProps {
  selection: OutfitSelection;
  anchorItem: WardrobeItem | null;
  onSelectionChange: (category: string, item: WardrobeItem | null) => void;
  onOutfitSelect: (outfit: any) => void;
  // Enhanced props for database integration
  userId?: string;
  onScoreUpdate?: (score: number) => void;
  enableRealTimeUpdates?: boolean;
}

export const SelectionStrip: React.FC<SelectionStripProps> = ({
  selection,
  anchorItem,
  onSelectionChange,
  onOutfitSelect,
  userId,
  onScoreUpdate,
  enableRealTimeUpdates = false
}) => {
  // Immer-based state management
  const [state, updateState] = useImmerState<SelectionStripState>({
    selection,
    loadingCategories: new Set(),
    error: null,
    debouncedSelection: selection,
  });

  const debounceTimeoutRef = useRef<number | null>(null);

  // Validate props with Zod
  const validatedAnchorItem = useMemo(() => {
    if (!anchorItem) return null;
    
    const validation = safeValidate(WardrobeItemSchema, anchorItem);
    if (!validation.success) {
      console.warn('Invalid anchor item:', validation.error);
      return null;
    }
    
    return validation.data;
  }, [anchorItem]);

  const validatedSelection = useMemo(() => {
    const validation = safeValidate(OutfitSelectionSchema, selection);
    if (!validation.success) {
      console.warn('Invalid selection:', validation.error);
      return {} as OutfitSelection;
    }
    
    return validation.data;
  }, [selection]);

  // Debounce selection changes for performance
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      updateState(draft => {
        draft.debouncedSelection = validatedSelection;
      });
    }, 150);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [validatedSelection, updateState]);

  // Update state when selection prop changes
  useEffect(() => {
    updateState(draft => {
      draft.selection = validatedSelection;
    });
  }, [validatedSelection, updateState]);

  // Define the five main categories for dropdowns in layering hierarchy order
  const categories = useMemo(() => [
    { category: 'Jacket/Overshirt', key: 'jacket' as keyof OutfitSelection },
    { category: 'Shirt', key: 'shirt' as keyof OutfitSelection },
    { category: 'Undershirt', key: 'undershirt' as keyof OutfitSelection },
    { category: 'Pants', key: 'pants' as keyof OutfitSelection },
    { category: 'Shoes', key: 'shoes' as keyof OutfitSelection },
  ], []);

  // Enhanced selection change handler with progressive filtering and error handling
  const handleSelectionChange = useCallback(async (category: string, item: WardrobeItem | null) => {
    try {
      // Clear any existing errors
      updateState(draft => {
        draft.error = null;
        draft.loadingCategories.add(category);
      });

      // Validate the item if provided
      if (item) {
        const itemValidation = safeValidate(WardrobeItemSchema, item);
        if (!itemValidation.success) {
          throw new Error(`Invalid item data: ${itemValidation.error}`);
        }
      }

      // Create a test selection to validate before applying
      const testSelection = produce(state.selection, draft => {
        const key = categories.find(c => c.category === category)?.key;
        if (key) {
          if (item) {
            (draft as any)[key] = item;
          } else {
            delete (draft as any)[key];
          }
        }
      });

      // Validate the new selection
      const selectionValidation = safeValidate(OutfitSelectionSchema, testSelection);
      if (!selectionValidation.success) {
        throw new Error(`Invalid selection: ${selectionValidation.error}`);
      }

      // Apply the selection change
      onSelectionChange(category, item);

      // Calculate and update score if callback provided
      if (onScoreUpdate) {
        const score = calculateOutfitScore(testSelection);
        onScoreUpdate(score);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating your selection';
      
      updateState(draft => {
        draft.error = errorMessage;
      });
      
      console.error('Selection change error:', err);
    } finally {
      // Remove loading state after a brief delay
      setTimeout(() => {
        updateState(draft => {
          draft.loadingCategories.delete(category);
        });
      }, 200);
    }
  }, [state.selection, categories, onSelectionChange, onScoreUpdate, updateState]);

  // Calculate outfit score (placeholder implementation)
  const calculateOutfitScore = useCallback((selection: OutfitSelection): number => {
    // Basic scoring logic - can be enhanced with actual scoring algorithm
    const items = Object.values(selection).filter(Boolean);
    if (items.length === 0) return 0;
    
    // Simple scoring based on number of items and formality matching
    let score = items.length * 20; // Base score
    
    // Bonus for complete outfit
    if (selection.shirt && selection.pants && selection.shoes) {
      score += 20;
    }
    
    return Math.min(score, 100);
  }, []);

  // Get filtered outfits based on debounced selection
  const filteredOutfits = useMemo(() => {
    try {
      // Ensure anchor item is included in the selection for outfit filtering
      const selectionWithAnchor = produce(state.debouncedSelection, draft => {
        if (validatedAnchorItem && !Object.values(state.debouncedSelection).some(item => typeof item === 'object' && item && 'id' in item && item.id === validatedAnchorItem.id)) {
          const anchorKey = categories.find(c => c.category === validatedAnchorItem.category_id)?.key;
          if (anchorKey) {
            (draft as any)[anchorKey] = validatedAnchorItem;
          }
        }
      });
      
      // For now, return empty array - this would be replaced with actual outfit filtering logic
      return [];
    } catch (err) {
      console.error('Error filtering outfits:', err);
      updateState(draft => {
        draft.error = 'Unable to load matching outfits. Please try refreshing the page.';
      });
      return [];
    }
  }, [state.debouncedSelection, validatedAnchorItem, categories, updateState]);

  // Memoize compatible items calculation for each category
  const compatibleItemsCache = useMemo(() => {
    const cache: Record<string, WardrobeItem[]> = {};
    
    // Ensure anchor item is included in the selection for compatibility checking
    const selectionWithAnchor = produce(state.debouncedSelection, draft => {
      if (validatedAnchorItem && !Object.values(state.debouncedSelection).some(item => typeof item === 'object' && item && 'id' in item && item.id === validatedAnchorItem.id)) {
        const anchorKey = categories.find(c => c.category === validatedAnchorItem.category_id)?.key;
        if (anchorKey) {
          (draft as any)[anchorKey] = validatedAnchorItem;
        }
      }
    });
    
    categories.forEach(({ category }) => {
      try {
        // For now, return empty array - this would be replaced with actual compatibility logic
        cache[category] = [];
      } catch (err) {
        console.error(`Error getting compatible items for ${category}:`, err);
        cache[category] = [];
      }
    });
    return cache;
  }, [state.debouncedSelection, validatedAnchorItem, categories]);

  // Format item name helper
  const formatItemName = useCallback((item: WardrobeItem, showBrand: boolean = true): string => {
    if (showBrand && item.brand) {
      return `${item.brand} ${item.name}`;
    }
    return item.name;
  }, []);

  // Only show SelectionStrip when anchor item is present
  if (!validatedAnchorItem) {
    return null;
  }

  return (
    <div className="border-b border-border px-3 sm:px-6 py-3 sm:py-4">
      <div className="space-y-3 sm:space-y-4 relative">
        {/* Error Message */}
        {state.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 sm:px-4 py-2 sm:py-3" role="alert">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-200">{state.error}</p>
              </div>
              <div className="ml-auto pl-2 sm:pl-3">
                <button
                  onClick={() => updateState(draft => { draft.error = null; })}
                  className="inline-flex text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-200 min-h-[44px] min-w-[44px] items-center justify-center sm:min-h-0 sm:min-w-0"
                  aria-label="Dismiss error message"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Dropdowns - Mobile-First Responsive */}
        <div className="space-y-3 md:space-y-0">
          {/* Label */}
          <span className="block text-xs sm:text-sm font-medium text-muted-foreground">
            {validatedAnchorItem ? `Building from ${formatItemName(validatedAnchorItem, true)}:` : 'Build Outfit:'}
          </span>
          
          {/* Dropdowns Container - Stacked on mobile, horizontal on tablet+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
            {categories.map(({ category, key }) => {
              const selectedItem = state.selection[key] as WardrobeItem | undefined;
              const availableItems = compatibleItemsCache[category] || [];
              // Lock the dropdown if this category matches the anchor item's category
              const isLocked = validatedAnchorItem && validatedAnchorItem.category_id === category;

              return (
                <CategoryDropdown
                  key={category}
                  category={category}
                  selectedItem={selectedItem || null}
                  availableItems={availableItems}
                  onSelect={(item) => handleSelectionChange(category, item)}
                  isLoading={state.loadingCategories.has(category)}
                  disabled={isLocked}
                  isLocked={isLocked}
                />
              );
            })}
          </div>
        </div>

        {/* Outfit List */}
        <OutfitList
          outfits={filteredOutfits}
          onOutfitSelect={onOutfitSelect}
          enableErrorBoundary={true}
          onError={(error) => console.error('Outfit list error:', error)}
        />
      </div>
    </div>
  );
};