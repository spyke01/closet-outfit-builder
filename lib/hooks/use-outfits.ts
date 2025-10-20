import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-client';
import type { 
  Outfit, 
  CreateOutfitInput, 
  UpdateOutfitInput,
  WardrobeItem 
} from '@/lib/types/database';
import { 
  CreateOutfitFormSchema, 
  UpdateOutfitFormSchema 
} from '@/lib/schemas';

import { useAuth } from './use-auth';

// Fetch all outfits for the current user
export function useOutfits() {
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.outfits.list(userId || 'anonymous'),
    enabled: isAuthenticated && !!userId,
    queryFn: async (): Promise<Outfit[]> => {
      const { data, error } = await supabase
        .from('outfits')
        .select(`
          *,
          outfit_items(
            wardrobe_items(
              *,
              category:categories(*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch outfits: ${error.message}`);
      }

      // Transform the data to flatten the items structure
      const outfits = data?.map(outfit => ({
        ...outfit,
        items: outfit.outfit_items?.map((oi: any) => oi.wardrobe_items).filter(Boolean) || []
      })) || [];

      return outfits;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch a single outfit by ID
export function useOutfit(id: string) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: queryKeys.outfits.detail(id),
    queryFn: async (): Promise<Outfit> => {
      const { data, error } = await supabase
        .from('outfits')
        .select(`
          *,
          outfit_items(
            wardrobe_items(
              *,
              category:categories(*)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch outfit: ${error.message}`);
      }

      // Transform the data to flatten the items structure
      const outfit = {
        ...data,
        items: data.outfit_items?.map((oi: any) => oi.wardrobe_items).filter(Boolean) || []
      };

      return outfit;
    },
    enabled: !!id,
  });
}

// Fetch outfits that work with a specific anchor item
export function useOutfitsByAnchor(itemId: string) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: queryKeys.outfits.byAnchor(itemId),
    queryFn: async (): Promise<Outfit[]> => {
      // Call the filter-by-anchor Edge Function
      const { data, error } = await supabase.functions.invoke('filter-by-anchor', {
        body: { anchor_item_id: itemId }
      });

      if (error) {
        throw new Error(`Failed to fetch outfits by anchor: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!itemId,
    staleTime: 10 * 60 * 1000, // 10 minutes - anchor-based results are more stable
  });
}

// Check if an outfit combination already exists
export function useCheckOutfitDuplicate(itemIds: string[]) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: queryKeys.outfits.duplicateCheck(itemIds),
    queryFn: async (): Promise<boolean> => {
      if (itemIds.length === 0) return false;

      // Call the check-outfit-duplicate Edge Function
      const { data, error } = await supabase.functions.invoke('check-outfit-duplicate', {
        body: { item_ids: itemIds }
      });

      if (error) {
        throw new Error(`Failed to check outfit duplicate: ${error.message}`);
      }

      return data?.isDuplicate || false;
    },
    enabled: itemIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes - duplicate checks should be relatively fresh
  });
}

// Score an outfit combination
export function useScoreOutfit(itemIds: string[]) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ['outfit-score', itemIds.sort().join(',')],
    queryFn: async (): Promise<{ score: number; breakdown: any }> => {
      if (itemIds.length === 0) return { score: 0, breakdown: {} };

      // Call the score-outfit Edge Function
      const { data, error } = await supabase.functions.invoke('score-outfit', {
        body: { item_ids: itemIds }
      });

      if (error) {
        throw new Error(`Failed to score outfit: ${error.message}`);
      }

      return data || { score: 0, breakdown: {} };
    },
    enabled: itemIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create a new outfit
export function useCreateOutfit() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateOutfitInput): Promise<Outfit> => {
      // Validate input with Zod - separate items from outfit data
      const { items, ...outfitInput } = input;
      const validatedOutfitData = CreateOutfitFormSchema.parse(outfitInput);

      // First check for duplicates
      const { data: duplicateCheck } = await supabase.functions.invoke('check-outfit-duplicate', {
        body: { item_ids: items }
      });

      if (duplicateCheck?.isDuplicate) {
        throw new Error('This outfit combination already exists');
      }

      // Score the outfit
      const { data: scoreData } = await supabase.functions.invoke('score-outfit', {
        body: { item_ids: items }
      });

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create the outfit
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert({
          ...validatedOutfitData,
          user_id: userId,
          score: scoreData?.score || 0,
        })
        .select()
        .single();

      if (outfitError) {
        throw new Error(`Failed to create outfit: ${outfitError.message}`);
      }

      // Create outfit items
      const outfitItems = items.map(itemId => ({
        outfit_id: outfit.id,
        item_id: itemId,
        category_id: '', // This would need to be resolved from the item
      }));

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(outfitItems);

      if (itemsError) {
        // Rollback the outfit creation
        await supabase.from('outfits').delete().eq('id', outfit.id);
        throw new Error(`Failed to create outfit items: ${itemsError.message}`);
      }

      // Fetch the complete outfit with items
      const { data: completeOutfit, error: fetchError } = await supabase
        .from('outfits')
        .select(`
          *,
          outfit_items(
            wardrobe_items(
              *,
              category:categories(*)
            )
          )
        `)
        .eq('id', outfit.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch created outfit: ${fetchError.message}`);
      }

      return {
        ...completeOutfit,
        items: completeOutfit.outfit_items?.map((oi: any) => oi.wardrobe_items).filter(Boolean) || []
      };
    },
    onMutate: async (newOutfit) => {
      if (!userId) return { previousOutfits: null };
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.outfits.list(userId) });

      // Snapshot the previous value
      const previousOutfits = queryClient.getQueryData<Outfit[]>(
        queryKeys.outfits.list(userId)
      );

      // Optimistically update to the new value
      if (previousOutfits && userId) {
        const optimisticOutfit: Outfit = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          ...newOutfit,
          score: 0, // Will be calculated by the server
          weight: newOutfit.weight || 1,
          loved: newOutfit.loved || false,
          source: newOutfit.source || 'curated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [], // Will be populated by the server
        };

        queryClient.setQueryData<Outfit[]>(
          queryKeys.outfits.list(userId),
          [optimisticOutfit, ...previousOutfits]
        );
      }

      return { previousOutfits };
    },
    onError: (err, newOutfit, context) => {
      // Rollback on error
      if (context?.previousOutfits && userId) {
        queryClient.setQueryData(
          queryKeys.outfits.list(userId),
          context.previousOutfits
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all });
    },
  });
}

// Update an existing outfit
export function useUpdateOutfit() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateOutfitInput): Promise<Outfit> => {
      // Validate input with Zod - separate items from outfit data
      const { items, ...outfitInput } = input;
      const validatedInput = UpdateOutfitFormSchema.parse(outfitInput);
      const { id, ...updateData } = validatedInput;

      // If items are being updated, check for duplicates and recalculate score
      if (items) {
        const { data: duplicateCheck } = await supabase.functions.invoke('check-outfit-duplicate', {
          body: { item_ids: items, exclude_outfit_id: id }
        });

        if (duplicateCheck?.isDuplicate) {
          throw new Error('This outfit combination already exists');
        }

        const { data: scoreData } = await supabase.functions.invoke('score-outfit', {
          body: { item_ids: items }
        });

        updateData.score = scoreData?.score || 0;
      }

      // Update the outfit
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (outfitError) {
        throw new Error(`Failed to update outfit: ${outfitError.message}`);
      }

      // If items are being updated, replace outfit items
      if (items) {
        // Delete existing outfit items
        await supabase.from('outfit_items').delete().eq('outfit_id', id);

        // Create new outfit items
        const outfitItems = items.map(itemId => ({
          outfit_id: id,
          item_id: itemId,
          category_id: '', // This would need to be resolved from the item
        }));

        const { error: itemsError } = await supabase
          .from('outfit_items')
          .insert(outfitItems);

        if (itemsError) {
          throw new Error(`Failed to update outfit items: ${itemsError.message}`);
        }
      }

      // Fetch the complete updated outfit
      const { data: completeOutfit, error: fetchError } = await supabase
        .from('outfits')
        .select(`
          *,
          outfit_items(
            wardrobe_items(
              *,
              category:categories(*)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch updated outfit: ${fetchError.message}`);
      }

      return {
        ...completeOutfit,
        items: completeOutfit.outfit_items?.map((oi: any) => oi.wardrobe_items).filter(Boolean) || []
      };
    },
    onMutate: async (updatedOutfit) => {
      if (!userId) return { previousOutfits: null, previousOutfit: null };
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.outfits.list(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.outfits.detail(updatedOutfit.id) });

      // Snapshot the previous values
      const previousOutfits = queryClient.getQueryData<Outfit[]>(
        queryKeys.outfits.list(userId)
      );
      const previousOutfit = queryClient.getQueryData<Outfit>(
        queryKeys.outfits.detail(updatedOutfit.id)
      );

      // Optimistically update the outfits list
      if (previousOutfits && userId) {
        const optimisticOutfits = previousOutfits.map(outfit =>
          outfit.id === updatedOutfit.id
            ? { ...outfit, ...updatedOutfit, updated_at: new Date().toISOString() }
            : outfit
        );
        queryClient.setQueryData(queryKeys.outfits.list(userId), optimisticOutfits);
      }

      // Optimistically update the single outfit
      if (previousOutfit) {
        queryClient.setQueryData(
          queryKeys.outfits.detail(updatedOutfit.id),
          { ...previousOutfit, ...updatedOutfit, updated_at: new Date().toISOString() }
        );
      }

      return { previousOutfits, previousOutfit };
    },
    onError: (err, updatedOutfit, context) => {
      // Rollback on error
      if (context?.previousOutfits && userId) {
        queryClient.setQueryData(
          queryKeys.outfits.list(userId),
          context.previousOutfits
        );
      }
      if (context?.previousOutfit) {
        queryClient.setQueryData(
          queryKeys.outfits.detail(updatedOutfit.id),
          context.previousOutfit
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.detail(variables.id) });
    },
  });
}

// Delete an outfit
export function useDeleteOutfit() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete outfit: ${error.message}`);
      }
    },
    onMutate: async (deletedId) => {
      if (!userId) return { previousOutfits: null };
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.outfits.list(userId) });

      // Snapshot the previous value
      const previousOutfits = queryClient.getQueryData<Outfit[]>(
        queryKeys.outfits.list(userId)
      );

      // Optimistically remove the outfit
      if (previousOutfits && userId) {
        const optimisticOutfits = previousOutfits.filter(outfit => outfit.id !== deletedId);
        queryClient.setQueryData(queryKeys.outfits.list(userId), optimisticOutfits);
      }

      return { previousOutfits };
    },
    onError: (err, deletedId, context) => {
      // Rollback on error
      if (context?.previousOutfits && userId) {
        queryClient.setQueryData(
          queryKeys.outfits.list(userId),
          context.previousOutfits
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all });
    },
  });
}