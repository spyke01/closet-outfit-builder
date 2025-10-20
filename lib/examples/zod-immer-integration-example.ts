/**
 * Comprehensive example demonstrating Zod and Immer integration patterns
 * This file shows how to use the infrastructure we've set up for the Next.js Supabase migration
 */

import { useCallback, useState } from 'react';
import { z } from 'zod';
import { produce } from 'immer';
import { useQueryClient } from '@tanstack/react-query';

// Import our schemas and utilities
import {
  WardrobeItemSchema,
  CreateWardrobeItemFormSchema,
  OutfitSelectionSchema,
  type WardrobeItem,
  type OutfitSelection,
  type CreateWardrobeItemForm,
} from '../schemas';

import {
  safeValidate,
  validateFileUpload,
  type ValidationResult,
} from '../utils/validation';

import {
  useImmerState,
  immerArrayUtils,
} from '../utils/immer-state';

import {
  useValidatedMutation,
  useOptimisticMutation,
} from '../utils/query-validation';

/**
 * Example 1: Form validation with Zod
 */
export function useWardrobeItemForm() {
  const [formData, setFormData] = useState<Partial<CreateWardrobeItemForm>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((data: Partial<CreateWardrobeItemForm>): ValidationResult<CreateWardrobeItemForm> => {
    const result = safeValidate(CreateWardrobeItemFormSchema, data);
    
    if (!result.success) {
      // Extract field-specific errors
      const fieldErrors: Record<string, string> = {};
      result.details?.issues.forEach(issue => {
        const fieldPath = issue.path.join('.');
        if (fieldPath) {
          fieldErrors[fieldPath] = issue.message;
        }
      });
      setErrors(fieldErrors);
    } else {
      setErrors({});
    }
    
    return result;
  }, []);

  const updateField = useCallback((field: keyof CreateWardrobeItemForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const submitForm = useCallback(() => {
    const validation = validateForm(formData);
    return validation.success ? validation.data : null;
  }, [formData, validateForm]);

  return {
    formData,
    errors,
    updateField,
    validateForm,
    submitForm,
    isValid: Object.keys(errors).length === 0,
  };
}

/**
 * Example 2: Complex state management with Immer
 */
export function useOutfitBuilder() {
  const [state, updateState] = useImmerState({
    selection: {} as OutfitSelection,
    availableItems: [] as WardrobeItem[],
    filteredItems: {} as Record<string, WardrobeItem[]>,
    history: [] as OutfitSelection[],
    isLoading: false,
  });

  const selectItem = useCallback((category: string, item: WardrobeItem | null) => {
    updateState(draft => {
      // Save current selection to history before changing
      if (Object.keys(draft.selection).length > 0) {
        draft.history.push({ ...draft.selection });
      }

      // Update selection
      if (item) {
        (draft.selection as any)[category] = item;
      } else {
        delete (draft.selection as any)[category];
      }

      // Recalculate filtered items based on new selection
      draft.filteredItems = calculateCompatibleItems(draft.availableItems, draft.selection);
      
      // Calculate outfit score
      draft.selection.score = calculateOutfitScore(draft.selection);
    });
  }, [updateState]);

  const undoSelection = useCallback(() => {
    updateState(draft => {
      if (draft.history.length > 0) {
        draft.selection = draft.history.pop()!;
        draft.filteredItems = calculateCompatibleItems(draft.availableItems, draft.selection);
      }
    });
  }, [updateState]);

  const clearSelection = useCallback(() => {
    updateState(draft => {
      if (Object.keys(draft.selection).length > 0) {
        draft.history.push({ ...draft.selection });
      }
      draft.selection = { tuck_style: 'Untucked' };
      draft.filteredItems = {};
    });
  }, [updateState]);

  const setAvailableItems = useCallback((items: WardrobeItem[]) => {
    updateState(draft => {
      draft.availableItems = items;
      draft.filteredItems = calculateCompatibleItems(items, draft.selection);
    });
  }, [updateState]);

  return {
    state,
    selectItem,
    undoSelection,
    clearSelection,
    setAvailableItems,
    canUndo: state.history.length > 0,
  };
}

/**
 * Example 3: Validated mutations with optimistic updates
 */
export function useWardrobeItemMutations(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['wardrobe', 'items', userId];

  // Create item with validation and optimistic updates
  const createItem = useOptimisticMutation({
    validationSchema: CreateWardrobeItemFormSchema,
    queryKey,
    mutationFn: async (formData: CreateWardrobeItemForm): Promise<WardrobeItem> => {
      // Simulate API call
      const response = await fetch('/api/wardrobe/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create item');
      }
      
      return response.json();
    },
    optimisticUpdater: (oldData: WardrobeItem[] | undefined, formData: CreateWardrobeItemForm) => {
      const optimisticItem: WardrobeItem = {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...formData,
      };

      return oldData ? [...oldData, optimisticItem] : [optimisticItem];
    },
    onSuccess: (newItem) => {
      // Update individual item cache
      queryClient.setQueryData(['wardrobe', 'item', newItem.id], newItem);
    },
  });

  // Batch update items
  const batchUpdateItems = useValidatedMutation({
    mutationFn: async (updates: Array<{ id: string; updates: Partial<WardrobeItem> }>): Promise<WardrobeItem[]> => {
      const response = await fetch('/api/wardrobe/items/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch update items');
      }
      
      return response.json();
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistic batch update using Immer
      queryClient.setQueryData(queryKey, (oldData: WardrobeItem[] | undefined) => {
        if (!oldData) return [];
        
        return produce(oldData, draft => {
          updates.forEach(({ id, updates: itemUpdates }) => {
            const index = draft.findIndex(item => item.id === id);
            if (index !== -1) {
              Object.assign(draft[index], itemUpdates);
            }
          });
        });
      });

      return { previousData };
    },
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    createItem,
    batchUpdateItems,
  };
}

/**
 * Example 4: File upload with validation
 */
export function useImageUpload() {
  const [uploadState, updateUploadState] = useImmerState({
    isUploading: false,
    progress: 0,
    error: null as string | null,
    uploadedUrl: null as string | null,
  });

  const uploadImage = useCallback(async (file: File) => {
    updateUploadState(draft => {
      draft.isUploading = true;
      draft.progress = 0;
      draft.error = null;
      draft.uploadedUrl = null;
    });

    try {
      // Validate file
      const fileValidation = validateFileUpload(
        file,
        ['image/jpeg', 'image/png', 'image/webp'],
        5 * 1024 * 1024 // 5MB
      );

      if (!fileValidation.success) {
        throw new Error(fileValidation.error);
      }

      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Upload with progress tracking
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      updateUploadState(draft => {
        draft.isUploading = false;
        draft.progress = 100;
        draft.uploadedUrl = result.url;
      });

      return result.url;
    } catch (error) {
      updateUploadState(draft => {
        draft.isUploading = false;
        draft.error = error instanceof Error ? error.message : 'Upload failed';
      });
      throw error;
    }
  }, [updateUploadState]);

  const resetUpload = useCallback(() => {
    updateUploadState(draft => {
      draft.isUploading = false;
      draft.progress = 0;
      draft.error = null;
      draft.uploadedUrl = null;
    });
  }, [updateUploadState]);

  return {
    uploadState,
    uploadImage,
    resetUpload,
  };
}

/**
 * Example 5: Complex array operations with Immer
 */
export function useWardrobeCollection() {
  const [items, updateItems] = useImmerState<WardrobeItem[]>([]);

  const addItem = useCallback((item: WardrobeItem) => {
    updateItems(draft => {
      draft.push(item);
    });
  }, [updateItems]);

  const removeItem = useCallback((itemId: string) => {
    updateItems(draft => {
      const index = draft.findIndex(item => item.id === itemId);
      if (index !== -1) {
        draft.splice(index, 1);
      }
    });
  }, [updateItems]);

  const updateItem = useCallback((itemId: string, updates: Partial<WardrobeItem>) => {
    updateItems(draft => {
      const index = draft.findIndex(item => item.id === itemId);
      if (index !== -1) {
        Object.assign(draft[index], updates);
      }
    });
  }, [updateItems]);

  const toggleItemActive = useCallback((itemId: string) => {
    updateItems(draft => {
      const index = draft.findIndex(item => item.id === itemId);
      if (index !== -1) {
        draft[index].active = !draft[index].active;
      }
    });
  }, [updateItems]);

  const sortItems = useCallback((compareFn: (a: WardrobeItem, b: WardrobeItem) => number) => {
    updateItems(draft => {
      draft.sort(compareFn);
    });
  }, [updateItems]);

  const filterItems = useCallback((predicate: (item: WardrobeItem) => boolean) => {
    return items.filter(predicate);
  }, [items]);

  const groupItemsByCategory = useCallback(() => {
    return items.reduce((groups, item) => {
      const categoryId = item.category_id;
      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }
      groups[categoryId].push(item);
      return groups;
    }, {} as Record<string, WardrobeItem[]>);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    toggleItemActive,
    sortItems,
    filterItems,
    groupItemsByCategory,
  };
}

/**
 * Helper functions
 */
function calculateCompatibleItems(
  availableItems: WardrobeItem[],
  selection: OutfitSelection
): Record<string, WardrobeItem[]> {
  // Placeholder implementation - would contain actual compatibility logic
  const selectedItems = Object.values(selection).filter(Boolean) as WardrobeItem[];
  
  if (selectedItems.length === 0) {
    return {};
  }

  // Group available items by category
  const itemsByCategory = availableItems.reduce((groups, item) => {
    if (!groups[item.category_id]) {
      groups[item.category_id] = [];
    }
    groups[item.category_id].push(item);
    return groups;
  }, {} as Record<string, WardrobeItem[]>);

  // Filter each category based on compatibility with selected items
  const filtered: Record<string, WardrobeItem[]> = {};
  
  Object.entries(itemsByCategory).forEach(([categoryId, items]) => {
    filtered[categoryId] = items.filter(item => 
      selectedItems.every(selectedItem => 
        isItemCompatible(item, selectedItem)
      )
    );
  });

  return filtered;
}

function calculateOutfitScore(selection: OutfitSelection): number {
  const selectedItems = Object.values(selection).filter(Boolean) as WardrobeItem[];
  
  if (selectedItems.length === 0) {
    return 0;
  }

  // Simple scoring based on formality consistency
  const formalityScores = selectedItems
    .map(item => item.formality_score)
    .filter(Boolean) as number[];

  if (formalityScores.length === 0) {
    return 50; // Default score
  }

  const avgFormality = formalityScores.reduce((sum, score) => sum + score, 0) / formalityScores.length;
  const variance = formalityScores.reduce((sum, score) => sum + Math.pow(score - avgFormality, 2), 0) / formalityScores.length;
  
  // Lower variance = higher score (more consistent formality)
  return Math.max(0, Math.min(100, 100 - (variance * 10)));
}

function isItemCompatible(item1: WardrobeItem, item2: WardrobeItem): boolean {
  // Placeholder compatibility logic
  if (item1.formality_score && item2.formality_score) {
    return Math.abs(item1.formality_score - item2.formality_score) <= 3;
  }
  
  // Check season compatibility
  const item1Seasons = item1.season || ['All'];
  const item2Seasons = item2.season || ['All'];
  
  return item1Seasons.some(season => 
    item2Seasons.includes(season) || season === 'All' || item2Seasons.includes('All')
  );
}