import { useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';
import { 
  useValidatedMutation, 
  useOptimisticMutation, 
  createCacheUpdaters 
} from '../utils/query-validation';
import { 
  WardrobeItem, 
  CreateWardrobeItemFormSchema, 
  UpdateWardrobeItemFormSchema,
  CreateWardrobeItemForm,
  UpdateWardrobeItemForm
} from '../schemas';

/**
 * Query keys for wardrobe data
 */
export const wardrobeQueryKeys = {
  all: ['wardrobe'] as const,
  items: (userId: string) => ['wardrobe', 'items', userId] as const,
  item: (itemId: string) => ['wardrobe', 'item', itemId] as const,
  categories: (userId: string) => ['wardrobe', 'categories', userId] as const,
  filteredItems: (userId: string, filters: Record<string, any>) => 
    ['wardrobe', 'filtered', userId, filters] as const,
};

/**
 * Create wardrobe item mutation with validation and optimistic updates
 */
export function useCreateWardrobeItem(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = wardrobeQueryKeys.items(userId);
  
  return useOptimisticMutation({
    validationSchema: CreateWardrobeItemFormSchema,
    queryKey: [...queryKey],
    mutationFn: async (formData: CreateWardrobeItemForm): Promise<WardrobeItem> => {
      // This would call your Supabase API
      const response = await fetch('/api/wardrobe/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create wardrobe item');
      }
      
      return response.json();
    },
    optimisticUpdater: (oldData: unknown, formData: CreateWardrobeItemForm) => {
      const items = oldData as WardrobeItem[] | undefined;
      if (!items) return [createOptimisticItem(formData)];
      
      return produce(items, draft => {
        draft.push(createOptimisticItem(formData));
      });
    },
    onSuccess: (newItem, formData) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: wardrobeQueryKeys.filteredItems(userId, {}) 
      });
      
      // Update individual item cache
      queryClient.setQueryData(
        wardrobeQueryKeys.item(newItem.id!), 
        newItem
      );
    },
    onError: (error, formData, context) => {
      console.error('Failed to create wardrobe item:', error);
    },
  });
}

/**
 * Update wardrobe item mutation
 */
export function useUpdateWardrobeItem(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = wardrobeQueryKeys.items(userId);
  
  return useOptimisticMutation({
    validationSchema: UpdateWardrobeItemFormSchema,
    queryKey: [...queryKey],
    mutationFn: async (formData: UpdateWardrobeItemForm): Promise<WardrobeItem> => {
      const response = await fetch(`/api/wardrobe/items/${formData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update wardrobe item');
      }
      
      return response.json();
    },
    optimisticUpdater: (oldData: unknown, formData: UpdateWardrobeItemForm) => {
      const items = oldData as WardrobeItem[] | undefined;
      if (!items) return [];
      
      return produce(items, draft => {
        const index = draft.findIndex(item => item.id === formData.id);
        if (index !== -1) {
          Object.assign(draft[index], formData);
        }
      });
    },
    onSuccess: (updatedItem, formData) => {
      // Update individual item cache
      queryClient.setQueryData(
        wardrobeQueryKeys.item(updatedItem.id!), 
        updatedItem
      );
      
      // Invalidate filtered queries
      queryClient.invalidateQueries({ 
        queryKey: wardrobeQueryKeys.filteredItems(userId, {}) 
      });
    },
  });
}

/**
 * Delete wardrobe item mutation
 */
export function useDeleteWardrobeItem(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = wardrobeQueryKeys.items(userId);
  
  return useOptimisticMutation({
    queryKey: [...queryKey],
    mutationFn: async (itemId: string): Promise<void> => {
      const response = await fetch(`/api/wardrobe/items/${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete wardrobe item');
      }
    },
    optimisticUpdater: (oldData: unknown, itemId: string) => {
      const items = oldData as WardrobeItem[] | undefined;
      if (!items) return [];
      
      return produce(items, draft => {
        const index = draft.findIndex(item => item.id === itemId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });
    },
    onSuccess: (_, itemId) => {
      // Remove from individual item cache
      queryClient.removeQueries({ 
        queryKey: wardrobeQueryKeys.item(itemId) 
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: wardrobeQueryKeys.filteredItems(userId, {}) 
      });
    },
  });
}

/**
 * Batch update wardrobe items
 */
export function useBatchUpdateWardrobeItems(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = wardrobeQueryKeys.items(userId);
  
  return useValidatedMutation({
    mutationFn: async (updates: UpdateWardrobeItemForm[]): Promise<WardrobeItem[]> => {
      const response = await fetch('/api/wardrobe/items/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch update wardrobe items');
      }
      
      return response.json();
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      // Optimistic batch update
      queryClient.setQueryData(queryKey, (oldData: WardrobeItem[] | undefined) => {
        if (!oldData) return [];
        
        return produce(oldData, draft => {
          updates.forEach(update => {
            const index = draft.findIndex(item => item.id === update.id);
            if (index !== -1) {
              Object.assign(draft[index], update);
            }
          });
        });
      });
      
      return { previousData };
    },
    onSuccess: (updatedItems) => {
      // Update individual item caches
      updatedItems.forEach(item => {
        queryClient.setQueryData(
          wardrobeQueryKeys.item(item.id!), 
          item
        );
      });
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
}

/**
 * Toggle item active status
 */
export function useToggleItemActive(userId: string) {
  const cacheUpdaters = createCacheUpdaters<WardrobeItem>([...wardrobeQueryKeys.items(userId)]);
  
  return useValidatedMutation({
    mutationFn: async ({ itemId, active }: { itemId: string; active: boolean }): Promise<WardrobeItem> => {
      const response = await fetch(`/api/wardrobe/items/${itemId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle item status');
      }
      
      return response.json();
    },
    onMutate: async ({ itemId, active }) => {
      // Optimistic update using cache updaters
      cacheUpdaters.updateItem(
        item => item.id === itemId,
        item => ({ ...item, active })
      );
    },
    onSuccess: (updatedItem) => {
      // Ensure cache is consistent
      cacheUpdaters.updateItem(
        item => item.id === updatedItem.id,
        () => updatedItem
      );
    },
  });
}

/**
 * Create optimistic item for immediate UI feedback
 */
function createOptimisticItem(formData: CreateWardrobeItemForm): WardrobeItem {
  return {
    id: `temp-${Date.now()}`, // Temporary ID
    user_id: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...formData,
  };
}

/**
 * Bulk operations hook
 */
export function useBulkWardrobeOperations(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = wardrobeQueryKeys.items(userId);
  
  const bulkDelete = useValidatedMutation({
    mutationFn: async (itemIds: string[]): Promise<void> => {
      const response = await fetch('/api/wardrobe/items/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to bulk delete items');
      }
    },
    onMutate: async (itemIds) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (oldData: WardrobeItem[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(item => !itemIds.includes(item.id!));
      });
      
      return { previousData };
    },
    onError: (error, itemIds, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  
  const bulkUpdateCategory = useValidatedMutation({
    mutationFn: async ({ itemIds, categoryId }: { itemIds: string[]; categoryId: string }): Promise<WardrobeItem[]> => {
      const response = await fetch('/api/wardrobe/items/bulk-update-category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, categoryId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to bulk update category');
      }
      
      return response.json();
    },
    onMutate: async ({ itemIds, categoryId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (oldData: WardrobeItem[] | undefined) => {
        if (!oldData) return [];
        
        return produce(oldData, draft => {
          draft.forEach(item => {
            if (itemIds.includes(item.id!)) {
              item.category_id = categoryId;
            }
          });
        });
      });
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  
  return {
    bulkDelete,
    bulkUpdateCategory,
  };
}