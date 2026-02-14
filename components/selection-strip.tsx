'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { produce } from 'immer';
import { useImmerState } from '@/lib/utils/immer-state';
import { safeValidate } from '@/lib/utils/validation';
import { AlertCircle, X } from 'lucide-react';
import { 
  OutfitSelectionSchema, 
  WardrobeItemSchema,
  type OutfitSelection,
  type WardrobeItem
} from '@/lib/schemas';
import { type Outfit } from '@/lib/types/database';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CategoryDropdown } from './category-dropdown';
import { OutfitList } from './outfit-list';

interface SelectionStripState {
  selection: OutfitSelection;
  loadingCategories: Set<string>;
  error: string | null;
  debouncedSelection: OutfitSelection;
}

interface SelectionStripProps {
  selection: OutfitSelection;
  anchorItem: WardrobeItem | null;
  onSelectionChange: (category: string, item: WardrobeItem | null) => void;
  onOutfitSelect: (outfit: Outfit) => void;
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
  void userId;
  void enableRealTimeUpdates;

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
  type ItemKey = 'jacket' | 'overshirt' | 'shirt' | 'undershirt' | 'pants' | 'shoes' | 'belt' | 'watch';

  const categories = useMemo(() => [
    { category: 'Jacket/Overshirt', key: 'jacket' as ItemKey },
    { category: 'Shirt', key: 'shirt' as ItemKey },
    { category: 'Undershirt', key: 'undershirt' as ItemKey },
    { category: 'Pants', key: 'pants' as ItemKey },
    { category: 'Shoes', key: 'shoes' as ItemKey },
  ], []);

  // Calculate outfit score (placeholder implementation)
  const calculateOutfitScore = useCallback((selection: OutfitSelection): number => {
    const items = Object.values(selection).filter(Boolean);
    if (items.length === 0) return 0;
    
    let score = items.length * 20;
    
    if (selection.shirt && selection.pants && selection.shoes) {
      score += 20;
    }
    
    return Math.min(score, 100);
  }, []);

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
            draft[key] = item;
          } else {
            delete draft[key];
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
  }, [calculateOutfitScore, state.selection, categories, onSelectionChange, onScoreUpdate, updateState]);

  // Get filtered outfits based on debounced selection
  const filteredOutfits = useMemo(() => {
    try {
      // For now, return empty array - this would be replaced with actual outfit filtering logic
      return [];
    } catch (err) {
      console.error('Error filtering outfits:', err);
      updateState(draft => {
        draft.error = 'Unable to load matching outfits. Please try refreshing the page.';
      });
      return [];
    }
  }, [updateState]);

  // Memoize compatible items calculation for each category
  const compatibleItemsCache = useMemo(() => {
    const cache: Record<string, WardrobeItem[]> = {};

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
  }, [categories]);

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
          <Alert variant="destructive" className="px-3 sm:px-4 py-2 sm:py-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <AlertDescription className="text-xs sm:text-sm pr-8">{state.error}</AlertDescription>
            <button
              onClick={() => updateState(draft => { draft.error = null; })}
              className="absolute right-2 top-2 inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
              aria-label="Dismiss error message"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
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
