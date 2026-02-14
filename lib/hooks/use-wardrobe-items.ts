import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-client';
import type { 
  WardrobeItem, 
  CreateWardrobeItemInput, 
  UpdateWardrobeItemInput 
} from '@/lib/types/database';
import { 
  CreateWardrobeItemFormSchema, 
  UpdateWardrobeItemFormSchema 
} from '@/lib/schemas';

import { useAuth } from './use-auth';

// Cached data fetching functions for server-side deduplication
const getWardrobeItems = cache(async (userId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch wardrobe items: ${error.message}`);
  }

  return data || [];
});

const getWardrobeItem = cache(async (id: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch wardrobe item: ${error.message}`);
  }

  return data;
});

// Fetch all wardrobe items for the current user
export function useWardrobeItems() {
  const { userId, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.wardrobe.items(userId || 'anonymous'),
    enabled: isAuthenticated && !!userId,
    queryFn: () => getWardrobeItems(userId!),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch a single wardrobe item by ID
export function useWardrobeItem(id: string) {
  return useQuery({
    queryKey: queryKeys.wardrobe.item(id),
    queryFn: () => getWardrobeItem(id),
    enabled: !!id,
  });
}

// Create a new wardrobe item
export function useCreateWardrobeItem() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateWardrobeItemInput): Promise<WardrobeItem> => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Validate input with Zod
      const validatedInput = CreateWardrobeItemFormSchema.parse(input);
      const { data, error } = await supabase
        .from('wardrobe_items')
        .insert({
          ...validatedInput,
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
    onMutate: async (newItem) => {
      if (!userId) return;
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.items(userId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<WardrobeItem[]>(
        queryKeys.wardrobe.items(userId)
      );

      // Optimistically update to the new value
      if (previousItems) {
        const optimisticItem: WardrobeItem = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          ...newItem,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData<WardrobeItem[]>(
          queryKeys.wardrobe.items(userId),
          [...previousItems, optimisticItem]
        );
      }

      return { previousItems };
    },
    onError: (err, newItem, context) => {
      // Rollback on error
      if (context?.previousItems && userId) {
        queryClient.setQueryData(
          queryKeys.wardrobe.items(userId),
          context.previousItems
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
    },
  });
}

// Update an existing wardrobe item
export function useUpdateWardrobeItem() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateWardrobeItemInput): Promise<WardrobeItem> => {
      // Validate input with Zod
      const validatedInput = UpdateWardrobeItemFormSchema.parse(input);
      const { id, ...updateData } = validatedInput;
      
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
    onMutate: async (updatedItem) => {
      if (!userId) return;
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.items(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.item(updatedItem.id) });

      // Snapshot the previous values
      const previousItems = queryClient.getQueryData<WardrobeItem[]>(
        queryKeys.wardrobe.items(userId)
      );
      const previousItem = queryClient.getQueryData<WardrobeItem>(
        queryKeys.wardrobe.item(updatedItem.id)
      );

      // Optimistically update the items list
      if (previousItems) {
        const optimisticItems = previousItems.map(item =>
          item.id === updatedItem.id
            ? { ...item, ...updatedItem, updated_at: new Date().toISOString() }
            : item
        );
        queryClient.setQueryData(queryKeys.wardrobe.items(userId), optimisticItems);
      }

      // Optimistically update the single item
      if (previousItem) {
        queryClient.setQueryData(
          queryKeys.wardrobe.item(updatedItem.id),
          { ...previousItem, ...updatedItem, updated_at: new Date().toISOString() }
        );
      }

      return { previousItems, previousItem };
    },
    onError: (err, updatedItem, context) => {
      // Rollback on error
      if (context?.previousItems && userId) {
        queryClient.setQueryData(
          queryKeys.wardrobe.items(userId),
          context.previousItems
        );
      }
      if (context?.previousItem) {
        queryClient.setQueryData(
          queryKeys.wardrobe.item(updatedItem.id),
          context.previousItem
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.item(variables.id) });
    },
  });
}

// Delete a wardrobe item (soft delete by setting active to false)
export function useDeleteWardrobeItem() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Call the delete-item-logic Edge Function to handle outfit dependencies
      const { error } = await supabase.functions.invoke('delete-item-logic', {
        body: { 
          item_id: id,
          action: 'delete',
          force_delete: true // Allow deletion even if it orphans outfits
        }
      });

      if (error) {
        throw new Error(`Failed to delete wardrobe item: ${error.message}`);
      }
    },
    onMutate: async (deletedId) => {
      if (!userId) return;
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wardrobe.items(userId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<WardrobeItem[]>(
        queryKeys.wardrobe.items(userId)
      );

      // Optimistically remove the item
      if (previousItems) {
        const optimisticItems = previousItems.filter(item => item.id !== deletedId);
        queryClient.setQueryData(queryKeys.wardrobe.items(userId), optimisticItems);
      }

      return { previousItems };
    },
    onError: (err, deletedId, context) => {
      // Rollback on error
      if (context?.previousItems && userId) {
        queryClient.setQueryData(
          queryKeys.wardrobe.items(userId),
          context.previousItems
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all });
    },
  });
}
