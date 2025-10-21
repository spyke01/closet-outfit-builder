import { useCallback } from 'react';
import { useImmerState } from '../utils/immer-state';
import { WardrobeItem, Category, OutfitSelection } from '../schemas';

/**
 * Wardrobe state interface
 */
export interface WardrobeState {
  items: WardrobeItem[];
  categories: Category[];
  selection: OutfitSelection;
  filteredItems: Record<string, WardrobeItem[]>;
  isLoading: boolean;
  errors: Record<string, string>;
  lastUpdated: string | null;
}

/**
 * Initial wardrobe state
 */
const initialWardrobeState: WardrobeState = {
  items: [],
  categories: [],
  selection: {
    tuck_style: 'Untucked',
  },
  filteredItems: {},
  isLoading: false,
  errors: {},
  lastUpdated: null,
};

/**
 * Wardrobe state management hook with Immer
 */
export function useWardrobeState() {
  const [state, updateState, replaceState] = useImmerState(initialWardrobeState);
  
  // Item management
  const addItem = useCallback((newItem: WardrobeItem) => {
    updateState(draft => {
      draft.items.push(newItem);
      draft.lastUpdated = new Date().toISOString();
      
      // Update filtered items if category exists
      const categoryId = newItem.category_id;
      if (!draft.filteredItems[categoryId]) {
        draft.filteredItems[categoryId] = [];
      }
      draft.filteredItems[categoryId].push(newItem);
    });
  }, [updateState]);
  
  const updateItem = useCallback((itemId: string, updates: Partial<WardrobeItem>) => {
    updateState(draft => {
      const itemIndex = draft.items.findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        Object.assign(draft.items[itemIndex], updates);
        draft.lastUpdated = new Date().toISOString();
        
        // Update filtered items
        const item = draft.items[itemIndex];
        Object.keys(draft.filteredItems).forEach(categoryId => {
          const filteredIndex = draft.filteredItems[categoryId].findIndex(i => i.id === itemId);
          if (filteredIndex !== -1) {
            draft.filteredItems[categoryId][filteredIndex] = item;
          }
        });
      }
    });
  }, [updateState]);
  
  const removeItem = useCallback((itemId: string) => {
    updateState(draft => {
      // Remove from items array
      const itemIndex = draft.items.findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        const removedItem = draft.items[itemIndex];
        draft.items.splice(itemIndex, 1);
        
        // Remove from filtered items
        Object.keys(draft.filteredItems).forEach(categoryId => {
          draft.filteredItems[categoryId] = draft.filteredItems[categoryId].filter(
            item => item.id !== itemId
          );
        });
        
        // Remove from selection if selected
        Object.keys(draft.selection).forEach(key => {
          const selectedItem = draft.selection[key as keyof OutfitSelection];
          if (selectedItem && typeof selectedItem === 'object' && 'id' in selectedItem && selectedItem.id === itemId) {
            delete draft.selection[key as keyof OutfitSelection];
          }
        });
        
        draft.lastUpdated = new Date().toISOString();
      }
    });
  }, [updateState]);
  
  // Category management
  const addCategory = useCallback((newCategory: Category) => {
    updateState(draft => {
      draft.categories.push(newCategory);
      if (newCategory.id) {
        draft.filteredItems[newCategory.id] = [];
      }
    });
  }, [updateState]);
  
  const updateCategory = useCallback((categoryId: string, updates: Partial<Category>) => {
    updateState(draft => {
      const categoryIndex = draft.categories.findIndex(cat => cat.id === categoryId);
      if (categoryIndex !== -1) {
        Object.assign(draft.categories[categoryIndex], updates);
      }
    });
  }, [updateState]);
  
  // Selection management
  const selectItem = useCallback((category: string, item: WardrobeItem | null) => {
    updateState(draft => {
      if (item) {
        (draft.selection as any)[category] = item;
      } else {
        delete (draft.selection as any)[category];
      }
      
      // Recalculate score (placeholder - would use actual scoring logic)
      const selectedItems = Object.values(draft.selection).filter(Boolean);
      draft.selection.score = selectedItems.length * 20; // Simple scoring
    });
  }, [updateState]);
  
  const clearSelection = useCallback(() => {
    updateState(draft => {
      draft.selection = {
        tuck_style: 'Untucked',
      };
    });
  }, [updateState]);
  
  // Filtering
  const updateFilteredItems = useCallback((categoryId: string, items: WardrobeItem[]) => {
    updateState(draft => {
      draft.filteredItems[categoryId] = items;
    });
  }, [updateState]);
  
  const filterItemsByCompatibility = useCallback((anchorItem: WardrobeItem) => {
    updateState(draft => {
      // Filter items based on compatibility with anchor item
      draft.categories.forEach(category => {
        if (category.id && category.id !== anchorItem.category_id) {
          const compatibleItems = draft.items.filter(item => 
            item.category_id === category.id && 
            isCompatible(item, anchorItem) // Would implement actual compatibility logic
          );
          draft.filteredItems[category.id] = compatibleItems;
        }
      });
    });
  }, [updateState]);
  
  // Loading and error states
  const setLoading = useCallback((loading: boolean) => {
    updateState(draft => {
      draft.isLoading = loading;
    });
  }, [updateState]);
  
  const setError = useCallback((field: string, error: string) => {
    updateState(draft => {
      draft.errors[field] = error;
    });
  }, [updateState]);
  
  const clearErrors = useCallback(() => {
    updateState(draft => {
      draft.errors = {};
    });
  }, [updateState]);
  
  // Batch operations
  const batchUpdateItems = useCallback((updates: Array<{ id: string; updates: Partial<WardrobeItem> }>) => {
    updateState(draft => {
      updates.forEach(({ id, updates: itemUpdates }) => {
        const itemIndex = draft.items.findIndex(item => item.id === id);
        if (itemIndex !== -1) {
          Object.assign(draft.items[itemIndex], itemUpdates);
        }
      });
      draft.lastUpdated = new Date().toISOString();
    });
  }, [updateState]);
  
  const replaceAllItems = useCallback((newItems: WardrobeItem[]) => {
    updateState(draft => {
      draft.items = newItems;
      draft.lastUpdated = new Date().toISOString();
      
      // Rebuild filtered items
      draft.filteredItems = {};
      draft.categories.forEach(category => {
        if (category.id) {
          draft.filteredItems[category.id] = newItems.filter(
            item => item.category_id === category.id
          );
        }
      });
    });
  }, [updateState]);
  
  return {
    // State
    state,
    
    // Item operations
    addItem,
    updateItem,
    removeItem,
    batchUpdateItems,
    replaceAllItems,
    
    // Category operations
    addCategory,
    updateCategory,
    
    // Selection operations
    selectItem,
    clearSelection,
    
    // Filtering operations
    updateFilteredItems,
    filterItemsByCompatibility,
    
    // UI state operations
    setLoading,
    setError,
    clearErrors,
    
    // Utility
    replaceState,
  };
}

/**
 * Simple compatibility check (placeholder for actual logic)
 */
function isCompatible(item1: WardrobeItem, item2: WardrobeItem): boolean {
  // Placeholder compatibility logic
  if (item1.formality_score && item2.formality_score) {
    return Math.abs(item1.formality_score - item2.formality_score) <= 3;
  }
  return true;
}