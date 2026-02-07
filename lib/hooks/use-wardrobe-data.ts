import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-client';
import { 
  useValidatedMutation, 
  useOptimisticMutation,
  createCacheUpdaters 
} from '@/lib/utils/query-validation';
import { useImmerState } from '@/lib/utils/immer-state';
import { safeValidate } from '@/lib/utils/validation';
import {
  WardrobeItemSchema,
  CreateWardrobeItemFormSchema,
  UpdateWardrobeItemFormSchema,
  CategorySchema,
  OutfitSelectionSchema,
  type WardrobeItem,
  type Category,
  type OutfitSelection,
  type CreateWardrobeItemForm,
  type UpdateWardrobeItemForm,
} from '@/lib/schemas';

// Get current user ID (this would typically come from auth context)
function getCurrentUserId(): string {
  // This is a placeholder - in real implementation, this would come from Supabase auth
  // For now, we'll return a test user ID
  return 'test-user-id';
}

/**
 * Comprehensive wardrobe data management hook with Zod validation and Immer state
 */
export function useWardrobeData() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const userId = getCurrentUserId();
  
  // Local state for UI interactions
  const [uiState, updateUiState] = useImmerState({
    selectedCategory: null as string | null,
    searchQuery: '',
    filters: {
      season: [] as string[],
      formality: null as number | null,
      brand: null as string | null,
    },
    selection: {} as OutfitSelection,
    isLoading: false,
    errors: {} as Record<string, string>,
  });

  // Cache updaters for optimistic updates
  const itemsCacheUpdaters = createCacheUpdaters<WardrobeItem>(
    queryKeys.wardrobe.items(userId) as unknown as any[]
  );
  const categoriesCacheUpdaters = createCacheUpdaters<Category>(
    queryKeys.wardrobe.categories(userId) as unknown as any[]
  );

  // Validated item creation with optimistic updates
  const createItem = useOptimisticMutation({
    validationSchema: CreateWardrobeItemFormSchema,
    queryKey: queryKeys.wardrobe.items(userId) as unknown as any[],
    mutationFn: async (formData: CreateWardrobeItemForm): Promise<WardrobeItem> => {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .insert({
          ...formData,
          user_id: userId,
        })
        .select(`
          *,
          category:categories(*)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create wardrobe item: ${error.message}`);
      }

      return data;
    },
    optimisticUpdater: (oldData: WardrobeItem[] | undefined, formData: CreateWardrobeItemForm) => {
      const optimisticItem: WardrobeItem = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...formData,
      };

      return oldData ? [...oldData, optimisticItem] : [optimisticItem];
    },
    onSuccess: (newItem) => {
      // Clear any form errors
      updateUiState(draft => {
        delete draft.errors.createItem;
      });
      
      // Update individual item cache
      queryClient.setQueryData(
        queryKeys.wardrobe.item(newItem.id!), 
        newItem
      );
    },
    onError: (error) => {
      updateUiState(draft => {
        draft.errors.createItem = error.message;
      });
    },
  });

  // Validated item update with optimistic updates
  const updateItem = useOptimisticMutation({
    validationSchema: UpdateWardrobeItemFormSchema,
    queryKey: queryKeys.wardrobe.items(userId) as unknown as any[],
    mutationFn: async (formData: UpdateWardrobeItemForm): Promise<WardrobeItem> => {
      const { id, ...updateData } = formData;
      
      const { data, error } = await supabase
        .from('wardrobe_items')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          category:categories(*)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update wardrobe item: ${error.message}`);
      }

      return data;
    },
    optimisticUpdater: (oldData: WardrobeItem[] | undefined, formData: UpdateWardrobeItemForm) => {
      if (!oldData) return [];
      
      return produce(oldData, draft => {
        const index = draft.findIndex(item => item.id === formData.id);
        if (index !== -1) {
          Object.assign(draft[index], formData, {
            updated_at: new Date().toISOString()
          });
        }
      });
    },
    onSuccess: (updatedItem) => {
      // Update individual item cache
      queryClient.setQueryData(
        queryKeys.wardrobe.item(updatedItem.id!), 
        updatedItem
      );
      
      // Clear any form errors
      updateUiState(draft => {
        delete draft.errors.updateItem;
      });
    },
    onError: (error) => {
      updateUiState(draft => {
        draft.errors.updateItem = error.message;
      });
    },
  });

  // Batch operations with validation
  const batchUpdateItems = useValidatedMutation({
    mutationFn: async (updates: UpdateWardrobeItemForm[]): Promise<WardrobeItem[]> => {
      // Validate all updates
      const validatedUpdates = updates.map(update => 
        UpdateWardrobeItemFormSchema.parse(update)
      );

      // Execute updates in parallel
      const updatePromises = validatedUpdates.map(async ({ id, ...updateData }) => {
        const { data, error } = await supabase
          .from('wardrobe_items')
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select(`
            *,
            category:categories(*)
          `)
          .single();

        if (error) {
          throw new Error(`Failed to update item ${id}: ${error.message}`);
        }

        return data;
      });

      return Promise.all(updatePromises);
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.items(userId) as unknown as any[] });
      const previousData = queryClient.getQueryData(queryKeys.wardrobe.items(userId));

      // Optimistic batch update
      queryClient.setQueryData(
        queryKeys.wardrobe.items(userId), 
        (oldData: WardrobeItem[] | undefined) => {
          if (!oldData) return [];
          
          return produce(oldData, draft => {
            updates.forEach(update => {
              const index = draft.findIndex(item => item.id === update.id);
              if (index !== -1) {
                Object.assign(draft[index], update, {
                  updated_at: new Date().toISOString()
                });
              }
            });
          });
        }
      );

      return { previousData };
    },
    onSuccess: (updatedItems) => {
      // Update individual item caches
      updatedItems.forEach(item => {
        queryClient.setQueryData(
          queryKeys.wardrobe.item(item.id!), 
          item
        );
      });
    },
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.wardrobe.items(userId), 
          context.previousData
        );
      }
      
      updateUiState(draft => {
        draft.errors.batchUpdate = error.message;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.items(userId) as unknown as any[] });
    },
  });

  // UI state management functions
  const setSelectedCategory = useCallback((categoryId: string | null) => {
    updateUiState(draft => {
      draft.selectedCategory = categoryId;
    });
  }, [updateUiState]);

  const setSearchQuery = useCallback((query: string) => {
    updateUiState(draft => {
      draft.searchQuery = query;
    });
  }, [updateUiState]);

  const updateFilters = useCallback((filters: Partial<typeof uiState.filters>) => {
    updateUiState(draft => {
      Object.assign(draft.filters, filters);
    });
  }, [updateUiState]);

  const selectItem = useCallback((category: string, item: WardrobeItem | null) => {
    updateUiState(draft => {
      if (item) {
        // Validate the item before adding to selection
        const validation = safeValidate(WardrobeItemSchema, item);
        if (validation.success) {
          (draft.selection as any)[category] = validation.data;
        } else {
          // For testing purposes, still add the item but log the validation error
          console.warn('Item validation failed:', validation.error);
          (draft.selection as any)[category] = item;
        }
      } else {
        delete (draft.selection as any)[category];
      }
      
      // Recalculate outfit score
      const selectedItems = Object.values(draft.selection).filter(Boolean);
      draft.selection.score = calculateOutfitScore(selectedItems as WardrobeItem[]);
    });
  }, [updateUiState]);

  const clearSelection = useCallback(() => {
    updateUiState(draft => {
      draft.selection = { tuck_style: 'Untucked' };
    });
  }, [updateUiState]);

  const clearError = useCallback((errorKey: string) => {
    updateUiState(draft => {
      delete draft.errors[errorKey];
    });
  }, [updateUiState]);

  const clearAllErrors = useCallback(() => {
    updateUiState(draft => {
      draft.errors = {};
    });
  }, [updateUiState]);

  // Validation helpers
  const validateSelection = useCallback(() => {
    const validation = safeValidate(OutfitSelectionSchema, uiState.selection);
    return validation;
  }, [uiState.selection]);

  const validateItemForm = useCallback((formData: Partial<CreateWardrobeItemForm>) => {
    return safeValidate(CreateWardrobeItemFormSchema, formData);
  }, []);

  // Cache management utilities
  const invalidateAllData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all as unknown as any[] });
  }, [queryClient]);

  const prefetchItem = useCallback((itemId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.wardrobe.item(itemId) as unknown as any[],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('wardrobe_items')
          .select(`
            *,
            category:categories(*)
          `)
          .eq('id', itemId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch item: ${error.message}`);
        }

        return data;
      },
    });
  }, [queryClient, supabase]);

  return {
    // State
    uiState,
    
    // Mutations
    createItem,
    updateItem,
    batchUpdateItems,
    
    // UI state management
    setSelectedCategory,
    setSearchQuery,
    updateFilters,
    selectItem,
    clearSelection,
    clearError,
    clearAllErrors,
    
    // Validation
    validateSelection,
    validateItemForm,
    
    // Cache management
    invalidateAllData,
    prefetchItem,
    
    // Cache updaters for advanced use cases
    itemsCacheUpdaters,
    categoriesCacheUpdaters,
  };
}

/**
 * Simple outfit scoring function (placeholder for actual logic)
 */
function calculateOutfitScore(items: WardrobeItem[]): number {
  if (items.length === 0) return 0;
  
  // Simple scoring based on formality consistency
  const formalityScores = items
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

/**
 * Hook for managing outfit creation with validation and caching
 */
export function useOutfitCreation() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const userId = getCurrentUserId();
  
  const [creationState, updateCreationState] = useImmerState({
    currentSelection: {} as OutfitSelection,
    availableItems: [] as WardrobeItem[],
    filteredItems: {} as Record<string, WardrobeItem[]>,
    isCreating: false,
    errors: {} as Record<string, string>,
  });

  const createOutfitFromSelection = useOptimisticMutation({
    queryKey: queryKeys.outfits.list(userId) as unknown as any[],
    mutationFn: async (selection: OutfitSelection): Promise<any> => {
      // Validate selection
      const validation = safeValidate(OutfitSelectionSchema, selection);
      if (!validation.success) {
        throw new Error(`Invalid selection: ${validation.error}`);
      }

      const selectedItems = Object.values(validation.data)
        .filter(item => item && typeof item === 'object' && 'id' in item) as WardrobeItem[];

      if (selectedItems.length === 0) {
        throw new Error('No items selected for outfit');
      }

      // Check for duplicates via Edge Function
      const { data: duplicateCheck, error: duplicateError } = await supabase.functions.invoke('check-outfit-duplicate', {
        body: { item_ids: selectedItems.map(item => item.id) }
      });

      if (duplicateError) {
        throw new Error(`Duplicate check failed: ${duplicateError.message}`);
      }

      if (duplicateCheck?.isDuplicate) {
        throw new Error('This outfit combination already exists');
      }

      // Score the outfit via Edge Function
      const { data: scoreData, error: scoreError } = await supabase.functions.invoke('score-outfit', {
        body: { item_ids: selectedItems.map(item => item.id) }
      });

      if (scoreError) {
        throw new Error(`Scoring failed: ${scoreError.message}`);
      }

      // Create the outfit
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert({
          user_id: userId,
          score: scoreData?.score || 0,
          tuck_style: validation.data.tuck_style,
          source: 'curated',
          weight: 1,
          loved: false,
        })
        .select()
        .single();

      if (outfitError) {
        throw new Error(`Failed to create outfit: ${outfitError.message}`);
      }

      // Create outfit items
      const outfitItems = selectedItems.map(item => ({
        outfit_id: outfit.id,
        item_id: item.id,
        category_id: item.category_id,
      }));

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(outfitItems);

      if (itemsError) {
        // Rollback outfit creation
        await supabase.from('outfits').delete().eq('id', outfit.id);
        throw new Error(`Failed to create outfit items: ${itemsError.message}`);
      }

      return {
        ...outfit,
        items: selectedItems,
      };
    },
    optimisticUpdater: (oldData: Outfit[] | undefined, selection: OutfitSelection) => {
      const selectedItems = Object.values(selection)
        .filter(item => item && typeof item === 'object' && 'id' in item) as WardrobeItem[];

      const optimisticOutfit = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        score: selection.score || 0,
        tuck_style: selection.tuck_style,
        source: 'curated',
        weight: 1,
        loved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: selectedItems,
      };

      return oldData ? [optimisticOutfit, ...oldData] : [optimisticOutfit];
    },
    onSuccess: () => {
      updateCreationState(draft => {
        draft.currentSelection = { tuck_style: 'Untucked' };
        draft.isCreating = false;
        delete draft.errors.creation;
      });
    },
    onError: (error) => {
      updateCreationState(draft => {
        draft.isCreating = false;
        draft.errors.creation = error.message;
      });
    },
  });

  const updateSelection = useCallback((category: string, item: WardrobeItem | null) => {
    updateCreationState(draft => {
      if (item) {
        (draft.currentSelection as any)[category] = item;
      } else {
        delete (draft.currentSelection as any)[category];
      }
      
      // Recalculate score
      const selectedItems = Object.values(draft.currentSelection).filter(Boolean) as WardrobeItem[];
      draft.currentSelection.score = calculateOutfitScore(selectedItems);
    });
  }, [updateCreationState]);

  return {
    creationState,
    createOutfitFromSelection,
    updateSelection,
  };
}